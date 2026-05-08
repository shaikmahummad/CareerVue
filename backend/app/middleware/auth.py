from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Annotated
from app.config import settings

bearer_scheme = HTTPBearer()


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    return _decode_token(credentials.credentials)


def require_role(*roles: str):
    def _guard(user: Annotated[dict, Depends(get_current_user)]) -> dict:
        user_role = user.get("user_metadata", {}).get("role") or user.get("role")
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role(s): {roles}. You have: {user_role}",
            )
        return user
    return _guard


require_admin = require_role("admin")
require_tutor = require_role("tutor", "admin")
require_student = require_role("student")
require_any = require_role("admin", "tutor", "student")
