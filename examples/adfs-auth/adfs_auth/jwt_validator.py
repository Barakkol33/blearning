"""Validate ADFS-issued JWT access tokens offline-friendly: keys come from the ADFS JWKS endpoint
(inside your network) or a pinned JSON file, and are cached; no internet involved."""

from __future__ import annotations

import json
import ssl
import threading
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable

import jwt

from .config import AuthSettings
from .principal import Principal

JwksProvider = Callable[[], dict[str, Any]]


class TokenError(Exception):
    """Token rejected. The message is safe to return to the caller."""


def http_jwks_provider(url: str, ca_bundle: str | None = None, timeout: float = 5.0) -> JwksProvider:
    ctx = ssl.create_default_context(cafile=ca_bundle) if url.startswith("https") else None

    def fetch() -> dict[str, Any]:
        with urllib.request.urlopen(url, timeout=timeout, context=ctx) as resp:  # noqa: S310 - trusted config
            return json.loads(resp.read())

    return fetch


def file_jwks_provider(path: str) -> JwksProvider:
    return lambda: json.loads(Path(path).read_text(encoding="utf-8"))


class JwtValidator:
    def __init__(self, settings: AuthSettings, jwks_provider: JwksProvider | None = None):
        self.settings = settings
        if jwks_provider is None:
            if settings.jwks_file:
                jwks_provider = file_jwks_provider(settings.jwks_file)
            elif settings.jwks_url:
                jwks_provider = http_jwks_provider(settings.jwks_url, settings.ca_bundle)
            else:
                raise ValueError("set jwks_url or jwks_file (or pass jwks_provider)")
        self._provider = jwks_provider
        self._keys: dict[str, Any] = {}
        self._fetched_at = 0.0
        self._lock = threading.Lock()

    # -- keys -----------------------------------------------------------------
    def _refresh(self) -> None:
        jwks = self._provider()
        keys: dict[str, Any] = {}
        for jwk in jwks.get("keys", []):
            if jwk.get("use", "sig") != "sig":
                continue
            kid = jwk.get("kid") or jwk.get("x5t")
            keys[kid] = jwt.PyJWK.from_dict(jwk).key
        self._keys = keys
        self._fetched_at = time.time()

    def _key_for(self, kid: str | None) -> Any:
        with self._lock:
            stale = time.time() - self._fetched_at > self.settings.jwks_cache_seconds
            # unknown kid => ADFS may have rolled its token-signing cert; refetch (at most every 60s)
            missing = kid not in self._keys and time.time() - self._fetched_at > 60
            if not self._keys or stale or missing:
                try:
                    self._refresh()
                except Exception as exc:  # network / file errors
                    if not self._keys:
                        raise TokenError(f"cannot load signing keys: {exc}") from exc
            if kid is None and len(self._keys) == 1:
                return next(iter(self._keys.values()))
            if kid not in self._keys:
                raise TokenError("token signed with unknown key")
            return self._keys[kid]

    # -- validation -------------------------------------------------------------
    def decode(self, token: str) -> dict[str, Any]:
        """Verify signature, exp/nbf, iss, aud. Returns the claims."""
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise TokenError("malformed token") from exc
        if header.get("alg") not in self.settings.algorithms:
            raise TokenError(f"algorithm {header.get('alg')!r} not allowed")
        key = self._key_for(header.get("kid") or header.get("x5t"))
        try:
            return jwt.decode(
                token,
                key=key,
                algorithms=self.settings.algorithms,
                audience=self.settings.audience,
                issuer=self.settings.issuers,
                leeway=self.settings.leeway_seconds,
                options={"require": ["exp", "iss", "aud"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise TokenError("token expired") from exc
        except jwt.InvalidAudienceError as exc:
            raise TokenError("wrong audience") from exc
        except jwt.InvalidIssuerError as exc:
            raise TokenError("wrong issuer") from exc
        except jwt.InvalidSignatureError as exc:
            raise TokenError("bad signature") from exc
        except jwt.PyJWTError as exc:
            raise TokenError(f"invalid token: {exc}") from exc

    def principal_from_claims(self, claims: dict[str, Any]) -> Principal:
        s = self.settings
        subject = next((str(claims[c]) for c in s.subject_claims if claims.get(c)), None)
        if subject is None:
            raise TokenError(f"no identity claim (looked for {', '.join(s.subject_claims)})")
        memberships: set[str] = set()
        for c in s.membership_claims:
            v = claims.get(c)
            # ADFS sends a single value as a string and several as a list
            if isinstance(v, str):
                memberships.add(v)
            elif isinstance(v, list):
                memberships.update(str(x) for x in v)
        if s.scope_claim and claims.get(s.scope_claim):
            memberships.update(f"scp:{x}" for x in str(claims[s.scope_claim]).split())
        frozen = frozenset(memberships)
        return Principal(
            subject=subject,
            kind="jwt",
            memberships=frozen,
            permissions=s.permissions_for(subject, frozen),
            claims=claims,
        )

    def authenticate(self, token: str) -> Principal:
        return self.principal_from_claims(self.decode(token))
