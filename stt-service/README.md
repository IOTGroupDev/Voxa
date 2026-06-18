# Voxa STT Service

Small HTTP service for the backend `STT_PROVIDER=whisper_http` contract.

## Run

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
STT_HTTP_ENDPOINT=http://127.0.0.1:8002/transcribe
```

## Run CLI Mode

Set `STT_SERVICE_PROVIDER=command` and provide `STT_COMMAND`.

## Run With Docker whisper.cpp

The project includes `whisper-docker.sh`, a wrapper for the Docker image. It mounts the temporary audio directory into the container, converts unsupported formats such as `m4a` to `wav`, then runs `whisper-cli`.

Pull the image:

```bash
docker pull ghcr.io/ggml-org/whisper.cpp:main-cuda-86c40c3bd6fc86f1187fb751d111b49e0fc18e84
```

For Russian/multilingual recognition, download a non-`.en` model:

```bash
mkdir -p models
docker run --rm \
  -v "$PWD/models:/models" \
  --entrypoint sh \
  ghcr.io/ggml-org/whisper.cpp:main-cuda-86c40c3bd6fc86f1187fb751d111b49e0fc18e84 \
  -lc '/app/models/download-ggml-model.sh base /models'
```

Run STT:

```bash
export STT_SERVICE_PROVIDER=command
export STT_COMMAND='./whisper-docker.sh {audio_path} {output_path}'
export STT_DOCKER_MODEL_PATH="$PWD/models/ggml-base.bin"
export STT_LANGUAGE=ru
uvicorn main:app --host 127.0.0.1 --port 8002
```

Enable GPU if Docker has NVIDIA runtime configured:

```bash
export STT_DOCKER_GPU=1
```

Health check:

```bash
curl http://127.0.0.1:8002/health
```

Example for a directly installed `whisper.cpp` CLI command:

```bash
export STT_SERVICE_PROVIDER=command
export STT_COMMAND='whisper-cli -m ./models/ggml-base.bin -f {audio_path} -otxt -of {output_path}'
uvicorn main:app --host 0.0.0.0 --port 8001
```

The command may write `{output_path}.txt` or print the transcript to stdout.
If the CLI does not accept `m4a`, convert to `wav` before calling it, or make the command point to a wrapper script that does conversion and transcription.
