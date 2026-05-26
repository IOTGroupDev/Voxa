# Server STT

MVP transcription can run on Voxa infrastructure without GPU. Mobile uploads audio, the backend creates a short-lived signed download URL, and the transcription worker calls an HTTP STT service.

## Flow

```txt
Expo app records m4a
-> upload to Supabase Storage
-> NestJS creates transcription AiJob
-> BullMQ worker creates signed download URL
-> HTTP STT service downloads audio
-> whisper.cpp or faster-whisper transcribes on CPU
-> worker stores Transcript
```

## Backend Configuration

```txt
STT_PROVIDER=whisper_http
STT_HTTP_ENDPOINT=http://localhost:8001/transcribe
```

If either value is missing, the backend falls back to the mock STT provider.
The HTTP provider requires Supabase Storage signed download URLs. If storage is not configured, transcription fails explicitly instead of sending a placeholder URL to the STT service.

## Local Service Scaffold

The repo includes `stt-service/` as a minimal FastAPI service that implements the backend HTTP contract.

Mock mode:

```bash
cd stt-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

CLI mode:

```bash
export STT_SERVICE_PROVIDER=whisper_cpp
export STT_COMMAND='whisper-cli -m ./models/ggml-base.bin -f {audio_path} -otxt -of {output_path}'
uvicorn main:app --host 0.0.0.0 --port 8001
```

Use a wrapper script in `STT_COMMAND` if audio needs conversion before transcription.

## HTTP Contract

Request:

```json
{
  "recordingId": "string",
  "storagePath": "user/recordings/recording.m4a",
  "signedUrl": "https://...",
  "mimeType": "audio/mp4",
  "durationMs": 30000
}
```

Response:

```json
{
  "text": "recognized speech",
  "language": "ru"
}
```

## CPU Sizing

- 1-2 vCPU: `tiny` or `base`, short notes.
- 4 vCPU: `base` or `small`, reasonable MVP throughput.
- 8 vCPU: `small` and some `medium`, better queue latency.

Do not use this for always-on recording. Voxa should transcribe short clips after explicit capture.

## Engine Choice

- `whisper.cpp`: simplest CPU-first option, good operational fit for MVP.
- `faster-whisper`: useful if the server is stronger or later gets GPU acceleration.

The NestJS backend should not depend on either engine directly. Keep STT behind the HTTP contract.

## Failure Behavior

- BullMQ retries transcription jobs 3 times with exponential backoff.
- Failed attempts set the `AiJob` status to `retrying` and keep the recording eligible for another attempt.
- The final failed attempt sets the `AiJob` and `Recording` statuses to `failed`, and the memory event processing status to `transcription_failed`.
- Successful transcription stores the transcript, moves the memory event to `transcript_created`, and enqueues classification.
