"""FastAPI integration.

    auth = AdfsAuth(AuthSettings.from_env())

    @app.get("/orders")
    def orders(p: Principal = Security(auth.require("orders:read"))): ...

    @app.get("/health", dependencies=[Depends(auth.public)])
    def health(): ...

    auth.verify_routes(app)   # fail at startup if any route forgot to declare one of the above

Why a dependency and not middleware: middleware runs before routing and cannot see which permission
a route needs. A dependency runs the same central logic, knows the route, appears in OpenAPI
(Swagger "Authorize" button works), and is trivially overridable in tests.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

from fastapi import Depends, FastAPI, HTTPException, Request, Security, status
from fastapi.routing import APIRoute
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from .apikey import ApiKeyStore
from .config import AuthSettings
from .jwt_validator import JwtValidator, TokenError
from .principal import Principal

log = logging.getLogger("adfs_auth")

_MARK = "__adfs_auth_marker__"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


class AdfsAuth:
    def __init__(self, settings: AuthSettings, validator: JwtValidator | None = None):
        self.settings = settings
        self.validator = validator or JwtValidator(settings)
        self.api_keys = ApiKeyStore(settings)

        bearer = HTTPBearer(auto_error=False, description="ADFS access token")
        api_key = APIKeyHeader(name=settings.api_key_header, auto_error=False, description="Service API key")

        # sync on purpose: JWKS fetch is blocking I/O, FastAPI runs sync deps in a threadpool
        def authenticate(
            request: Request,
            creds: HTTPAuthorizationCredentials | None = Security(bearer),
            key: str | None = Security(api_key),
        ) -> Principal:
            if creds is not None:  # a bearer token wins; an invalid one never falls back to the API key
                try:
                    principal = self.validator.authenticate(creds.credentials)
                except TokenError as exc:
                    log.info("rejected bearer token: %s", exc)
                    raise _unauthorized(str(exc)) from None
            elif key:
                principal = self.api_keys.authenticate(key)
                if principal is None:
                    log.info("rejected API key")
                    raise _unauthorized("invalid API key")
            else:
                raise _unauthorized("missing credentials (Authorization: Bearer <token> or API key header)")
            request.state.principal = principal
            return principal

        setattr(authenticate, _MARK, ("authenticated",))  # "any valid caller" is a declaration too
        self.authenticate: Callable[..., Principal] = authenticate

        def public() -> None:
            return None

        setattr(public, _MARK, ("public",))
        self.public = public

    def require(self, *permissions: str, any_of: bool = False) -> Callable[..., Principal]:
        """Dependency: authenticate, then demand all (default) or any of the given permissions."""

        def checker(principal: Principal = Depends(self.authenticate)) -> Principal:
            have = [p for p in permissions if principal.has(p)]
            ok = bool(have) if any_of else len(have) == len(permissions)
            if not ok:
                log.info("forbidden: %s lacks %s", principal.subject, permissions)
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"missing permission: {', '.join(permissions)}")
            return principal

        setattr(checker, _MARK, permissions)
        checker.__name__ = "require_" + "_".join(p.replace(":", "_") for p in permissions)
        return checker

    # -- deny by default --------------------------------------------------------
    @staticmethod
    def _declared(dependant: Any) -> bool:
        if hasattr(dependant.call, _MARK):
            return True
        return any(AdfsAuth._declared(d) for d in dependant.dependencies)

    def verify_routes(self, app: FastAPI) -> None:
        """Raise if any API route has none of auth.require(...), auth.authenticate, auth.public."""
        missing = [
            f"{','.join(sorted(r.methods or []))} {r.path}"
            for r in app.routes
            if isinstance(r, APIRoute) and not self._declared(r.dependant)
        ]
        if missing:
            raise RuntimeError("routes without auth.require(...) or auth.public: " + "; ".join(missing))
