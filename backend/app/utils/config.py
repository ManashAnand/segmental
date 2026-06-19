"""Application configuration."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            _BACKEND_DIR / ".env",
            _BACKEND_DIR / ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "10-K Extraction API"
    app_version: str = "0.2.0"
    api_prefix: str = "/api"

    database_url: str = "postgresql://segment:segment@localhost:5432/segment"
    model_name: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384
    chunk_size: int = 1000
    chunk_overlap: int = 150
    embed_batch_size: int = 32
    retrieval_top_k: int = 8

    llm_provider: Literal["auto", "groq", "ollama"] = "auto"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    pdfs_dir: Path = data_dir / "pdfs"
    cache_dir: Path = data_dir / "cache"
    extracted_dir: Path = data_dir / "extracted"
    ground_truth_dir: Path = data_dir / "ground_truth"
    v2_extracted_dir: Path = data_dir / "extracted" / "v2"

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
