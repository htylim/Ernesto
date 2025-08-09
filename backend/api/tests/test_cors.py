"""Integration tests for CORS behavior across environments.

These tests verify actual response headers for preflight (OPTIONS) and
simple requests under development, testing, and production-like configs.
"""

from __future__ import annotations

from typing import Iterable
from unittest.mock import patch

from app import create_app


def _assert_all_present(headers: dict[str, str], keys: Iterable[str]) -> None:
    for key in keys:
        assert key in headers


class TestCorsDevelopment:
    """CORS integration tests for development environment."""

    def test_dev_preflight_allows_localhost_origin(self) -> None:
        """Preflight in dev should allow localhost origin and echo headers."""
        app = create_app(
            {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "DEBUG": True,
                "CORS_ORIGINS": [r"http://localhost:.*", r"http://127.0.0.1:.*"],
                "CORS_HEADERS": ["Content-Type", "X-API-Key"],
            }
        )
        with app.test_client() as client:
            origin = "http://localhost:3000"
            resp = client.options(
                "/",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Content-Type, X-API-Key",
                },
            )
            assert resp.status_code in (200, 204, 404)
            # CORS should echo allowed origin
            assert resp.headers.get("Access-Control-Allow-Origin") == origin
            # Methods/Headers presence
            _assert_all_present(
                resp.headers,
                [
                    "Access-Control-Allow-Origin",
                    "Vary",
                    "Access-Control-Allow-Methods",
                    "Access-Control-Allow-Headers",
                ],
            )

    def test_dev_simple_get_allows_127_origin(self) -> None:
        """Simple GET in dev should allow 127.0.0.1 origin."""
        app = create_app(
            {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "DEBUG": True,
                "CORS_ORIGINS": [r"http://localhost:.*", r"http://127.0.0.1:.*"],
            }
        )
        with app.test_client() as client:
            origin = "http://127.0.0.1:8080"
            resp = client.get("/", headers={"Origin": origin})
            assert resp.status_code in (200, 404)
            assert resp.headers.get("Access-Control-Allow-Origin") == origin

    def test_dev_disallows_non_localhost_origin(self) -> None:
        """Dev should not allow non-localhost origins."""
        app = create_app(
            {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "DEBUG": True,
                "CORS_ORIGINS": [r"http://localhost:.*", r"http://127.0.0.1:.*"],
            }
        )
        with app.test_client() as client:
            origin = "https://example.com"
            resp = client.get("/", headers={"Origin": origin})
            assert resp.status_code in (200, 404)
            assert "Access-Control-Allow-Origin" not in resp.headers


class TestCorsTesting:
    """CORS integration tests for testing environment."""

    def test_test_env_preflight_basic(self) -> None:
        """Preflight in testing should function and echo configured origin."""
        app = create_app(
            {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "TESTING": True,
                # explicitly set origins to verify behavior
                "CORS_ORIGINS": ["http://localhost:3000"],
            }
        )
        with app.test_client() as client:
            origin = "http://localhost:3000"
            resp = client.options(
                "/",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                },
            )
            assert resp.status_code in (200, 204, 404)
            assert resp.headers.get("Access-Control-Allow-Origin") == origin


class TestCorsProduction:
    """CORS integration tests for production-like environment."""

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop, pppppppppppppppppppppppppppppppp",
            "FLASK_ENV": "prod",
        },
        clear=True,
    )
    def test_prod_allows_configured_extension_origin_preflight(self) -> None:
        """Prod preflight should allow configured chrome-extension origin."""
        app = create_app()
        with app.test_client() as client:
            origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
            resp = client.options(
                "/",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "GET",
                },
            )
            assert resp.status_code in (200, 204, 404)
            assert resp.headers.get("Access-Control-Allow-Origin") == origin
            # No credentials header expected
            assert "Access-Control-Allow-Credentials" not in resp.headers

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop",
            "FLASK_ENV": "prod",
        },
        clear=True,
    )
    def test_prod_allows_configured_extension_origin_get(self) -> None:
        """Prod GET should allow configured chrome-extension origin."""
        app = create_app()
        with app.test_client() as client:
            origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
            resp = client.get("/", headers={"Origin": origin})
            assert resp.status_code in (200, 404)
            assert resp.headers.get("Access-Control-Allow-Origin") == origin

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop",
            "FLASK_ENV": "prod",
        },
        clear=True,
    )
    def test_prod_rejects_unconfigured_extension_origin(self) -> None:
        """Prod should reject unconfigured chrome-extension origin."""
        app = create_app()
        with app.test_client() as client:
            origin = "chrome-extension://pppppppppppppppppppppppppppppppp"
            resp = client.get("/", headers={"Origin": origin})
            assert resp.status_code in (200, 404)
            assert "Access-Control-Allow-Origin" not in resp.headers

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop",
            "FLASK_ENV": "prod",
        },
        clear=True,
    )
    def test_prod_rejects_https_origin(self) -> None:
        """Prod should reject https origins that are not chrome-extension scheme."""
        app = create_app()
        with app.test_client() as client:
            origin = "https://example.com"
            resp = client.get("/", headers={"Origin": origin})
            assert resp.status_code in (200, 404)
            assert "Access-Control-Allow-Origin" not in resp.headers

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop, pppppppppppppppppppppppppppppppp",
            "FLASK_ENV": "prod",
        },
        clear=True,
    )
    def test_prod_multiple_extension_ids_behavior(self) -> None:
        """Prod should allow all configured extension IDs and echo origin."""
        app = create_app()
        with app.test_client() as client:
            for origin in (
                "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
                "chrome-extension://pppppppppppppppppppppppppppppppp",
            ):
                resp = client.get("/", headers={"Origin": origin})
                assert resp.status_code in (200, 404)
                assert resp.headers.get("Access-Control-Allow-Origin") == origin
