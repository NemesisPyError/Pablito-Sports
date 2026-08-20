#!/usr/bin/env bash
# Detiene el entorno local. Los volúmenes persisten salvo que se pase --volumes.
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose down "$@"
