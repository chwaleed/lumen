import pytest
from fastapi import status
from fastapi.testclient import TestClient

from tests.conftest import register


@pytest.fixture()
def project_id(client: TestClient, auth_headers: dict[str, str]) -> int:
    response = client.post(
        "/projects", json={"name": "Thesis", "template_id": "academic"}, headers=auth_headers
    )
    return response.json()["data"]["id"]


def create_entry(
    client: TestClient,
    headers: dict[str, str],
    project_id: int,
    name: str,
    entry_type: str = "file",
    parent_id: int | None = None,
):
    return client.post(
        f"/projects/{project_id}/files",
        json={"name": name, "type": entry_type, "parent_id": parent_id},
        headers=headers,
    )


class TestCreateEndpoint:
    def test_creates_an_entry(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        response = create_entry(client, auth_headers, project_id, "chapter.tex")

        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["success"] is True
        assert body["data"]["name"] == "chapter.tex"

    def test_requires_authentication(self, client: TestClient, project_id: int) -> None:
        response = client.post(
            f"/projects/{project_id}/files", json={"name": "x.tex", "type": "file"}
        )

        assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}

    def test_rejects_an_unknown_entry_type(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        response = create_entry(client, auth_headers, project_id, "x.tex", "symlink")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_rejects_an_empty_name(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        response = create_entry(client, auth_headers, project_id, "")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_hides_another_user_s_project(self, client: TestClient, project_id: int) -> None:
        intruder = register(client, email="intruder@example.com")

        response = create_entry(client, intruder, project_id, "mine-now.tex")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateEndpoint:
    def test_renames_an_entry(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        entry_id = create_entry(client, auth_headers, project_id, "old.tex").json()["data"]["id"]

        response = client.patch(
            f"/projects/{project_id}/files/{entry_id}", json={"name": "new.tex"}, headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["name"] == "new.tex"

    def test_moves_an_entry_into_a_folder(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        folder_id = create_entry(client, auth_headers, project_id, "chapters", "folder").json()["data"]["id"]
        entry_id = create_entry(client, auth_headers, project_id, "intro.tex").json()["data"]["id"]

        response = client.patch(
            f"/projects/{project_id}/files/{entry_id}",
            json={"parent_id": folder_id},
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["parent_id"] == folder_id

    def test_rejects_moving_a_folder_into_its_own_child(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        parent_id = create_entry(client, auth_headers, project_id, "parent", "folder").json()["data"]["id"]
        child_id = create_entry(
            client, auth_headers, project_id, "child", "folder", parent_id
        ).json()["data"]["id"]

        response = client.patch(
            f"/projects/{project_id}/files/{parent_id}",
            json={"parent_id": child_id},
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["success"] is False

    def test_404s_for_an_unknown_entry(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        response = client.patch(
            f"/projects/{project_id}/files/999999", json={"name": "x.tex"}, headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDeleteEndpoint:
    def test_deletes_an_entry(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        entry_id = create_entry(client, auth_headers, project_id, "scratch.tex").json()["data"]["id"]

        response = client.delete(f"/projects/{project_id}/files/{entry_id}", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        remaining = client.get(f"/projects/{project_id}", headers=auth_headers).json()["data"]["files"]
        assert all(entry["id"] != entry_id for entry in remaining)

    def test_deletes_a_folder_subtree(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        folder_id = create_entry(client, auth_headers, project_id, "chapters", "folder").json()["data"]["id"]
        child_id = create_entry(
            client, auth_headers, project_id, "intro.tex", parent_id=folder_id
        ).json()["data"]["id"]

        client.delete(f"/projects/{project_id}/files/{folder_id}", headers=auth_headers)

        remaining_ids = {
            entry["id"]
            for entry in client.get(f"/projects/{project_id}", headers=auth_headers).json()["data"]["files"]
        }
        assert folder_id not in remaining_ids
        assert child_id not in remaining_ids

    def test_hides_another_user_s_entry(
        self, client: TestClient, auth_headers: dict[str, str], project_id: int
    ) -> None:
        entry_id = create_entry(client, auth_headers, project_id, "private.tex").json()["data"]["id"]
        intruder = register(client, email="intruder@example.com")

        response = client.delete(f"/projects/{project_id}/files/{entry_id}", headers=intruder)

        assert response.status_code == status.HTTP_404_NOT_FOUND
