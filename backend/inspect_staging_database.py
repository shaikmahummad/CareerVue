"""Read-only staging database identity and migration-state inspection."""

import asyncio
import hashlib
from pathlib import Path
from urllib.parse import quote, urlparse

from dotenv import dotenv_values
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


ENV_PATH = Path(__file__).with_name(".env.staging.local")


def _normalized_database_url(database_url: str) -> str:
    """Percent-encode password characters without persisting credentials."""
    scheme, separator, remainder = database_url.partition("://")
    userinfo, at, server = remainder.rpartition("@")
    username, colon, password = userinfo.partition(":")
    if not separator or not at or not colon:
        raise RuntimeError("Refusing connection: malformed database URL")
    encoded_password = quote(password, safe="%")
    return f"{scheme}://{username}:{encoded_password}@{server}"


def _validated_config() -> dict[str, str]:
    values = {
        key: value
        for key, value in dotenv_values(ENV_PATH).items()
        if value is not None
    }
    if values.get("APP_ENV") != "staging":
        raise RuntimeError("Refusing connection: APP_ENV must be staging")

    supabase_host = urlparse(values.get("SUPABASE_URL", "")).hostname or ""
    project_ref = supabase_host.removesuffix(".supabase.co")
    database_url = _normalized_database_url(values.get("DATABASE_URL", ""))
    if not project_ref or project_ref == supabase_host:
        raise RuntimeError("Refusing connection: invalid staging Supabase URL")
    if project_ref not in database_url:
        raise RuntimeError(
            "Refusing connection: database and Supabase project do not match"
        )
    if not database_url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("Refusing connection: asyncpg database URL required")
    values["DATABASE_URL"] = database_url
    return values


async def inspect() -> None:
    values = _validated_config()
    engine = create_async_engine(values["DATABASE_URL"], pool_pre_ping=True)
    try:
        async with engine.connect() as connection:
            identity = (
                await connection.execute(
                    text("select current_database(), current_schema()")
                )
            ).one()
            tables = (
                await connection.execute(
                    text(
                        "select table_name from information_schema.tables "
                        "where table_schema = 'public' order by table_name"
                    )
                )
            ).scalars().all()
            has_alembic = (
                await connection.execute(
                    text(
                        "select to_regclass('public.alembic_version') "
                        "is not null"
                    )
                )
            ).scalar_one()
            revision = None
            if has_alembic:
                revision = (
                    await connection.execute(
                        text("select version_num from alembic_version")
                    )
                ).scalar_one_or_none()

        application_tables = {
            "profiles",
            "students",
            "quiz_templates",
            "quiz_attempts",
            "quiz_questions",
            "roadmaps",
        }
        fingerprint = hashlib.sha256(identity[0].encode()).hexdigest()[:12]
        print("CONNECTION=PASS")
        print(f"DATABASE_FINGERPRINT={fingerprint}")
        print(f"SCHEMA={identity[1]}")
        print(f"PUBLIC_TABLE_COUNT={len(tables)}")
        print(f"ALEMBIC_TABLE={'PRESENT' if has_alembic else 'ABSENT'}")
        print(f"ALEMBIC_REVISION={revision or 'NONE'}")
        print(
            "APP_TABLES_PRESENT="
            f"{sum(table in application_tables for table in tables)}"
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(inspect())
