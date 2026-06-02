import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
import uuid

from app.database import get_db
from app.utils.supabase import supabase_admin
from app.models.user import Profile
from app.config import settings  # noqa: F401 — kept for potential future use

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> Profile:
    token = credentials.credentials

    # Verify token with Supabase (handles all JWT validation)
    try:
        user_response = supabase_admin.auth.get_user(token)
        supabase_user = user_response.user
        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get profile from DB
    result = await db.execute(
        select(Profile).where(Profile.id == uuid.UUID(supabase_user.id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Please complete registration.",
        )

    return profile


def require_role(*roles: str):
    async def _guard(
        current_user: Annotated[Profile, Depends(get_current_user)],
    ) -> Profile:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role(s): {roles}. "
                    f"Your role: {current_user.role}"
                ),
            )
        return current_user

    return _guard


require_admin = require_role("admin")
require_tutor = require_role("tutor", "admin")
require_student = require_role("student")
require_any = require_role("admin", "tutor", "student")

# Type aliases for use in router dependencies
CurrentUser = Annotated[Profile, Depends(get_current_user)]
AdminUser = Annotated[Profile, Depends(require_admin)]
TutorUser = Annotated[Profile, Depends(require_tutor)]
StudentUser = Annotated[Profile, Depends(require_student)]
AnyUser = Annotated[Profile, Depends(require_any)]
