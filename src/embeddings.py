"""
Embedding model wrapper with support for local and OpenAI models.
"""
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings

from src.config import config


def get_embedding_model():
    """
    Get configured embedding model.

    Default: sentence-transformers/all-MiniLM-L6-v2 (local, free)
    Alternative: OpenAI text-embedding-3-small (requires API key)

    Returns:
        Embeddings instance for generating document embeddings
    """
    if config.USE_OPENAI_EMBEDDINGS:
        if not config.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY required for OpenAI embeddings")

        return OpenAIEmbeddings(
            model=config.OPENAI_EMBEDDING_MODEL,
            openai_api_key=config.OPENAI_API_KEY,
        )

    # Local HuggingFace model (default)
    return HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},  # Use 'cuda' if GPU available
        encode_kwargs={"normalize_embeddings": True},
    )


# =============================================================================
# Alternative: Ollama Embeddings (local embedding model via Ollama)
# =============================================================================
# Uncomment the following to use Ollama embeddings instead:
#
# from langchain_ollama import OllamaEmbeddings
#
# def get_ollama_embeddings():
#     """
#     Get Ollama-based local embeddings.
#
#     Requires Ollama running locally with nomic-embed-text model:
#         ollama pull nomic-embed-text
#     """
#     return OllamaEmbeddings(
#         base_url=config.OLLAMA_BASE_URL,
#         model="nomic-embed-text"
#     )
