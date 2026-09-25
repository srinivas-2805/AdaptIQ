"""
Speech Service:
- Speech-to-Text via Whisper (with deterministic mock fallback)
- Text-to-Speech (TTS) for the AI interviewer's voice
- Audio feature analysis (speaking speed WPM, filler words, pauses, clarity score)
"""
import io
import re
import math
from typing import Dict, Any, Optional
from app.config import MOCK_MODE, WHISPER_MODEL, OPENAI_API_KEY

_client = None
if not MOCK_MODE and OPENAI_API_KEY:
    try:
        from openai import OpenAI
        _client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        _client = None

FILLER_WORDS = [
    "um", "uh", "like", "actually", "basically", "you know",
    "sort of", "kind of", "literally", "honestly", "i mean", "right"
]


def transcribe_audio(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Transcribes audio using OpenAI Whisper if configured; otherwise provides fallback."""
    if _client is not None:
        try:
            audio_file = io.BytesIO(file_bytes)
            audio_file.name = filename or "audio.webm"
            transcript = _client.audio.transcriptions.create(model=WHISPER_MODEL, file=audio_file)
            return {
                "text": transcript.text,
                "note": "Transcribed with OpenAI Whisper",
                "success": True
            }
        except Exception as e:
            return {
                "text": "",
                "note": f"Whisper error: {str(e)}. Please check OPENAI_API_KEY or type your answer.",
                "success": False
            }

    return {
        "text": "",
        "note": "MOCK_MODE: Live OpenAI Whisper transcription is offline. "
                "Use the live browser Web Speech recognition or type your answer.",
        "success": False
    }


def synthesize_speech(text: str, voice: str = "alloy") -> bytes:
    """Generates speech audio using OpenAI TTS API if key is present."""
    if _client is not None:
        try:
            response = _client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            return response.read()
        except Exception:
            pass

    # Fallback: empty bytes (browser will use Web Speech Synthesis)
    return b""


def analyze_speech_features(text: str, duration_seconds: Optional[float] = None) -> Dict[str, Any]:
    """
    Analyzes communication and acoustic features:
    - Words per minute (WPM)
    - Filler words count and list
    - Estimated pause frequency
    - Clarity score (0-100)
    """
    cleaned = text.strip()
    words = re.findall(r"\b[A-Za-z0-9'-]+\b", cleaned)
    word_count = len(words)

    # Estimate duration if not provided: ~140 wpm standard talking speed
    if not duration_seconds or duration_seconds <= 0:
        duration_seconds = max((word_count / 140.0) * 60.0, 3.0)

    minutes = max(duration_seconds / 60.0, 0.05)
    wpm = round(word_count / minutes)

    # Detect filler words
    lower_text = cleaned.lower()
    detected_fillers = {}
    total_fillers = 0
    for filler in FILLER_WORDS:
        count = len(re.findall(r"\b" + re.escape(filler) + r"\b", lower_text))
        if count > 0:
            detected_fillers[filler] = count
            total_fillers += count

    # Estimated pauses based on sentence boundaries, ellipses, and commas
    pause_indicators = len(re.findall(r"[,;:\.\?!]|\.{3}", cleaned))
    # Approximate ~1 pause per punctuation mark + long gaps
    estimated_pauses = max(pause_indicators, int(duration_seconds // 8))

    # Calculate clarity score
    # Ideal WPM is 120-160. Penalize <90 (too sluggish) or >190 (too rushed)
    pacing_score = 100
    if wpm < 110:
        pacing_score -= min((110 - wpm) * 0.8, 40)
    elif wpm > 170:
        pacing_score -= min((wpm - 170) * 0.8, 40)

    # Filler word penalty: >3 fillers degrades clarity
    filler_ratio = (total_fillers / max(word_count, 1)) * 100
    filler_penalty = min(filler_ratio * 4.0, 45)

    clarity_score = int(max(min(pacing_score - filler_penalty, 100), 20))

    # Diagnostic voice notes
    notes = []
    if 120 <= wpm <= 165:
        notes.append("Optimal speaking pace (120-165 WPM).")
    elif wpm < 120:
        notes.append(f"Slightly deliberate pace ({wpm} WPM) - try answering with more momentum.")
    else:
        notes.append(f"Fast pace ({wpm} WPM) - slow down slightly to allow your points to land.")

    if total_fillers == 0:
        notes.append("Zero filler words detected - crisp and concise delivery.")
    elif total_fillers <= 2:
        notes.append(f"Low filler count ({total_fillers}) - good verbal control.")
    else:
        notes.append(f"Detected {total_fillers} filler words ({', '.join(detected_fillers.keys())}) - replace fillers with intentional pauses.")

    return {
        "wordCount": word_count,
        "durationSeconds": round(duration_seconds, 1),
        "speakingSpeedWpm": wpm,
        "fillerWordCount": total_fillers,
        "fillerBreakdown": detected_fillers,
        "pauseCount": estimated_pauses,
        "clarityScore": clarity_score,
        "notes": " ".join(notes)
    }
