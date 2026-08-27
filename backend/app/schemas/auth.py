import re
from typing import Annotated, Optional

from pydantic import (
    AfterValidator,
    BaseModel,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


MAX_NAME_LENGTH = 100
MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 72


def normalize_email(value: EmailStr) -> str:
    """Match Supabase Auth's case-insensitive email identity behavior."""
    return str(value).strip().lower()


NormalizedEmail = Annotated[EmailStr, AfterValidator(normalize_email)]
Password = Annotated[
    str,
    StringConstraints(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH),
]


def normalize_name(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("Full name must be text.")
    value = " ".join(value.split())
    if not value:
        raise ValueError("Full name is required.")
    if len(value) > MAX_NAME_LENGTH:
        raise ValueError(f"Full name must be {MAX_NAME_LENGTH} characters or fewer.")
    if not any(character.isalpha() for character in value):
        raise ValueError("Full name must contain letters.")
    if any(
        not (character.isalpha() or character in " -'.\N{RIGHT SINGLE QUOTATION MARK}")
        for character in value
    ):
        raise ValueError(
            "Full name may contain letters, spaces, hyphens, apostrophes, and periods."
        )
    return value


def normalize_indian_phone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Mobile number must be text.")
    value = value.strip()
    if not value:
        return None
    if not re.fullmatch(r"\+?[0-9 -]+", value):
        raise ValueError("Enter a valid Indian mobile number.")

    digits = re.sub(r"[ -]", "", value)
    if digits.startswith("+"):
        digits = digits[1:]
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if not re.fullmatch(r"[6-9][0-9]{9}", digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number.")
    return f"+91{digits}"


class RegistrationRequest(BaseModel):
    email: NormalizedEmail
    password: Password
    confirm_password: Annotated[str, StringConstraints(max_length=MAX_PASSWORD_LENGTH)]
    full_name: Annotated[str, Field(max_length=MAX_NAME_LENGTH)]
    phone: Optional[str] = None
    email_redirect_to: Optional[Annotated[str, StringConstraints(max_length=500)]] = None

    _normalize_name = field_validator("full_name", mode="before")(normalize_name)
    _normalize_phone = field_validator("phone", mode="before")(normalize_indian_phone)

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password cannot contain only whitespace.")
        return value

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirmation do not match.")
        return self


class RegisterStudentRequest(RegistrationRequest):
    college: Optional[str] = Field(default=None, max_length=200)
    branch: Optional[str] = Field(default=None, max_length=100)
    year_of_study: Optional[int] = Field(default=None, ge=1, le=5)
    graduation_year: Optional[int] = Field(default=None, ge=2000, le=2200)
    city: Optional[str] = Field(default=None, max_length=100)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    github_url: Optional[str] = Field(default=None, max_length=500)


class RegisterTutorRequest(RegistrationRequest):
    bio: Optional[str] = Field(default=None, max_length=2000)
    expertise_tags: Optional[list[str]] = Field(default=None, max_length=50)
    qualification: Optional[str] = Field(default=None, max_length=200)
    years_experience: Optional[int] = Field(default=None, ge=0, le=80)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    website_url: Optional[str] = Field(default=None, max_length=500)


class LoginRequest(BaseModel):
    email: NormalizedEmail
    password: Annotated[str, StringConstraints(min_length=1, max_length=MAX_PASSWORD_LENGTH)]


class ResendVerificationRequest(BaseModel):
    email: NormalizedEmail


class RefreshRequest(BaseModel):
    refresh_token: Annotated[str, StringConstraints(min_length=1)]
