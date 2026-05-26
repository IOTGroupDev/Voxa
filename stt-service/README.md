# Voxa STT Service

Small HTTP service for the backend `STT_PROVIDER=whisper_http` contract.

## Run Mock Mode

```bash
cd stt-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

Backend env:

```txt
STT_PROVIDER=whisper_http
STT_HTTP_ENDPOINT=http://localhost:8001/transcribe
```

## Run CLI Mode

Set `STT_SERVICE_PROVIDER` to any value except `mock` and provide `STT_COMMAND`.

Example for a `whisper.cpp`-style CLI command:

```bash
export STT_SERVICE_PROVIDER=whisper_cpp
export STT_COMMAND='whisper-cli -m ./models/ggml-base.bin -f {audio_path} -otxt -of {output_path}'
uvicorn main:app --host 0.0.0.0 --port 8001
```

The command may write `{output_path}.txt` or print the transcript to stdout.
If the CLI does not accept `m4a`, convert to `wav` before calling it, or make the command point to a wrapper script that does conversion and transcription.
