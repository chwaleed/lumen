from datetime import timedelta

import jwt
import pytest

from src.auth.utils import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.core.config import Settings
from src.core.security import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE, utc_now


class TestPasswordHashing:
    def test_hash_is_not_the_password(self) -> None:
        hashed = hash_password("password123")

        assert hashed != "password123"
        assert verify_password("password123", hashed)

    def test_rejects_the_wrong_password(self) -> None:
        assert not verify_password("wrong-password", hash_password("password123"))

    def test_salts_so_equal_passwords_hash_differently(self) -> None:
        first = hash_password("password123")
        second = hash_password("password123")

        assert first != second
        assert verify_password("password123", first)
        assert verify_password("password123", second)


class TestRefreshTokenHashing:
    def test_is_deterministic_so_lookups_work(self) -> None:
        assert hash_refresh_token("token-value") == hash_refresh_token("token-value")

    def test_differs_per_token_and_hides_the_original(self) -> None:
        hashed = hash_refresh_token("token-value")

        assert hashed != hash_refresh_token("other-value")
        assert "token-value" not in hashed


class TestAccessToken:
    def test_carries_subject_type_and_lifetime(self, settings: Settings) -> None:
        token, expires_in = create_access_token(42, settings)
        payload = decode_token(token, settings)

        assert payload["sub"] == "42"
        assert payload["type"] == ACCESS_TOKEN_TYPE
        assert expires_in == settings.access_token_expire_minutes * 60

    def test_rejects_a_token_signed_with_another_secret(self, settings: Settings) -> None:
        token, _ = create_access_token(1, settings)
        other_settings = settings.model_copy(update={"jwt_secret_key": "a-completely-different-secret"})

        with pytest.raises(TokenError) as error:
            decode_token(token, other_settings)

        assert not error.value.expired

    def test_reports_expiry_separately_from_invalidity(self, settings: Settings) -> None:
        # The service distinguishes these to decide whether a refresh is worth attempting.
        expired = jwt.encode(
            {"sub": "1", "type": ACCESS_TOKEN_TYPE, "exp": utc_now() - timedelta(seconds=1)},
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

        with pytest.raises(TokenError) as error:
            decode_token(expired, settings)

        assert error.value.expired

    def test_rejects_a_tampered_token(self, settings: Settings) -> None:
        token, _ = create_access_token(1, settings)

        with pytest.raises(TokenError):
            decode_token(f"{token}tampered", settings)

    def test_rejects_a_token_that_is_not_a_jwt(self, settings: Settings) -> None:
        with pytest.raises(TokenError):
            decode_token("not-a-jwt-at-all", settings)


class TestRefreshToken:
    def test_carries_a_unique_jti_for_revocation(self, settings: Settings) -> None:
        first_token, first_jti, expires_at = create_refresh_token(7, settings)
        _, second_jti, _ = create_refresh_token(7, settings)

        payload = decode_token(first_token, settings)

        assert payload["sub"] == "7"
        assert payload["type"] == REFRESH_TOKEN_TYPE
        assert payload["jti"] == first_jti
        assert first_jti != second_jti
        assert expires_at > utc_now()

    def test_outlives_the_access_token(self, settings: Settings) -> None:
        _, access_expires_in = create_access_token(7, settings)
        _, _, refresh_expires_at = create_refresh_token(7, settings)

        assert (refresh_expires_at - utc_now()).total_seconds() > access_expires_in
