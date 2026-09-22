# Frontend image for local development: Vite dev server behind Nginx.
FROM node:20-alpine

WORKDIR /app

# Optional trust anchors for networks that inspect TLS (corporate proxy, antivirus).
# Drop .crt files into frontend/certs/ — the directory is empty and gitignored by default.
COPY certs/ /usr/local/share/ca-certificates/extra/
RUN cat /etc/ssl/certs/ca-certificates.crt /usr/local/share/ca-certificates/extra/*.crt \
    > /usr/local/share/ca-bundle.crt 2>/dev/null \
    || cp /etc/ssl/certs/ca-certificates.crt /usr/local/share/ca-bundle.crt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-bundle.crt

# 12_DEPLOY.md §18 (S-12): el servidor de desarrollo no necesita root.
#
# La imagen `node` ya trae el usuario `node` (uid 1000); lo que faltaba era
# usarlo. Antes, `npm`, Vite y esbuild corrían los tres como root.
#
# El `chown` y el `USER` van **antes** de `npm install` a propósito: en el
# compose, `/app/node_modules` es un volumen con nombre, y Docker lo inicializa
# copiando lo que la imagen tenga en esa ruta **con su dueño**. Si se instalara
# como root, el volumen nacería root y el proceso `node` no podría escribir su
# caché (`node_modules/.vite`).
#
# Las capas anteriores (paquetes del sistema, certificados) sí necesitan root y
# quedan arriba, ya ejecutadas.
RUN chown -R node:node /app
USER node

COPY --chown=node:node package.json package-lock.json* ./
RUN npm install

COPY --chown=node:node . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
