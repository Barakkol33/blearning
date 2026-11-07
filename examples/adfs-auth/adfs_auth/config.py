"""Settings for one service. Plain dataclasses so the only runtime deps are fastapi + pyjwt.

Two parts:
* token settings (who we trust): issuers, audience, where the signing keys are
* policy (what callers may do): ADFS group/role -> permissions, app id -> permissions, API keys
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ApiKeyEntry:
    name: str
    permissions: list[str]


@dataclass
class AuthSettings:
    # --- token trust ---------------------------------------------------------
    audience: list[str]
    # ADFS access tokens use  http://<host>/adfs/services/trust  (yes, http), while id_tokens use
    # https://<host>/adfs. Put whatever the probe tool reports here.
    issuers: list[str]
    jwks_url: str | None = None  # e.g. https://adfs.corp.local/adfs/discovery/keys
    jwks_file: str | None = None  # alternative for fully offline / pinned keys
    ca_bundle: str | None = None  # internal CA for fetching jwks_url over TLS
    jwks_cache_seconds: int = 3600
    algorithms: list[str] = field(default_factory=lambda: ["RS256"])
    leeway_seconds: int = 60

    # --- claim names (ADFS defaults; depend on your issuance transform rules) -
    # first one present wins. "appid" covers client-credentials (service) tokens.
    subject_claims: list[str] = field(
        default_factory=lambda: ["upn", "unique_name", "email", "appid", "client_id", "sub"]
    )
    membership_claims: list[str] = field(default_factory=lambda: ["group", "groups", "role", "roles"])
    scope_claim: str | None = "scp"  # space separated; added to memberships as "scp:<value>"

    # --- policy ----------------------------------------------------------------
    group_permissions: dict[str, list[str]] = field(default_factory=dict)
    subject_permissions: dict[str, list[str]] = field(default_factory=dict)
    api_keys: dict[str, ApiKeyEntry] = field(default_factory=dict)  # sha256 hex -> entry
    api_key_header: str = "X-API-Key"
    case_insensitive_groups: bool = True  # AD group names are case-insensitive

    # ------------------------------------------------------------------------
    def __post_init__(self) -> None:
        if isinstance(self.audience, str):
            self.audience = [self.audience]
        if isinstance(self.issuers, str):
            self.issuers = [self.issuers]
        if not self.audience or not self.issuers:
            raise ValueError("audience and issuers are required")
        self.api_keys = {
            k.lower(): (v if isinstance(v, ApiKeyEntry) else ApiKeyEntry(**v)) for k, v in self.api_keys.items()
        }

    def permissions_for(self, subject: str, memberships: frozenset[str]) -> frozenset[str]:
        """Map identity + groups/roles/scopes to this service's permissions."""
        norm = (lambda s: s.lower()) if self.case_insensitive_groups else (lambda s: s)
        wanted = {norm(m) for m in memberships}
        perms: set[str] = set()
        for group, granted in self.group_permissions.items():
            if norm(group) in wanted:
                perms.update(granted)
        perms.update(self.subject_permissions.get(subject, []))
        return frozenset(perms)

    @staticmethod
    def hash_api_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def load_policy(self, path: str | os.PathLike) -> "AuthSettings":
        """Merge a policy JSON file: {group_permissions, subject_permissions, api_keys}."""
        data: dict[str, Any] = json.loads(Path(path).read_text(encoding="utf-8"))
        self.group_permissions.update(data.get("group_permissions", {}))
        self.subject_permissions.update(data.get("subject_permissions", {}))
        for h, entry in data.get("api_keys", {}).items():
            self.api_keys[h.lower()] = ApiKeyEntry(**entry)
        return self

    @classmethod
    def from_env(cls, prefix: str = "ADFS_AUTH_", env: dict[str, str] | None = None) -> "AuthSettings":
        """Build from environment variables (and an optional .env file in the cwd).

        ADFS_AUTH_AUDIENCE, ADFS_AUTH_ISSUERS (comma separated), ADFS_AUTH_JWKS_URL | ADFS_AUTH_JWKS_FILE,
        ADFS_AUTH_CA_BUNDLE, ADFS_AUTH_POLICY_FILE, ADFS_AUTH_SUBJECT_CLAIMS, ADFS_AUTH_MEMBERSHIP_CLAIMS,
        ADFS_AUTH_LEEWAY_SECONDS
        """
        e = dict(_read_dotenv(Path(".env")))
        e.update(env if env is not None else os.environ)

        def get(name: str, default: str | None = None) -> str | None:
            return e.get(prefix + name, default)

        def lst(name: str) -> list[str] | None:
            v = get(name)
            return [x.strip() for x in v.split(",") if x.strip()] if v else None

        kwargs: dict[str, Any] = {
            "audience": lst("AUDIENCE") or [],
            "issuers": lst("ISSUERS") or [],
            "jwks_url": get("JWKS_URL"),
            "jwks_file": get("JWKS_FILE"),
            "ca_bundle": get("CA_BUNDLE"),
        }
        for opt in ("SUBJECT_CLAIMS", "MEMBERSHIP_CLAIMS"):
            if lst(opt):
                kwargs[opt.lower()] = lst(opt)
        if get("LEEWAY_SECONDS"):
            kwargs["leeway_seconds"] = int(get("LEEWAY_SECONDS"))  # type: ignore[arg-type]
        settings = cls(**kwargs)
        policy = get("POLICY_FILE")
        if policy:
            settings.load_policy(policy)
        return settings


def _read_dotenv(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out
