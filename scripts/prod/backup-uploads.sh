#!/usr/bin/env bash
# Fase 0 — backup de las imágenes ORIGINALES (12_DEPLOY.md §13.1).
#
# Uso:   scripts/prod/backup-uploads.sh
# Env:   BACKUP_DIR (por defecto ./backups)
#
# Sólo se respalda `originals/`: es lo único irrecuperable (AD-38). Los
# derivados (`derivatives/`) los sirve Nginx y se regeneran desde los originales
# con `scripts/rebuild_image_derivatives.py`, así que no van en el archivo.
#
# Sin este script, restaurar la base tras perder el servidor devuelve el
# catálogo con todas las fotos rotas: los productos existen, sus imágenes no.
#
# Mismo criterio que `backup-db.sh`: archivo temporal, se valida y recién
# entonces se renombra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/pablito-originals-${TS}.tar.gz"
TMP="$FILE.partial"
trap 'rm -f "$TMP"' EXIT

echo "Empaquetando las imágenes originales en $FILE ..."
"${COMPOSE[@]}" exec -T backend \
  sh -c 'tar -C "$UPLOAD_FOLDER" -czf - originals' > "$TMP"

[ -s "$TMP" ] || { echo "ERROR: el archivo salió vacío." >&2; exit 1; }
gzip -t "$TMP" || { echo "ERROR: el archivo comprimido está dañado." >&2; exit 1; }
COUNT="$(tar -tzf "$TMP" | grep -vc '/$' || true)"

mv "$TMP" "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "OK  $FILE  ($SIZE, $COUNT archivos)"
echo
echo "PENDIENTE (12_DEPLOY.md §13.4): copiar este archivo OFF-SITE, igual que el dump."
echo "Restaurar: docker compose ... exec -T backend sh -c 'tar -C \"\$UPLOAD_FOLDER\" -xzf -' < $FILE"
echo "y luego regenerar los derivados: scripts/rebuild_image_derivatives.py"
