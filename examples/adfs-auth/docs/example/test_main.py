"""How to test a service that uses adfs_auth: no ADFS, no network, no running mock server.

The in-process MockAdfs mints tokens and hands its keys straight to the validator.
Run from docs/example:  pytest
"""

import os

os.environ.update(  # must be set before main is imported (it builds AdfsAuth at import time)
    ADFS_AUTH_AUDIENCE="urn:example:inventory-api",
    ADFS_AUTH_ISSUERS="http://localhost:9000/adfs/services/trust",
    ADFS_AUTH_JWKS_URL="http://unused",  # replaced below
    ADFS_AUTH_POLICY_FILE="policy.json",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from adfs_auth import JwtValidator  # noqa: E402
from adfs_auth.mock_adfs import MockAdfs  # noqa: E402

AUD = "urn:example:inventory-api"
mock = MockAdfs(key_file=None)
main.auth.validator = JwtValidator(main.auth.settings, jwks_provider=mock.jwks)  # trust the mock's keys
client = TestClient(main.app)


def as_user(*groups: str) -> dict:
    return {"Authorization": "Bearer " + mock.mint(user="dana", groups=list(groups), audience=AUD)}


@pytest.mark.parametrize(
    "groups, read, write, delete",
    [
        (["CORP\\Inventory-Viewers"], 200, 403, 403),
        (["CORP\\Inventory-Clerks"], 200, 200, 403),
        (["CORP\\Inventory-Admins"], 200, 200, 200),
        (["CORP\\Domain Users"], 403, 403, 403),
    ],
)
def test_permissions_by_group(groups, read, write, delete):
    h = as_user(*groups)
    assert client.get("/stock", headers=h).status_code == read
    assert client.post("/stock/mouse/adjust?delta=1", headers=h).status_code == write
    assert client.delete("/stock/nothing", headers=h).status_code == delete


def test_service_token():
    h = {"Authorization": "Bearer " + mock.mint(app="nightly-sync", audience=AUD)}
    assert client.post("/stock/keyboard/adjust?delta=-1", headers=h).json()["by"] == "nightly-sync"


def test_no_credentials():
    assert client.get("/stock").status_code == 401
    assert client.get("/health").status_code == 200
