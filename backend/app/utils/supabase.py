from supabase import create_client, Client
from app.config import settings

# Service-role client for admin operations (storage, auth admin)
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)

# Anon client for public operations
supabase_anon: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)


def get_storage_url(bucket: str, path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"
