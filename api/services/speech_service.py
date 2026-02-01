"""
Speech-to-text service using OpenAI Whisper.
"""
import os
import logging
import tempfile
from typing import Dict, Any

from fastapi import UploadFile, HTTPException

from api.config import api_config

logger = logging.getLogger(__name__)


async def transcribe_audio(
    audio_file: UploadFile,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Transcribe audio file using OpenAI Whisper API.

    Args:
        audio_file: Uploaded audio file
        language: Language code (default: "en")

    Returns:
        Transcription result dict
    """
    if not api_config.WHISPER_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text service not available. OPENAI_API_KEY required."
        )

    # Validate file type
    allowed_types = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm",
        "audio/mp4", "audio/m4a", "audio/ogg", "audio/flac"
    ]

    content_type = audio_file.content_type
    if content_type not in allowed_types:
        # Try to infer from filename
        filename = audio_file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        valid_extensions = [".mp3", ".wav", ".webm", ".mp4", ".m4a", ".ogg", ".flac"]

        if ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Supported: {', '.join(valid_extensions)}"
            )

    # Save to temp file
    tmp_path = None
    try:
        # Determine file extension
        filename = audio_file.filename or "audio.m4a"
        _, ext = os.path.splitext(filename)
        if not ext:
            ext = ".m4a"

        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await audio_file.read()

            # Check file size (max 25MB for Whisper)
            if len(content) > 25 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="Audio file too large. Maximum size is 25MB."
                )

            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe using OpenAI
        import openai

        client = openai.OpenAI(api_key=api_config.OPENAI_API_KEY)

        logger.info(f"Transcribing audio file: {filename} ({len(content)} bytes)")

        with open(tmp_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language=language,
            )

        logger.info(f"Transcription successful: {len(transcript.text)} chars")

        return {
            "transcription": transcript.text,
            "confidence": 0.95,  # Whisper doesn't return confidence
            "language": language,
        }

    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=502,
            detail="Speech transcription service error. Please try again."
        )
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to transcribe audio."
        )
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
