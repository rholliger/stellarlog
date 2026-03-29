"""
Transcription service using OpenAI Whisper API.
Roy's already got an OpenAI key (used in First Light).
Cost: ~$0.006/min of audio. Negligible.
"""

import os
import httpx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def transcribe_audio(audio_path: str) -> str:
    """
    Sends audio file to Whisper API and returns transcript.
    """
    if not OPENAI_API_KEY:
        return _mock_transcript()

    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    with open(audio_path, "rb") as f:
        files = {"file": f}
        data = {"model": "whisper-1", "language": "en"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            resp.raise_for_status()
            result = resp.json()
            return result.get("text", "").strip()


def _mock_transcript() -> str:
    return "[Transcription unavailable — set OPENAI_API_KEY environment variable]"
