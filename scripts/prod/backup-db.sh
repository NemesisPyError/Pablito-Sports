#!/usr/bin/env bash
# Fase 0 — backup lógico de PostgreSQL (12_DEPLOY.md §13).
#
# Uso:   scripts/prod/backup-db.sh
# Env:   BACKUP_DIR (por defecto ./backups)
#
# Formato custom de pg_dump (-Fc): comprimido y restaurable selectivamente.
#
# El volcado se escribe a un archivo temporal y sólo se renombra al nombre
# definitivo cuando `pg_restore --list` lo puede leer. Así una falla a mitad de
# camino (contenedor caído, disco lleno) nunca deja en `backups/` un `.dump`
# vacío o cortado que parezca un backup válido.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/pablito-db-${TS}.dump"
TMP="$FILE.partial"
trap 'rm -f "$TMP"' EXIT

echo "Volcando la base a $FILE ..."
"${COMPOSE[@]}" exec -T postgres \
  sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$TMP"

[ -s "$TMP" ] || { echo "ERROR: el volcado salió vacío." >&2; exit 1; }
"${COMPOSE[@]}" exec -T postgres pg_restore --list < "$TMP" >/dev/null \
  || { echo "ERROR: el volcado no es un archivo pg_dump legible." >&2; exit 1; }

mv "$TMP" "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "OK  $FILE  ($SIZE)"
echo
echo "PENDIENTE (12_DEPLOY.md §13.4): copiar este archivo a un almacenamiento"
echo "OFF-SITE (S3/R2 o segundo host). Un backup solo en el mismo VPS no cuenta."
echo "Verificar con: scripts/prod/verify-backup.sh $FILE"
echo "Las imágenes se respaldan aparte: scripts/prod/backup-uploads.sh"
