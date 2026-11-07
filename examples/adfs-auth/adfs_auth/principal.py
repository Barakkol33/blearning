from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(frozen=True)
class Principal:
    """Who is calling and what they may do. Produced by the library, consumed by routes."""

    subject: str
    kind: Literal["jwt", "apikey"]
    memberships: frozenset[str] = frozenset()  # groups / roles / scopes from the token
    permissions: frozenset[str] = frozenset()  # after mapping through the service policy
    claims: dict[str, Any] = field(default_factory=dict, compare=False, repr=False)

    def has(self, permission: str) -> bool:
        return "*" in self.permissions or permission in self.permissions

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject": self.subject,
            "kind": self.kind,
            "memberships": sorted(self.memberships),
            "permissions": sorted(self.permissions),
        }
