#!/usr/bin/env bash
# Fase 0 — despliegue Recreate (12_DEPLOY.md §12).
#
#   backup verificado -> migraciones -> up -> readiness -> smoke -> listo
#   cualquier fallo -> rollback y salida != 0
#
# Uso:   scripts/prod/build.sh && scripts/prod/deploy.sh
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

echo "===================== DEPLOY  (IMAGE_TAG=$IMAGE_TAG) ====================="

echo "== 1/5  Backup =="
scripts/prod/backup-db.sh

echo "== 2/5  Migraciones (flask db upgrade) — revisadas, nunca destructivas automáticas =="
"${COMPOSE[@]}" run --rm migrate

echo "== 3/5  Levantando servicios =="
"${COMPOSE[@]}" up -d

echo "== 4/5  Esperando /health/ready estable (>=30s) =="
stable=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T backend curl -fsS http://127.0.0.1:8000/health/ready >/dev/null 2>&1; then
    stable=$((stable + 1))
    [ "$stable" -ge 6 ] && break
  else
    stable=0
  fi
  sleep 5
done
if [ "$stable" -lt 6 ]; then
  echo "readiness NO se estabilizó -> rollback"
  scripts/prod/rollback.sh || true
  exit 1
fi

echo "== 5/5  Smoke tests por HTTPS =="
base="https://localhost"
fail=0
for probe in "/health/live 200" "/health/ready 200" "/ 200"; do
  set -- $probe
  code="$("${COMPOSE[@]}" exec -T nginx wget --no-check-certificate -q -O /dev/null -S "$base$1" 2>&1 | awk '/HTTP\//{print $2; exit}')"
  code="${code:-000}"
  if [ "$code" = "$2" ]; then echo "OK    $1 -> $code"; else echo "FALLA $1 -> $code (esperado $2)"; fail=1; fi
done
if [ "$fail" -ne 0 ]; then
  echo "smoke FALLA -> rollback"
  scripts/prod/rollback.sh || true
  exit 1
fi

echo
echo "===================== DEPLOY OK  (IMAGE_TAG=$IMAGE_TAG) ================="
echo "Anotar este IMAGE_TAG: es el 'anterior' para el próximo rollback."
