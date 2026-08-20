# Backend image: Flask served by Gunicorn (12_DEPLOY.md §6.1)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libpq is required by psycopg2; curl is used by the container health check.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Optional trust anchors for networks that inspect TLS (corporate proxy, antivirus).
# Drop .crt files into backend/certs/ — the directory is empty and gitignored by default.
COPY certs/ /usr/local/share/ca-certificates/extra/
RUN update-ca-certificates
ENV PIP_CERT=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

ARG REQUIREMENTS=requirements/dev.txt
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r ${REQUIREMENTS}

COPY . .

# 12_DEPLOY.md §18: services run as a dedicated non-root user.
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /var/lib/pablito/uploads \
    && chown -R appuser:appuser /app /var/lib/pablito
USER appuser

EXPOSE 8000

# Request logging is handled by RequestLoggingMiddleware (10_BACKEND.md §11).
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--error-logfile", "-", "wsgi:application"]
