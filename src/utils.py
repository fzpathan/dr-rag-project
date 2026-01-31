"""
Helper utilities for the RAG system.
"""
from pathlib import Path
from typing import List
import hashlib
import re


def get_file_hash(file_path: Path) -> str:
    """
    Generate MD5 hash of file for change detection.

    Args:
        file_path: Path to the file

    Returns:
        MD5 hash string
    """
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def format_sources_for_display(citations: List[str]) -> str:
    """
    Format citations for display.

    Args:
        citations: List of citation strings

    Returns:
        Formatted string for display
    """
    if not citations:
        return ""

    formatted = "\n**Sources:**\n"
    for idx, citation in enumerate(citations, 1):
        formatted += f"{idx}. {citation}\n"
    return formatted


def sanitize_query(query: str) -> str:
    """
    Clean and validate user query.

    Args:
        query: Raw user input

    Returns:
        Sanitized query string

    Raises:
        ValueError: If query is too short
    """
    query = query.strip()

    if len(query) < 2:
        raise ValueError("Query must be at least 2 characters")

    if len(query) > 500:
        query = query[:500]

    return query


def highlight_text(text: str, query: str) -> str:
    """
    Highlight query terms in text (case-insensitive).

    Args:
        text: Text to highlight
        query: Query terms to highlight

    Returns:
        Text with highlighted terms (markdown bold)
    """
    words = query.lower().split()
    result = text

    for word in words:
        if len(word) >= 3:  # Only highlight words with 3+ chars
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            result = pattern.sub(f"**{word}**", result)

    return result


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    Truncate text to specified length with ellipsis.

    Args:
        text: Text to truncate
        max_length: Maximum length

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text

    return text[: max_length - 3] + "..."
