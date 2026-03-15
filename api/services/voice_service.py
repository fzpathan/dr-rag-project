"""
Voice transcription service using faster-whisper.
Supports Hindi and Marathi with automatic translation to English.
"""
import logging
import os
import tempfile
from functools import lru_cache

logger = logging.getLogger(__name__)

# Lazy import to avoid crash if faster-whisper isn't installed yet
_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
            cache_dir = os.environ.get("WHISPER_CACHE_DIR", "/app/whisper_models")
            logger.info("Loading Whisper base model (int8, CPU)...")
            _model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8",
                download_root=cache_dir,
            )
            logger.info("Whisper model loaded.")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    return _model


# Maps language codes sent by the frontend to Whisper language codes
LANGUAGE_MAP = {
    "auto": None,    # None = auto-detect
    "hi": "hi",     # Hindi
    "mr": "mr",     # Marathi
    "en": "en",     # English
}


async def transcribe_audio(audio_bytes: bytes, language: str = "auto") -> dict:
    """
    Transcribe audio bytes to English text.

    Uses task="translate" so Hindi/Marathi speech is returned as English text.

    Args:
        audio_bytes: Raw audio file bytes (webm, mp4, wav, etc.)
        language: Language hint — "auto", "hi", "mr", or "en"

    Returns:
        dict with keys: text (English), detected_language, duration
    """
    model = _get_model()
    whisper_lang = LANGUAGE_MAP.get(language, None)

    # Write to a temp file (faster-whisper requires a file path)
    suffix = ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=whisper_lang,
            task="translate",   # Always produce English output
            beam_size=5,
            vad_filter=True,    # Skip silence
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return {
            "text": text,
            "detected_language": info.language,
            "duration": round(info.duration, 2),
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
