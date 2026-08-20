#!/usr/bin/env bash
# Verifica los health checks y el frontend a través de Nginx (12_DEPLOY.md §10).
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="${1:-http://localhost:${NGINX_PORT:-8080}}"
failed=0

check() {
  local path="$1"
  local expected="$2"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${path}")"
  if [ "$status" = "$expected" ]; then
    echo "OK    ${path} -> ${status}"
  else
    echo "FALLA ${path} -> ${status} (esperado ${expected})"
    failed=1
  fi
}

check "/health/live" 200
check "/health/ready" 200
check "/" 200

echo
echo "GET ${BASE_URL}/health/ready:"
curl -s "${BASE_URL}/health/ready"
echo

exit "$failed"
