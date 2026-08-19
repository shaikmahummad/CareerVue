from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # Groq
    groq_api_key: str

    # Razorpay
    razorpay_key_id: str
    razorpay_key_secret: str

    # SMTP (password-reset OTP emails)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "CareerVue"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False

    # App
    app_env: str = "development"
    app_cors_origins: str = '["http://localhost:3000","http://localhost:8081"]'

    @property
    def cors_origins(self) -> List[str]:
        return json.loads(self.app_cors_origins)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
