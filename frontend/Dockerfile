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

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
