"""End-to-end tests of the library against the in-process mock ADFS (no network)."""

from __future__ import annotations

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI, Security
from fastapi.testclient import TestClient

from adfs_auth import AdfsAuth, AuthSettings, JwtValidator, Principal
from adfs_auth.mock_adfs import DEFAULT_AUDIENCE, MockAdfs

API_KEY = "poc-demo-key"


@pytest.fixture(scope="module")
def mock() -> MockAdfs:
    return MockAdfs(key_file=None)


@pytest.fixture(scope="module")
def client(mock: MockAdfs) -> TestClient:
    settings = AuthSettings(
        audience=DEFAULT_AUDIENCE,
        issuers=[mock.access_token_issuer],
        group_permissions={
            "CORP\\Orders-Readers": ["orders:read"],
            "corp\\orders-writers": ["orders:read", "orders:write"],  # case-insensitive match
        },
        subject_permissions={"batch-job": ["orders:read"]},
        api_keys={AuthSettings.hash_api_key(API_KEY): {"name": "script", "permissions": ["orders:read"]}},
    )
    auth = AdfsAuth(settings, JwtValidator(settings, jwks_provider=mock.jwks))
    app = FastAPI()

    @app.get("/health", dependencies=[Depends(auth.public)])
    def health():
        return {"ok": True}

    @app.get("/me")
    def me(p: Principal = Security(auth.authenticate)):
        return p.to_dict()

    @app.get("/orders")
    def read(p: Principal = Security(auth.require("orders:read"))):
        return []

    @app.post("/orders")
    def write(p: Principal = Security(auth.require("orders:write"))):
        return {"by": p.subject}

    auth.verify_routes(app)
    return TestClient(app)


def bearer(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def test_public_route_needs_nothing(client):
    assert client.get("/health").status_code == 200


def test_no_credentials_401(client):
    r = client.get("/orders")
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"


def test_reader_can_read_not_write(client, mock):
    t = mock.mint(user="alice")  # single group -> ADFS sends a string
    assert client.get("/orders", headers=bearer(t)).status_code == 200
    r = client.post("/orders", headers=bearer(t))
    assert r.status_code == 403


def test_writer_can_write(client, mock):
    t = mock.mint(user="bob")  # two groups -> list
    r = client.post("/orders", headers=bearer(t))
    assert r.status_code == 200
    assert r.json() == {"by": "bob@corp.local"}


def test_user_without_groups_forbidden(client, mock):
    assert client.get("/orders", headers=bearer(mock.mint(user="carol"))).status_code == 403


def test_me_shows_principal(client, mock):
    body = client.get("/me", headers=bearer(mock.mint(user="bob"))).json()
    assert body["kind"] == "jwt"
    assert "CORP\\Orders-Writers" in body["memberships"]
    assert body["permissions"] == ["orders:read", "orders:write"]


def test_service_token_via_subject_permissions(client, mock):
    t = mock.mint(app="batch-job")
    assert client.get("/orders", headers=bearer(t)).status_code == 200
    assert client.post("/orders", headers=bearer(t)).status_code == 403


@pytest.mark.parametrize(
    "kwargs, reason",
    [
        ({"expires_in": -300}, "expired"),
        ({"audience": "urn:someone-else"}, "audience"),
        ({"issuer": "http://evil/adfs/services/trust"}, "issuer"),
        ({"not_before_offset": 600}, "not yet valid"),
    ],
)
def test_bad_tokens_401(client, mock, kwargs, reason):
    r = client.get("/orders", headers=bearer(mock.mint(user="bob", **kwargs)))
    assert r.status_code == 401
    assert reason in r.json()["detail"]


def test_forged_signature_401(client, mock):
    attacker = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    t = mock.mint(user="bob", signing_key=attacker)  # same kid, wrong key
    r = client.get("/orders", headers=bearer(t))
    assert r.status_code == 401
    assert "signature" in r.json()["detail"]


def test_garbage_token_401(client):
    assert client.get("/orders", headers=bearer("not.a.jwt")).status_code == 401


def test_alg_none_rejected(client, mock):
    import jwt

    t = jwt.encode({"upn": "x", "aud": DEFAULT_AUDIENCE, "iss": mock.access_token_issuer, "exp": 9999999999},
                   None, algorithm="none")
    assert client.get("/orders", headers=bearer(t)).status_code == 401


def test_api_key(client):
    assert client.get("/orders", headers={"X-API-Key": API_KEY}).status_code == 200
    assert client.post("/orders", headers={"X-API-Key": API_KEY}).status_code == 403
    assert client.get("/orders", headers={"X-API-Key": "wrong"}).status_code == 401


def test_invalid_bearer_does_not_fall_back_to_api_key(client):
    r = client.get("/orders", headers={**bearer("bad"), "X-API-Key": API_KEY})
    assert r.status_code == 401


def test_verify_routes_catches_unprotected(mock):
    settings = AuthSettings(audience="a", issuers=["i"])
    auth = AdfsAuth(settings, JwtValidator(settings, jwks_provider=mock.jwks))
    app = FastAPI()

    @app.get("/oops")
    def oops():
        return {}

    with pytest.raises(RuntimeError, match="/oops"):
        auth.verify_routes(app)


def test_key_rotation_refetches_jwks(mock):
    """ADFS rolls its signing cert: a token with a new kid triggers one JWKS refetch."""
    old, new = MockAdfs(key_file=None), MockAdfs(key_file=None)
    current = {"jwks": old.jwks()}
    settings = AuthSettings(audience=DEFAULT_AUDIENCE, issuers=[new.access_token_issuer])
    v = JwtValidator(settings, jwks_provider=lambda: current["jwks"])
    assert v.authenticate(old.mint(user="bob")).subject == "bob@corp.local"
    current["jwks"] = new.jwks()
    v._fetched_at -= 120  # past the 60s refetch throttle
    assert v.authenticate(new.mint(user="bob")).subject == "bob@corp.local"
