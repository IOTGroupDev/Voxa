import base64
import os
import shlex
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel


class SynthesizeRequest(BaseModel):
    text: str
    language: str | None = None
    speaker: int | None = None
    outputFormat: str | None = "wav"


class SynthesizeResponse(BaseModel):
    audioBase64: str
    mimeType: str
    provider: str
    language: str | None = None


app = FastAPI(title="Voxa TTS Service")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "provider": "piper",
        "model": model_path(),
    }


@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required.")
    if len(text) > int(os.getenv("PIPER_MAX_TEXT_CHARS", "1200")):
        raise HTTPException(status_code=400, detail="text is too long.")

    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir) / "speech.wav"
        run_piper(text, output_path, request.speaker)
        audio = output_path.read_bytes()

    return SynthesizeResponse(
        audioBase64=base64.b64encode(audio).decode("ascii"),
        mimeType="audio/wav",
        provider="piper",
        language=request.language or os.getenv("PIPER_LANGUAGE"),
    )


@app.post("/synthesize.wav")
async def synthesize_wav(request: SynthesizeRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required.")

    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir) / "speech.wav"
        run_piper(text, output_path, request.speaker)
        return Response(content=output_path.read_bytes(), media_type="audio/wav")


def model_path() -> str:
    value = os.getenv("PIPER_MODEL_PATH")
    if not value:
        raise HTTPException(status_code=500, detail="PIPER_MODEL_PATH is required.")
    return value


def config_path() -> str | None:
    value = os.getenv("PIPER_CONFIG_PATH")
    return value or None


def run_piper(text: str, output_path: Path, speaker: int | None) -> None:
    command = [
        os.getenv("PIPER_BIN", "piper"),
        "--model",
        model_path(),
        "--output_file",
        str(output_path),
    ]
    if config_path():
        command.extend(["--config", config_path() or ""])
    if speaker is not None:
        command.extend(["--speaker", str(speaker)])

    completed = subprocess.run(
        command,
        input=text,
        check=False,
        capture_output=True,
        text=True,
        timeout=int(os.getenv("PIPER_TIMEOUT_SECONDS", "60")),
    )

    if completed.returncode != 0:
        safe_command = " ".join(shlex.quote(part) for part in command)
        raise HTTPException(
            status_code=502,
            detail=completed.stderr.strip() or f"Piper command failed: {safe_command}",
        )
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise HTTPException(status_code=502, detail="Piper returned an empty audio file.")
