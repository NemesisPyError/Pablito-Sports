#!/usr/bin/env bash
# Fase 0 — rollback de código a una imagen anterior (12_DEPLOY.md §12).
#
# Uso:   scripts/prod/rollback.sh <IMAGE_TAG_anterior>
#        o:  PREVIOUS_IMAGE_TAG=<sha> scripts/prod/rollback.sh
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PREV="${1:-${PREVIOUS_IMAGE_TAG:-}}"
if [ -z "$PREV" ]; then
  echo "uso: scripts/prod/rollback.sh <IMAGE_TAG_anterior>" >&2
  echo "     (o export PREVIOUS_IMAGE_TAG=<sha>)" >&2
  echo
  echo "Imágenes disponibles:"
  docker image ls --format '  {{.Repository}}:{{.Tag}}  ({{.CreatedSince}})' | grep -E 'pablito-(backend|nginx)' || true
  exit 1
fi

echo "== Rollback a IMAGE_TAG=$PREV =="
IMAGE_TAG="$PREV" "${COMPOSE[@]}" up -d

cat <<'EOF'

Rollback de CÓDIGO hecho. Sobre la BASE DE DATOS (12_DEPLOY.md §12):

  - Si la última migración era REVERSIBLE y su downgrade() se probó en staging:
        docker compose -f docker-compose.prod.yml --env-file .env.production \
          run --rm migrate flask db downgrade

  - Si era IRREVERSIBLE o no hay backup verificado reciente:
        NO se hace downgrade. Restaurar el backup previo:
        scripts/prod/restore-db.sh backups/<archivo-previo>.dump

  Regla: el esquema y el código deben quedar consistentes entre sí.
EOF
