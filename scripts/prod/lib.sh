#!/usr/bin/env bash
# Definiciones compartidas por los scripts de producción (Fase 0).
# No se ejecuta directamente; se hace `source` desde los demás.
set -euo pipefail

# Raíz del repositorio.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE. Copiá .env.production.example y completá los valores." >&2
  exit 1
fi

COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

git_tag() {
  git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo latest
}

# IMAGE_TAG: el que venga del entorno, o el SHA corto de git, o "latest".
export IMAGE_TAG="${IMAGE_TAG:-$(git_tag)}"
