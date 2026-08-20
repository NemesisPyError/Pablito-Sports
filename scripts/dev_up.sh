#!/usr/bin/env bash
# Arranca el entorno local completo (12_DEPLOY.md §5, entorno `local`).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No existe .env. Copiando desde .env.example..."
  cp .env.example .env
  echo "Revisá .env y establecé un SECRET_KEY propio antes de continuar."
fi

docker compose up -d --build
docker compose ps
