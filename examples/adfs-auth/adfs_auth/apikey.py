from __future__ import annotations

import hmac

from .config import AuthSettings
from .principal import Principal


class ApiKeyStore:
    """API keys are stored only as sha256 hashes in the policy; each maps to a name + permissions."""

    def __init__(self, settings: AuthSettings):
        self.settings = settings

    def authenticate(self, raw_key: str) -> Principal | None:
        digest = AuthSettings.hash_api_key(raw_key)
        match = None
        # constant-time compare against every entry (no early exit leaks which prefix matched)
        for stored, entry in self.settings.api_keys.items():
            if hmac.compare_digest(stored, digest):
                match = entry
        if match is None:
            return None
        return Principal(
            subject=f"apikey:{match.name}",
            kind="apikey",
            permissions=frozenset(match.permissions),
        )
