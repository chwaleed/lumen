import unittest

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from src.auth.models import RefreshToken, User
from src.auth.utils import create_access_token
from src.core.config import get_settings
from src.db.session import get_session
from src.main import create_app


class AuthFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)

        self.app = create_app(init_db_on_startup=False)

        def session_override():
            with Session(self.engine) as session:
                yield session

        self.app.dependency_overrides[get_session] = session_override
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(self.engine)
        self.engine.dispose()

    def signup(self, email: str = "user@example.com", password: str = "password123"):
        return self.client.post(
            "/auth/signup",
            json={"email": email, "password": password},
        )

    def login(self, email: str = "user@example.com", password: str = "password123"):
        return self.client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )

    def test_signup_hashes_password(self) -> None:
        response = self.signup()

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["email"], "user@example.com")

        with Session(self.engine) as session:
            user = session.get(User, body["id"])
            self.assertIsNotNone(user)
            self.assertNotEqual(user.password_hash, "password123")
            self.assertTrue(user.password_hash.startswith("$2"))

    def test_signup_rejects_duplicate_email(self) -> None:
        self.signup()
        response = self.signup()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "A user with this email already exists.",
        )

    def test_login_returns_token_pair(self) -> None:
        self.signup()
        response = self.login()

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("access_token", body)
        self.assertIn("refresh_token", body)
        self.assertEqual(body["token_type"], "bearer")
        self.assertGreater(body["expires_in"], 0)

    def test_login_rejects_invalid_credentials(self) -> None:
        self.signup()
        response = self.login(password="wrongpass123")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid email or password.")

    def test_me_requires_valid_access_token(self) -> None:
        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 401)

        self.signup()
        login_response = self.login()
        refresh_token = login_response.json()["refresh_token"]
        wrong_token_response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        self.assertEqual(wrong_token_response.status_code, 403)

    def test_me_returns_current_user(self) -> None:
        self.signup()
        login_response = self.login()
        access_token = login_response.json()["access_token"]

        response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "user@example.com")

    def test_refresh_rotates_token(self) -> None:
        self.signup()
        login_response = self.login()
        refresh_token = login_response.json()["refresh_token"]

        response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        self.assertEqual(response.status_code, 200)
        new_refresh_token = response.json()["refresh_token"]
        self.assertNotEqual(new_refresh_token, refresh_token)

        old_token_response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(old_token_response.status_code, 401)

    def test_refresh_rejects_access_token(self) -> None:
        self.signup()
        login_response = self.login()
        access_token = login_response.json()["access_token"]

        response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": access_token},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Refresh token required for this endpoint.",
        )

    def test_expired_access_token_is_rejected(self) -> None:
        self.signup()

        with Session(self.engine) as session:
            user = session.exec(select(User)).first()

        expired_token, _ = create_access_token(
            user.id,
            settings=get_settings().model_copy(
                update={"access_token_expire_minutes": -1},
            ),
        )

        response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Token has expired.")

    def test_logout_revokes_refresh_token(self) -> None:
        self.signup()
        login_response = self.login()
        tokens = login_response.json()

        logout_response = self.client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(logout_response.status_code, 200)

        refresh_response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(refresh_response.status_code, 401)

        with Session(self.engine) as session:
            active_tokens = session.exec(
                select(RefreshToken).where(RefreshToken.revoked_at.is_(None)),
            ).all()
            self.assertEqual(len(active_tokens), 0)


if __name__ == "__main__":
    unittest.main()
