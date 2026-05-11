import uuid

from app.utils.supabase import supabase_admin
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


def upload_file(bucket: str, path: str, file_data: bytes, content_type: str) -> str:
    """Upload file to Supabase Storage and return its public URL."""
    supabase_admin.storage.from_(bucket).upload(
        path, file_data, {"content-type": content_type}
    )
    return get_public_url(bucket, path)


def delete_file(bucket: str, path: str) -> None:
    """Delete a file from Supabase Storage."""
    supabase_admin.storage.from_(bucket).remove([path])


def generate_upload_path(folder: str, filename: str) -> str:
    """Generate a unique upload path within a folder, preserving the file extension."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"{folder}/{uuid.uuid4()}.{ext}"
