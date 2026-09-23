#!/usr/bin/env bash
# Fase 0 — compila el SPA y construye la imagen del backend.
#
# Uso:   scripts/prod/build.sh
# Env:   ENV_FILE (por defecto .env.production), IMAGE_TAG (por defecto SHA de git)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

echo "== 1/2  Compilando frontend -> frontend/dist/ (contenedor Node efímero) =="
"${COMPOSE[@]}" --profile build run --rm frontend-build

if [ ! -f "$REPO_ROOT/frontend/dist/index.html" ]; then
  echo "ERROR: no se generó frontend/dist/index.html" >&2
  exit 1
fi

echo "== 2/2  Construyendo imagen backend (IMAGE_TAG=$IMAGE_TAG, requirements/prod.txt) =="
"${COMPOSE[@]}" build backend

echo
echo "OK. Frontend compilado y imagen pablito-backend:$IMAGE_TAG lista."
