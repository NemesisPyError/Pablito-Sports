#!/usr/bin/env bash
# Fase 0 — restaura un backup de PostgreSQL (12_DEPLOY.md §12, §13).
#
# Uso:   scripts/prod/restore-db.sh <archivo.dump> [db_destino]
#        Sin db_destino: restaura sobre la base de producción (REEMPLAZA datos).
#        Con db_destino: crea/usa esa base (para pruebas de restauración).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DUMP="${1:?uso: restore-db.sh <archivo.dump> [db_destino]}"
TARGET_DB="${2:-}"

[ -f "$DUMP" ] || { echo "ERROR: no existe $DUMP" >&2; exit 1; }

if [ -z "$TARGET_DB" ]; then
  echo "ATENCIÓN: vas a restaurar '$DUMP' SOBRE LA BASE DE PRODUCCIÓN."
  echo "Esto REEMPLAZA los datos actuales. Hacé un backup antes si no lo tenés."
  printf "Escribí 'restaurar' para continuar: "
  read -r ans
  [ "$ans" = "restaurar" ] || { echo "Abortado."; exit 1; }
  cat "$DUMP" | "${COMPOSE[@]}" exec -T postgres \
    sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
else
  echo "Restaurando '$DUMP' en la base '$TARGET_DB' ..."
  "${COMPOSE[@]}" exec -T postgres sh -c \
    "createdb -U \"\$POSTGRES_USER\" \"$TARGET_DB\" 2>/dev/null || true"
  cat "$DUMP" | "${COMPOSE[@]}" exec -T postgres \
    sh -c "pg_restore --clean --if-exists --no-owner -U \"\$POSTGRES_USER\" -d \"$TARGET_DB\""
fi

echo "OK restauración completada."
