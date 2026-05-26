import os
import shlex
import subprocess
import tempfile
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl


class TranscriptionRequest(BaseModel):
    recordingId: str
    storagePath: str
    signedUrl: HttpUrl
    mimeType: str | None = None
    durationMs: int | None = None


class TranscriptionResponse(BaseModel):
    text: str
    language: str | None = None


app = FastAPI(title="Voxa STT Service")


@app.get("/health")
async def health():
    return {"status": "ok", "provider": provider_name()}


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(request: TranscriptionRequest):
    if provider_name() == "mock":
        return TranscriptionResponse(
            text=f"Mock transcript for recording {request.recordingId}.",
            language=os.getenv("STT_MOCK_LANGUAGE", "ru"),
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        audio_path = Path(temp_dir) / audio_file_name(request)
        await download_audio(str(request.signedUrl), audio_path)

        text = run_transcription_command(audio_path, Path(temp_dir) / "transcript")
        if not text.strip():
            raise HTTPException(status_code=502, detail="STT command returned an empty transcript.")

        return TranscriptionResponse(text=text.strip(), language=os.getenv("STT_LANGUAGE"))


def provider_name() -> str:
    return os.getenv("STT_SERVICE_PROVIDER", "mock").strip().lower()


def audio_file_name(request: TranscriptionRequest) -> str:
    extension = ".m4a"
    if request.mimeType == "audio/wav":
        extension = ".wav"
    if request.mimeType == "audio/mpeg":
        extension = ".mp3"

    return f"{request.recordingId}{extension}"


async def download_audio(signed_url: str, audio_path: Path) -> None:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(signed_url)

    if not response.is_success:
        raise HTTPException(status_code=502, detail=f"Audio download failed with status {response.status_code}.")

    audio_path.write_bytes(response.content)


def run_transcription_command(audio_path: Path, output_path: Path) -> str:
    command_template = os.getenv("STT_COMMAND")
    if not command_template:
        raise HTTPException(status_code=500, detail="STT_COMMAND is required when STT_SERVICE_PROVIDER is not mock.")

    command = command_template.format(audio_path=audio_path, output_path=output_path)
    completed = subprocess.run(
        shlex.split(command),
        check=False,
        capture_output=True,
        text=True,
        timeout=int(os.getenv("STT_COMMAND_TIMEOUT_SECONDS", "300")),
    )

    if completed.returncode != 0:
        raise HTTPException(status_code=502, detail=completed.stderr.strip() or "STT command failed.")

    transcript_file = output_path.with_suffix(".txt")
    if transcript_file.exists():
        return transcript_file.read_text(encoding="utf-8")

    return completed.stdout
