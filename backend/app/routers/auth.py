from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.utils.supabase import supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    try:
        response = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name, "role": body.role},
        })
        return {"user_id": response.user.id, "email": response.user.email}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    try:
        response = supabase_admin.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        session = response.session
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "role": response.user.user_metadata.get("role"),
                "full_name": response.user.user_metadata.get("full_name"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
