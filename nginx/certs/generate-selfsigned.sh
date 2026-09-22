#!/usr/bin/env sh
# Certificado autofirmado para PROBAR docker-compose.prod.yml en local (Fase 0).
#
# NO usar en un VPS real: ahí va Let's Encrypt o el Origin Certificate de
# Cloudflare (03_SEGURIDAD.md §G, 12_DEPLOY.md).
#
# Uso:   sh nginx/certs/generate-selfsigned.sh [CN]     (CN por defecto: localhost)
# Salida: nginx/certs/fullchain.pem  +  nginx/certs/privkey.pem  (gitignoreados)
#
# Corre OpenSSL dentro de un contenedor, para no depender de que el host lo tenga.
set -eu

# Git-Bash en Windows convierte rutas tipo `/certs` a rutas del host; esto lo evita.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

DIR="$(cd "$(dirname "$0")" && pwd)"
CN="${1:-localhost}"

echo "Generando cert autofirmado (CN=${CN}) en ${DIR} ..."
docker run --rm -v "${DIR}:/certs" alpine sh -c "
  apk add --no-cache openssl >/dev/null &&
  cd /certs &&
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout privkey.pem -out fullchain.pem -days 365 \
    -subj '/CN=${CN}' \
    -addext 'subjectAltName=DNS:${CN},DNS:localhost,IP:127.0.0.1'
"

echo "Listo:"
echo "  ${DIR}/fullchain.pem"
echo "  ${DIR}/privkey.pem"
echo "(gitignoreados — no se versionan)"
