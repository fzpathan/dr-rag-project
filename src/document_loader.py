"""
Document loading utilities supporting TXT, PDF, and EPUB formats.
Preserves metadata for source attribution.
"""
from pathlib import Path
from typing import List
import re

from langchain_core.documents import Document
from langchain_community.document_loaders import TextLoader, PyPDFLoader


class DocumentLoaderFactory:
    """Factory for creating appropriate document loaders based on file type."""

    SUPPORTED_EXTENSIONS = {".txt", ".pdf"}

    @staticmethod
    def get_loader(file_path: Path):
        """Return appropriate loader for file type."""
        ext = file_path.suffix.lower()

        if ext == ".txt":
            # Try different encodings for text files
            for encoding in ["utf-8", "latin-1", "cp1252"]:
                try:
                    return TextLoader(str(file_path), encoding=encoding)
                except Exception:
                    continue
            return TextLoader(str(file_path), encoding="utf-8", autodetect_encoding=True)
        elif ext == ".pdf":
            return PyPDFLoader(str(file_path))
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    @classmethod
    def is_supported(cls, file_path: Path) -> bool:
        """Check if file type is supported."""
        return file_path.suffix.lower() in cls.SUPPORTED_EXTENSIONS


def extract_book_name(file_path: Path) -> str:
    """Extract clean book name from filename."""
    name = file_path.stem
    # Clean up common patterns
    name = re.sub(r"_+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def load_documents_from_directory(data_dir: Path) -> List[Document]:
    """
    Load all supported documents from a directory.

    Args:
        data_dir: Path to directory containing source documents

    Returns:
        List of Document objects with metadata including:
        - source: Full file path
        - book_name: Cleaned book name for display
        - file_type: Extension type
    """
    documents = []

    if not data_dir.exists():
        print(f"Data directory not found: {data_dir}")
        return documents

    for file_path in sorted(data_dir.iterdir()):
        if not file_path.is_file():
            continue

        if not DocumentLoaderFactory.is_supported(file_path):
            print(f"Skipping unsupported file: {file_path.name}")
            continue

        try:
            loader = DocumentLoaderFactory.get_loader(file_path)
            docs = loader.load()

            # Enrich metadata
            book_name = extract_book_name(file_path)
            for doc in docs:
                doc.metadata.update(
                    {
                        "source": str(file_path),
                        "book_name": book_name,
                        "file_type": file_path.suffix.lower(),
                    }
                )

            documents.extend(docs)
            print(f"Loaded {len(docs)} document(s) from: {file_path.name}")

        except Exception as e:
            print(f"Error loading {file_path.name}: {e}")

    return documents


def load_single_file(file_path: Path) -> List[Document]:
    """
    Load a single document file.

    Args:
        file_path: Path to the document file

    Returns:
        List of Document objects with metadata
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if not DocumentLoaderFactory.is_supported(file_path):
        raise ValueError(f"Unsupported file type: {file_path.suffix}")

    loader = DocumentLoaderFactory.get_loader(file_path)
    docs = loader.load()

    book_name = extract_book_name(file_path)
    for doc in docs:
        doc.metadata.update(
            {
                "source": str(file_path),
                "book_name": book_name,
                "file_type": file_path.suffix.lower(),
            }
        )

    return docs
