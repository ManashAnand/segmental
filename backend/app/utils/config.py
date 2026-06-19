"""Application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "10-K Extraction API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    pdfs_dir: Path = data_dir / "pdfs"
    cache_dir: Path = data_dir / "cache"
    extracted_dir: Path = data_dir / "extracted"
    ground_truth_dir: Path = data_dir / "ground_truth"


@lru_cache
def get_settings() -> Settings:
    return Settings()
