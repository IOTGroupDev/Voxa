#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <audio_path> <output_path>" >&2
  exit 2
fi

AUDIO_PATH="$1"
OUTPUT_PATH="$2"
IMAGE="${STT_DOCKER_IMAGE:-ghcr.io/ggml-org/whisper.cpp:main-cuda-86c40c3bd6fc86f1187fb751d111b49e0fc18e84}"
MODEL_PATH="${STT_DOCKER_MODEL_PATH:-$(pwd)/models/ggml-base.bin}"
LANGUAGE="${STT_LANGUAGE:-auto}"
THREADS="${STT_THREADS:-4}"
GPU_ARGS=()
SANITIZED_AUDIO="$(mktemp --suffix=.m4a)"
CONVERTED_AUDIO="$(mktemp --suffix=.wav)"

if [ ! -f "$AUDIO_PATH" ]; then
  echo "Audio file not found: $AUDIO_PATH" >&2
  exit 2
fi

if [ ! -f "$MODEL_PATH" ]; then
  echo "Model file not found: $MODEL_PATH" >&2
  exit 2
fi

if [ "${STT_DOCKER_GPU:-0}" = "1" ]; then
  GPU_ARGS=(--gpus all)
fi

container_id="$(
  docker create "${GPU_ARGS[@]}" \
    --entrypoint bash \
    "$IMAGE" \
    -lc "
      set -euo pipefail
      /app/build/bin/whisper-cli \
        -m /model.bin \
        -f /audio.wav \
        -l '$LANGUAGE' \
        -t '$THREADS' \
        -otxt \
        -of /transcript \
        -np
    "
)"

cleanup() {
  rm -f "$SANITIZED_AUDIO" "$CONVERTED_AUDIO"
  docker rm -f "$container_id" >/dev/null 2>&1 || true
}
trap cleanup EXIT

python3 - "$AUDIO_PATH" "$SANITIZED_AUDIO" <<'PY'
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
data = bytearray(source.read_bytes())
index = 0

while True:
    index = data.find(b"chnl", index)
    if index == -1:
        break

    if index >= 4:
        size = int.from_bytes(data[index - 4:index], "big")
        if 8 <= size <= 4096:
            data[index:index + 4] = b"free"

    index += 4

target.write_bytes(data)
PY

ffmpeg -y -hide_banner -loglevel error \
  -i "$SANITIZED_AUDIO" \
  -ar 16000 \
  -ac 1 \
  -c:a pcm_s16le \
  "$CONVERTED_AUDIO"

docker cp "$CONVERTED_AUDIO" "$container_id:/audio.wav"
docker cp "$MODEL_PATH" "$container_id:/model.bin"
docker start -a "$container_id"
docker cp "$container_id:/transcript.txt" "${OUTPUT_PATH}.txt"
