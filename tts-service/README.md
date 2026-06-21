# Voxa TTS Service

Local HTTP TTS service backed by Piper.

## Install

```bash
cd tts-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Models

Store Piper voices in `tts-service/models`.

Recommended Russian voice:

```bash
mkdir -p models
curl -L -o models/ru_RU-irina-medium.onnx \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx
curl -L -o models/ru_RU-irina-medium.onnx.json \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx.json
```

Optional English voice:

```bash
curl -L -o models/en_US-lessac-medium.onnx \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
curl -L -o models/en_US-lessac-medium.onnx.json \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

## Run

```bash
export PIPER_BIN="$PWD/.venv/bin/piper"
export PIPER_MODEL_PATH="$PWD/models/ru_RU-irina-medium.onnx"
export PIPER_CONFIG_PATH="$PWD/models/ru_RU-irina-medium.onnx.json"
export PIPER_LANGUAGE=ru
uvicorn main:app --host 127.0.0.1 --port 8003
```

## Backend env

```txt
TTS_PROVIDER=piper_http
TTS_HTTP_ENDPOINT=http://127.0.0.1:8003/synthesize
```

## Test

```bash
curl http://127.0.0.1:8003/health

curl -X POST http://127.0.0.1:8003/synthesize.wav \
  -H 'content-type: application/json' \
  -d '{"text":"Voxa запомнила это.","language":"ru"}' \
  --output /tmp/voxa-piper.wav
```
