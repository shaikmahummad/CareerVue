from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # Razorpay
    razorpay_key_id: str
    razorpay_key_secret: str

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
