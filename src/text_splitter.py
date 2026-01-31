"""
Text chunking with metadata preservation.
Handles page markers found in the source files.
"""
from typing import List
import re

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.config import config


def extract_page_number(text: str) -> int:
    """Extract page number from text containing page markers."""
    # Pattern: --- Page X --- or similar
    match = re.search(r"---\s*Page\s*(\d+)\s*---", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 0


def extract_chapter_info(text: str) -> str:
    """Extract chapter information if present."""
    # Pattern: Chapter: X or Chapter X
    match = re.search(r"Chapter[:\s]*(\d+|[A-Z][A-Za-z\s]+)", text)
    if match:
        return match.group(1).strip()
    return ""


def extract_remedy_name(text: str) -> str:
    """Extract remedy name if present at start of chunk."""
    # Common patterns in homeopathy texts
    # Pattern: REMEDY NAME (all caps at start)
    match = re.match(r"^([A-Z][A-Z\s]+)(?:\n|\.)", text)
    if match:
        return match.group(1).strip()
    return ""


class MetadataPreservingTextSplitter:
    """
    Splits documents while preserving and enriching metadata.
    """

    def __init__(
        self,
        chunk_size: int = config.CHUNK_SIZE,
        chunk_overlap: int = config.CHUNK_OVERLAP,
    ):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=[
                "\n\n\n",  # Multiple newlines (section breaks)
                "--- Page",  # Page markers
                "\n\n",  # Paragraph breaks
                "\n",  # Line breaks
                ". ",  # Sentences
                " ",  # Words
                "",  # Characters
            ],
        )

    def split_documents(self, documents: List[Document]) -> List[Document]:
        """
        Split documents and enrich chunks with positional metadata.

        Args:
            documents: List of Document objects to split

        Returns:
            List of chunked Document objects with enriched metadata
        """
        all_chunks = []

        for doc in documents:
            chunks = self.splitter.split_documents([doc])

            for idx, chunk in enumerate(chunks):
                # Preserve original metadata
                chunk.metadata["chunk_index"] = idx
                chunk.metadata["total_chunks"] = len(chunks)

                # Extract page/chapter info from chunk content
                page_num = extract_page_number(chunk.page_content)
                if page_num:
                    chunk.metadata["page_number"] = page_num

                chapter = extract_chapter_info(chunk.page_content)
                if chapter:
                    chunk.metadata["chapter"] = chapter

                # Extract remedy name if present
                remedy = extract_remedy_name(chunk.page_content)
                if remedy:
                    chunk.metadata["remedy_name"] = remedy

                # Create citation reference
                chunk.metadata["citation"] = self._create_citation(chunk.metadata)

                all_chunks.append(chunk)

        return all_chunks

    def _create_citation(self, metadata: dict) -> str:
        """Create a citation string from metadata."""
        parts = [metadata.get("book_name", "Unknown Source")]

        if "page_number" in metadata:
            parts.append(f"Page {metadata['page_number']}")
        elif "chapter" in metadata:
            parts.append(f"Chapter {metadata['chapter']}")
        else:
            chunk_num = metadata.get("chunk_index", 0) + 1
            total = metadata.get("total_chunks", "?")
            parts.append(f"Section {chunk_num}/{total}")

        return " - ".join(parts)
