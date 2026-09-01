from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field
from backend.app.config.transport_config import transport_config, TransportConfig

class Settings(BaseSettings):
    app_env: str = Field(default="development")
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)
    log_level: str = Field(default="INFO")
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    )
    osrm_base_url: str = Field(default="https://router.project-osrm.org")
    osrm_timeout_seconds: float = Field(default=5.0)
    osrm_max_retries: int = Field(default=1)
    solver_time_limit_seconds: float = Field(default=2.0)
    solver_workers: int = Field(default=4)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

__all__ = ["settings", "Settings", "transport_config", "TransportConfig"]
