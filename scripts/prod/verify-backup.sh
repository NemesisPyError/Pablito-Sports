#!/usr/bin/env bash
# Fase 0 — verifica un backup restaurándolo en una base efímera (12_DEPLOY.md §13.2).
# "Un backup que no se ha restaurado exitosamente no se considera backup."
#
# Uso:   scripts/prod/verify-backup.sh <archivo.dump> [originals.tar.gz]
#        El segundo argumento (opcional) valida también el respaldo de imágenes.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DUMP="${1:?uso: verify-backup.sh <archivo.dump> [originals.tar.gz]}"
UPLOADS="${2:-}"
[ -f "$DUMP" ] || { echo "ERROR: no existe $DUMP" >&2; exit 1; }
[ -z "$UPLOADS" ] || [ -f "$UPLOADS" ] || { echo "ERROR: no existe $UPLOADS" >&2; exit 1; }

SCRATCH="verify_$(date -u +%s)"

# La base efímera se borra siempre, también si la restauración falla a mitad de
# camino: con `set -e`, sin esto quedaría una base `verify_*` huérfana por cada
# intento fallido.
cleanup() {
  "${COMPOSE[@]}" exec -T postgres sh -c \
    "dropdb -U \"\$POSTGRES_USER\" --if-exists \"$SCRATCH\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== Restaurando '$DUMP' en base efímera '$SCRATCH' =="

"${COMPOSE[@]}" exec -T postgres sh -c \
  "dropdb -U \"\$POSTGRES_USER\" --if-exists \"$SCRATCH\"; createdb -U \"\$POSTGRES_USER\" \"$SCRATCH\""

cat "$DUMP" | "${COMPOSE[@]}" exec -T postgres \
  sh -c "pg_restore --no-owner -U \"\$POSTGRES_USER\" -d \"$SCRATCH\""

scalar() {
  "${COMPOSE[@]}" exec -T postgres sh -c \
    "psql -tAX -U \"\$POSTGRES_USER\" -d \"$SCRATCH\" -c \"$1\""
}

echo "== Chequeos de humo =="
PRODUCTS="$(scalar 'SELECT count(*) FROM products;')"
ADMINS="$(scalar 'SELECT count(*) FROM administrators;')"
echo "products=$PRODUCTS"
echo "alembic_version=$(scalar 'SELECT version_num FROM alembic_version;')"
echo "administrators=$ADMINS"

# Un dump de una base vacía restaura sin error y pasaría por «backup válido».
# Sin administradores nadie podría entrar al panel tras restaurar.
[ "$ADMINS" -ge 1 ] || { echo "ERROR: el backup no trae ningún administrador." >&2; exit 1; }
[ "$PRODUCTS" -ge 1 ] || echo "AVISO: el backup no trae productos (¿es una base recién creada?)."

if [ -n "$UPLOADS" ]; then
  echo "== Imágenes originales: '$UPLOADS' =="
  gzip -t "$UPLOADS"
  FILES="$(tar -tzf "$UPLOADS" | grep -vc '/$' || true)"
  echo "archivos=$FILES"
  [ "$FILES" -ge 1 ] || echo "AVISO: el respaldo de imágenes no trae ningún archivo."
fi

echo "== Limpieza =="
cleanup
trap - EXIT

echo
echo "OK — backup verificado. Registrar fecha y resultado (12_DEPLOY.md §13.2)."
