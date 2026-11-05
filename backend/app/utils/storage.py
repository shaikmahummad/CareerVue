import uuid
from urllib.parse import quote

import httpx

from app.utils.supabase import service_role_headers
from app.config import settings

BUCKETS = {
    "thumbnails": "course-thumbnails",
    "videos": "course-videos",
    "pdfs": "course-pdfs",
    "avatars": "avatars",
    "certificates": "certificates",
    "resumes": "resumes",
}


def get_public_url(bucket: str, path: str) -> str:
    """Return the public URL for a Supabase Storage object."""
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"


class StorageRequestError(RuntimeError):
    pass


def _storage_request(method: str, path: str, **kwargs) -> httpx.Response:
    """Call Storage with fresh service-role headers, isolated from auth sessions."""
    response = httpx.request(
        method,
        f"{settings.supabase_url.rstrip('/')}/storage/v1/{path.lstrip('/')}",
        headers={**service_role_headers(), **kwargs.pop("headers", {})},
        timeout=120.0,
        **kwargs,
    )
    if response.is_error:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text[:500]
        raise StorageRequestError(
            f"Supabase Storage returned HTTP {response.status_code}: {detail}"
        )
    return response


def ensure_public_bucket(
    bucket: str,
    *,
    file_size_limit: int,
    allowed_mime_types: list[str],
) -> None:
    """Create a constrained public bucket when it has not been provisioned yet."""
    bucket_path = f"bucket/{quote(bucket, safe='')}"
    response = httpx.request(
        "GET",
        f"{settings.supabase_url.rstrip('/')}/storage/v1/{bucket_path}",
        headers=service_role_headers(),
        timeout=30.0,
    )
    if response.is_success:
        return

    try:
        error_code = str(response.json().get("code", ""))
    except ValueError:
        error_code = ""
    if error_code != "NoSuchBucket" and response.status_code != 404:
        raise StorageRequestError(
            f"Could not read Storage bucket {bucket}: HTTP {response.status_code}"
        )

    try:
        _storage_request(
            "POST",
            "bucket",
            json={
                "id": bucket,
                "name": bucket,
                "public": True,
                "file_size_limit": file_size_limit,
                "allowed_mime_types": allowed_mime_types,
            },
        )
    except StorageRequestError:
        # Another request may have created it between the lookup and create.
        _storage_request("GET", bucket_path)


def upload_file(bucket: str, path: str, file_data: bytes, content_type: str) -> str:
    """Upload file to Supabase Storage and return its public URL."""
    filename = path.rsplit("/", 1)[-1]
    object_path = quote(f"{bucket}/{path}", safe="/")
    _storage_request(
        "POST",
        f"object/{object_path}",
        headers={"x-upsert": "false"},
        files={"file": (filename, file_data, content_type)},
        data={"cacheControl": "3600"},
    )
    return get_public_url(bucket, path)


def delete_file(bucket: str, path: str) -> None:
    """Delete a file from Supabase Storage."""
    _storage_request(
        "DELETE",
        f"object/{quote(bucket, safe='')}",
        json={"prefixes": [path]},
    )


def generate_upload_path(folder: str, filename: str) -> str:
    """Generate a unique upload path within a folder, preserving the file extension."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"{folder}/{uuid.uuid4()}.{ext}"
