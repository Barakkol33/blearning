"""A stand-in for ADFS (2016+) good enough to develop and test against. Stdlib HTTP server + pyjwt.

It mimics what matters to a resource server:
  * GET  /adfs/.well-known/openid-configuration   (incl. ADFS's "access_token_issuer")
  * GET  /adfs/discovery/keys                      (JWKS with kid == x5t and an x5c cert, like ADFS)
  * POST /adfs/oauth2/token                        (client_credentials and password grants)
and mints access tokens shaped like ADFS ones: iss http://<host>/adfs/services/trust, aud = resource,
upn / unique_name (DOMAIN\\user), group as a string when single and a list when several, scp, appid...

CLI:
  python -m adfs_auth.mock_adfs serve [--port 9000]
  python -m adfs_auth.mock_adfs mint --user bob            # user token
  python -m adfs_auth.mock_adfs mint --app batch-job       # service (client credentials) token
  python -m adfs_auth.mock_adfs hash-key <raw api key>
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

DOMAIN = "CORP"
UPN_SUFFIX = "corp.local"
DEFAULT_AUDIENCE = "urn:poc:orders-api"

# demo directory: user -> AD groups (as "Token-Groups - Qualified by Domain Name" would emit them)
USERS: dict[str, list[str]] = {
    "alice": [f"{DOMAIN}\\Orders-Readers"],
    "bob": [f"{DOMAIN}\\Orders-Readers", f"{DOMAIN}\\Orders-Writers"],
    "carol": [f"{DOMAIN}\\Domain Users"],
}
CLIENTS: dict[str, str] = {"poc-client": "poc-secret", "batch-job": "batch-secret"}  # id -> secret
PASSWORD = "Passw0rd!"  # every demo user


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class MockAdfs:
    def __init__(self, base_url: str = "http://localhost:9000", key_file: str | None = ".mock_adfs_key.pem"):
        self.base_url = base_url.rstrip("/")
        host = urlparse(self.base_url).netloc
        self.issuer = f"{self.base_url}/adfs"  # id_token issuer
        self.access_token_issuer = f"http://{host}/adfs/services/trust"  # ADFS quirk: http + /services/trust
        self._key = self._load_or_create_key(key_file)
        self._cert = self._self_signed_cert(self._key)
        der = self._cert.public_bytes(serialization.Encoding.DER)
        self.kid = _b64u(hashlib.sha1(der).digest())  # noqa: S324 - ADFS uses SHA-1 thumbprints for x5t
        self._x5c = base64.b64encode(der).decode()

    # -- keys -------------------------------------------------------------------
    @staticmethod
    def _load_or_create_key(key_file: str | None) -> rsa.RSAPrivateKey:
        if key_file and Path(key_file).is_file():
            return serialization.load_pem_private_key(Path(key_file).read_bytes(), password=None)  # type: ignore[return-value]
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        if key_file:  # persist so `serve` and `mint` in different processes share the key
            Path(key_file).write_bytes(
                key.private_bytes(
                    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
                )
            )
        return key

    @staticmethod
    def _self_signed_cert(key: rsa.RSAPrivateKey) -> x509.Certificate:
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "ADFS Signing - mock")])
        now = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
        return (
            x509.CertificateBuilder()
            .subject_name(name)
            .issuer_name(name)
            .public_key(key.public_key())
            .serial_number(1)
            .not_valid_before(now)
            .not_valid_after(now + dt.timedelta(days=3650))
            .sign(key, hashes.SHA256())
        )

    def jwks(self) -> dict[str, Any]:
        jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(self._key.public_key()))
        jwk.update({"use": "sig", "alg": "RS256", "kid": self.kid, "x5t": self.kid, "x5c": [self._x5c]})
        return {"keys": [jwk]}

    def discovery(self) -> dict[str, Any]:
        b = self.base_url
        return {
            "issuer": self.issuer,
            "access_token_issuer": self.access_token_issuer,
            "authorization_endpoint": f"{b}/adfs/oauth2/authorize/",
            "token_endpoint": f"{b}/adfs/oauth2/token/",
            "jwks_uri": f"{b}/adfs/discovery/keys",
            "grant_types_supported": ["authorization_code", "client_credentials", "password", "refresh_token"],
            "id_token_signing_alg_values_supported": ["RS256"],
            "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
        }

    # -- tokens -----------------------------------------------------------------
    def mint(
        self,
        *,
        user: str | None = None,
        groups: list[str] | None = None,
        app: str = "poc-client",
        audience: str = DEFAULT_AUDIENCE,
        expires_in: int = 3600,
        issuer: str | None = None,
        not_before_offset: int = 0,
        signing_key: rsa.RSAPrivateKey | None = None,
    ) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {
            "aud": audience,
            "iss": issuer or self.access_token_issuer,
            "iat": now,
            "nbf": now + not_before_offset,
            "exp": now + expires_in,
            "apptype": "Confidential",
            "appid": app,
            "authmethod": "http://schemas.microsoft.com/ws/2008/06/identity/authenticationmethod/password",
            "auth_time": dt.datetime.fromtimestamp(now, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "ver": "1.0",
            "scp": "openid",
        }
        if user is not None:  # user token (authorization code / password grant)
            claims["upn"] = f"{user}@{UPN_SUFFIX}"
            claims["unique_name"] = f"{DOMAIN}\\{user}"
            claims["sid"] = f"S-1-5-21-0000000000-0000000000-0000000000-{1000 + sum(map(ord, user))}"
            g = groups if groups is not None else USERS.get(user, [])
            if g:
                claims["group"] = g[0] if len(g) == 1 else g  # ADFS: single value -> plain string
        else:  # client credentials: no user, identity is the app
            claims["client_id"] = app
        claims["jti"] = str(uuid.uuid4())
        headers = {"typ": "JWT", "kid": self.kid, "x5t": self.kid}
        return jwt.encode(claims, signing_key or self._key, algorithm="RS256", headers=headers)

    def token_response(self, form: dict[str, str]) -> tuple[int, dict[str, Any]]:
        grant = form.get("grant_type")
        client_id, secret = form.get("client_id", ""), form.get("client_secret")
        audience = form.get("resource") or DEFAULT_AUDIENCE
        if client_id not in CLIENTS or (secret is not None and CLIENTS[client_id] != secret):
            return 401, {"error": "invalid_client", "error_description": "MSIS9607: unknown client or bad secret"}
        if grant == "client_credentials":
            if secret is None:
                return 401, {"error": "invalid_client", "error_description": "client_secret required"}
            token = self.mint(app=client_id, audience=audience)
        elif grant == "password":
            user = form.get("username", "").split("@")[0].split("\\")[-1]
            if user not in USERS or form.get("password") != PASSWORD:
                return 400, {"error": "invalid_grant", "error_description": "MSIS9659: invalid username or password"}
            token = self.mint(user=user, app=client_id, audience=audience)
        else:
            return 400, {"error": "unsupported_grant_type"}
        return 200, {"access_token": token, "token_type": "bearer", "expires_in": 3600, "resource": audience}


# -- HTTP server ----------------------------------------------------------------
def make_handler(mock: MockAdfs) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, body: dict[str, Any]) -> None:
            raw = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self) -> None:  # noqa: N802
            path = urlparse(self.path).path.rstrip("/")
            if path == "/adfs/.well-known/openid-configuration":
                self._send(200, mock.discovery())
            elif path == "/adfs/discovery/keys":
                self._send(200, mock.jwks())
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            if urlparse(self.path).path.rstrip("/") != "/adfs/oauth2/token":
                return self._send(404, {"error": "not found"})
            length = int(self.headers.get("Content-Length", 0))
            form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode()).items()}
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Basic "):  # client_secret_basic
                cid, _, sec = base64.b64decode(auth[6:]).decode().partition(":")
                form.setdefault("client_id", cid)
                form.setdefault("client_secret", sec)
            self._send(*mock.token_response(form))

        def log_message(self, fmt: str, *args: Any) -> None:
            sys.stderr.write("mock-adfs: " + fmt % args + "\n")

    return Handler


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="adfs-auth-mock", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--base-url", default="http://localhost:9000", help="public URL of the mock (affects issuer)")
    p.add_argument("--key-file", default=".mock_adfs_key.pem")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=9000)
    m = sub.add_parser("mint")
    who = m.add_mutually_exclusive_group(required=True)
    who.add_argument("--user", help=f"demo users: {', '.join(USERS)}")
    who.add_argument("--app", help="client-credentials token for this client id")
    m.add_argument("--groups", nargs="*", help="override the user's groups")
    m.add_argument("--audience", default=DEFAULT_AUDIENCE)
    m.add_argument("--expires-in", type=int, default=3600)
    h = sub.add_parser("hash-key")
    h.add_argument("key")
    a = p.parse_args(argv)

    if a.cmd == "hash-key":
        print(hashlib.sha256(a.key.encode()).hexdigest())
        return 0
    mock = MockAdfs(a.base_url, a.key_file)
    if a.cmd == "mint":
        print(
            mock.mint(user=a.user, groups=a.groups, audience=a.audience, expires_in=a.expires_in)
            if a.user
            else mock.mint(app=a.app, audience=a.audience, expires_in=a.expires_in)
        )
        return 0
    srv = ThreadingHTTPServer((a.host, a.port), make_handler(mock))
    print(f"mock ADFS on {a.base_url}  (discovery: {a.base_url}/adfs/.well-known/openid-configuration)", file=sys.stderr)
    print(f"users {', '.join(USERS)} / password {PASSWORD!r}; clients {CLIENTS}", file=sys.stderr)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
