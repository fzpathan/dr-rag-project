"""
Speech-to-text endpoints.
"""
from fastapi import APIRouter, Depends, File, UploadFile, Form

from api.models.query import SpeechTranscribeResponse
from api.services.speech_service import transcribe_audio
from api.dependencies import get_current_user

router = APIRouter(prefix="/speech", tags=["Speech"])


@router.post("/transcribe", response_model=SpeechTranscribeResponse)
async def transcribe(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Form(default="en", description="Language code (e.g., 'en', 'hi', 'de')"),
    current_user=Depends(get_current_user),
):
    """
    Transcribe audio to text using OpenAI Whisper.

    - **audio**: Audio file (mp3, wav, m4a, webm, ogg, flac) - max 25MB
    - **language**: Language code (default: 'en')

    Returns the transcribed text.
    """
    result = await transcribe_audio(audio, language)

    return SpeechTranscribeResponse(
        transcription=result["transcription"],
        confidence=result["confidence"],
        language=result["language"],
    )
