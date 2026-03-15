"""
Voice transcription router.
POST /api/v1/voice/transcribe — accepts an audio file, returns English text.
"""
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from api.dependencies import get_current_user
from api.database import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25 MB guard


class TranscribeResponse(BaseModel):
    text: str
    detected_language: str
    duration: float


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(..., description="Audio file (webm / mp4 / wav / ogg)"),
    language: str = Form("auto", description="Language hint: auto | hi | mr | en"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe uploaded audio to English text.

    Whisper's translate task converts Hindi / Marathi speech directly to English,
    which is then used as the query text in the RAG pipeline.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25 MB)")
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        from api.services.voice_service import transcribe_audio
        result = await transcribe_audio(audio_bytes, language=language)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Voice service not available. Please ensure faster-whisper is installed.",
        )
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    if not result["text"]:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    return TranscribeResponse(**result)
