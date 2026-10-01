from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Smart Lab Report Analyzer", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    ocr_provider: str = Field(default="mock", alias="OCR_PROVIDER")

    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    document_ai_location: str = Field(default="us", alias="DOCUMENT_AI_LOCATION")
    document_ai_processor_id: str | None = Field(default=None, alias="DOCUMENT_AI_PROCESSOR_ID")
    google_application_credentials: str | None = Field(
        default=None, alias="GOOGLE_APPLICATION_CREDENTIALS"
    )

    max_upload_size_mb: int = Field(default=20, alias="MAX_UPLOAD_SIZE_MB")
    allowed_extensions: str = Field(
        default="pdf,png,jpg,jpeg,webp,tif,tiff,bmp",
        alias="ALLOWED_EXTENSIONS",
    )

    # Sensitive Data Protection (Cloud DLP)
    dlp_enabled: bool = Field(default=True, alias="DLP_ENABLED")
    dlp_location: str = Field(default="global", alias="DLP_LOCATION")

    # LLM Clinical Scoring (Google Gemini)
    llm_provider: str = Field(default="gemini", alias="LLM_PROVIDER")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    @property
    def allowed_extension_set(self) -> set[str]:
        return {x.strip().lower() for x in self.allowed_extensions.split(",") if x.strip()}


import os


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.google_application_credentials and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = s.google_application_credentials
    return s


settings = get_settings()

