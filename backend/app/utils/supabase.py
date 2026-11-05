import base64
import json
import logging

from supabase import create_client, Client
from app.config import settings


logger = logging.getLogger(__name__)


def _clean_key(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1].strip()
    return value


def _jwt_role(value: str) -> str | None:
    """Read a legacy Supabase JWT role without verifying or exposing the key."""
    try:
        parts = value.split(".")
        if len(parts) != 3:
            return None
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload))
        role = decoded.get("role")
        return role if isinstance(role, str) else None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def resolve_supabase_keys(anon_value: str, service_value: str) -> tuple[str, str, str]:
    """Normalize credentials and repair the common swapped-key deployment error."""
    anon_key = _clean_key(anon_value)
    service_key = _clean_key(service_value)
    anon_role = _jwt_role(anon_key)
    service_role = _jwt_role(service_key)

    if service_role == "service_role":
        return anon_key, service_key, "service_role"
    if anon_role == "service_role":
        logger.warning(
            "Supabase anon and service-role values were swapped; correcting them at runtime"
        )
        return service_key, anon_key, "service_role_swapped"
    if service_key.startswith("sb_secret_"):
        return anon_key, service_key, "secret_key"

    logger.error(
        "SUPABASE_SERVICE_ROLE_KEY is not a service-role credential "
        "(detected role=%s); Storage uploads will be rejected",
        service_role or "unknown",
    )
    return anon_key, service_key, f"invalid:{service_role or 'unknown'}"


_anon_key, _service_key, supabase_admin_credential_status = resolve_supabase_keys(
    settings.supabase_anon_key,
    settings.supabase_service_role_key,
)

# Service-role client for admin operations (storage, auth admin).
supabase_admin: Client = create_client(settings.supabase_url, _service_key)

# Authentication mutates the client's active Authorization header. Keep it on
# a separate client so a user login can never downgrade the service-role client
# later used for Storage or Auth Admin operations.
supabase_auth: Client = create_client(settings.supabase_url, _anon_key)

# Backward-compatible public client alias. Neither name may be used for admin
# Storage operations.
supabase_anon: Client = supabase_auth


def service_role_headers() -> dict[str, str]:
    """Return fresh headers for an isolated Supabase admin REST request."""
    headers = {"apikey": _service_key}
    # Legacy service-role keys are JWTs and are also accepted as Bearer tokens.
    # New sb_secret_ keys must only be sent through the apikey header.
    if not _service_key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {_service_key}"
    return headers


def get_storage_url(bucket: str, path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"
