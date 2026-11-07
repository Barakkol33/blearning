"""Thin ADFS (JWT) + API-key authentication with per-route permissions for FastAPI."""

from .config import ApiKeyEntry, AuthSettings
from .fastapi_auth import AdfsAuth
from .jwt_validator import JwtValidator, TokenError
from .principal import Principal

__all__ = [
    "AdfsAuth",
    "ApiKeyEntry",
    "AuthSettings",
    "JwtValidator",
    "Principal",
    "TokenError",
]
