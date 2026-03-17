"""
Configuration management for the RAG system.
Handles environment variables, paths, and model settings.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from dataclasses import dataclass, field
from typing import List, Optional

# Load environment variables from .env file
load_dotenv()


@dataclass
class Config:
    """Central configuration for the RAG Medical Remedy Finder."""

    # Paths
    PROJECT_ROOT: Path = field(default_factory=lambda: Path(__file__).parent.parent)

    @property
    def DATA_DIR(self) -> Path:
        return self.PROJECT_ROOT / "data"

    @property
    def VECTORSTORE_DIR(self) -> Path:
        return self.PROJECT_ROOT / "vectorstore"

    # Embedding settings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    USE_OPENAI_EMBEDDINGS: bool = field(
        default_factory=lambda: os.getenv("USE_OPENAI_EMBEDDINGS", "false").lower() == "true"
    )
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Text splitting settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # Retrieval settings
    TOP_K_RESULTS: int = 3
    SIMILARITY_THRESHOLD: float = 0.3

    # LLM settings
    @property
    def OPENAI_API_KEY(self) -> Optional[str]:
        return os.getenv("OPENAI_API_KEY")

    LLM_MODEL: str = "gpt-4o-mini"  # Cost-effective, good quality
    LLM_TEMPERATURE: float = 0.1  # Low temperature for factual responses

    # OpenRouter settings (free alternative to OpenAI)
    @property
    def OPENROUTER_API_KEY(self) -> Optional[str]:
        return os.getenv("OPENROUTER_API_KEY")

    @property
    def OPENROUTER_API_KEYS(self) -> List[str]:
        keys_env = os.getenv("OPENROUTER_API_KEYS", "")
        keys = [key.strip() for key in keys_env.split(",") if key.strip()]
        primary = self.OPENROUTER_API_KEY
        if primary and primary not in keys:
            keys.insert(0, primary)
        return keys

    @property
    def OPENROUTER_KEY_ROTATION_SEED(self) -> Optional[int]:
        seed = os.getenv("OPENROUTER_KEY_ROTATION_SEED")
        if seed is None:
            return None
        try:
            return int(seed)
        except ValueError:
            return None

    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"

    @property
    def USE_OPENROUTER(self) -> bool:
        return os.getenv("USE_OPENROUTER", "false").lower() == "true"

    # Ollama settings (alternative local LLM)
    # Uncomment and configure if using Ollama instead of OpenAI
    # OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    # OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

    # ChromaDB settings
    CHROMA_COLLECTION_NAME: str = "homeopathy_remedies"


# Global config instance
config = Config()
