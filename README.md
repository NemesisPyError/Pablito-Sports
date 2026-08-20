# Pablito Sports

Plataforma de catálogo comercial. La venta se cierra por WhatsApp; el sistema no
procesa pagos (`DV-01`, `DV-02`).

Este README es **operativo**: cubre cómo levantar y verificar el entorno local.
Las decisiones de negocio, arquitectura, API, datos, seguridad y despliegue viven
en `docs/` y son la autoridad del proyecto.

---

## 1. Documentación

| Documento | Contenido |
|---|---|
| [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) | Fases de implementación y entregables verificables. |
| [`docs/99_AI_DEVELOPMENT_GUIDE.md`](docs/99_AI_DEVELOPMENT_GUIDE.md) | Reglas obligatorias antes de escribir código. |
| [`docs/12_DEPLOY.md`](docs/12_DEPLOY.md) | Topología, variables de entorno, health checks, backups. |
| [`docs/10_BACKEND.md`](docs/10_BACKEND.md) | Capas, carpetas y convenciones del backend. |
| [`docs/06_FRONTEND.md`](docs/06_FRONTEND.md) | Estructura y stack del frontend. |
| [`docs/13_CHANGELOG.md`](docs/13_CHANGELOG.md) | Registro de cambios del proyecto. |

> **Antes de programar:** leé `docs/99_AI_DEVELOPMENT_GUIDE.md` §5 (orden de
> lectura obligatorio) y §7 (qué se puede y qué no se puede modificar).

---

## 2. Requisitos

| Herramienta | Versión mínima |
|---|---|
| Docker Engine | 24 |
| Docker Compose | v2 |

No hace falta instalar Python ni Node en la máquina: todo corre en contenedores.

---

## 3. Arranque local

```bash
cp .env.example .env
```

Editá `.env` y generá un `SECRET_KEY` propio:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Levantá el entorno:

```bash
docker compose up -d --build
```

O con el script equivalente:

```bash
bash scripts/dev_up.sh
```

### Servicios

| Servicio | Descripción | URL / puerto |
|---|---|---|
| `nginx` | Proxy inverso; única puerta de entrada. | http://localhost:8080 |
| `frontend` | Vite dev server (React 18 + Bootstrap 5.3). | interno `5173` |
| `backend` | Gunicorn + Flask. | interno `8000` |
| `postgres` | PostgreSQL 16 con volumen persistente. | `localhost:5432` |

Todo el tráfico se consume por Nginx (`AD-04`). El enrutamiento local es:

```
/            → Vite dev server (SPA + HMR)
/api/v1/*    → backend
/_seo/*      → backend
/health/*    → backend
/uploads/*   → volumen persistente de imágenes (solo lectura)
```

---

## 4. Verificación

```bash
bash scripts/health_check.sh
```

Salida esperada:

```
OK    /health/live -> 200
OK    /health/ready -> 200
OK    / -> 200
```

Comprobaciones manuales equivalentes:

```bash
curl http://localhost:8080/health/live
```

```bash
curl http://localhost:8080/health/ready
```

`/health/ready` devuelve `200` solo si la base de datos responde, el esquema
aplicado coincide con las migraciones en disco y el volumen de imágenes acepta
escritura (`12_DEPLOY.md` §10.2). En cualquier otro caso devuelve `503`.

---

## 5. Base de datos y migraciones

El esquema se modifica **solo** mediante migraciones de Alembic, nunca a mano
(`04_BASE_DATOS.md` §11.2).

Generar una migración a partir de los modelos:

```bash
docker compose exec backend flask db migrate -m "create_products_table"
```

Revisá siempre el archivo generado en `backend/migrations/versions/` antes de
aplicarlo. Toda migración debe tener `downgrade()` probado (`AI-03`).

Aplicar y revertir:

```bash
docker compose exec backend flask db upgrade
```

```bash
docker compose exec backend flask db downgrade -1
```

Estado actual del esquema:

```bash
docker compose exec backend flask db current
```

Acceso directo a PostgreSQL:

```bash
docker compose exec postgres psql -U pablito -d pablito
```

La base `pablito_test` se crea automáticamente al inicializar el volumen y es la
que usa `TEST_DATABASE_URL`.

---

## 6. Lint y formato

Backend:

```bash
docker compose exec backend ruff check .
```

```bash
docker compose exec backend black .
```

Frontend:

```bash
docker compose exec frontend npm run lint
```

```bash
docker compose exec frontend npm run format
```

Estos son exactamente los pasos que ejecuta la CI (`.github/workflows/ci.yml`).

---

## 7. Build de producción del frontend

```bash
docker compose exec frontend npm run build
```

---

## 8. Operaciones frecuentes

Ver logs:

```bash
docker compose logs -f backend
```

Detener sin perder datos:

```bash
bash scripts/dev_down.sh
```

Detener y borrar volúmenes (**destruye la base de datos y las imágenes locales**):

```bash
bash scripts/dev_down.sh --volumes
```

Tras cambiar dependencias de `frontend/package.json`, refrescá el volumen de
`node_modules`:

```bash
docker compose down frontend && docker volume rm pablitosports_frontend_node_modules && docker compose up -d --build frontend
```

---

## 9. Estructura del repositorio

```
.
├── backend/          # Flask + SQLAlchemy + Alembic (10_BACKEND.md §9)
│   ├── app/          # factory, capas de la aplicación
│   ├── migrations/   # Alembic
│   ├── requirements/ # base.txt, dev.txt, prod.txt
│   └── tests/        # unit/, integration/, fixtures/
├── frontend/         # React 18 + Vite + Bootstrap (06_FRONTEND.md §7.1)
│   └── src/          # app/, routes/, features/, shared/
├── nginx/            # configuración del proxy inverso
├── scripts/          # utilidades de desarrollo y arranque
├── tests/            # E2E y smoke transversales
├── docs/             # documentación aprobada (solo lectura para la IA)
└── docker-compose.yml
```

---

## 10. Redes con inspección TLS

Si tu red o antivirus intercepta HTTPS, `pip` y `npm` fallarán durante el build
con `CERTIFICATE_VERIFY_FAILED`. Copiá el certificado raíz del interceptor en
`backend/certs/` y `frontend/certs/` (extensión `.crt`) y volvé a construir. Esos
archivos están en `.gitignore` y no se versionan.

---

## 11. Reglas no negociables

- Los documentos de `docs/` aprobados no se modifican (`AI-01`). La excepción es
  `docs/13_CHANGELOG.md`.
- No se crean reglas `RN-xx`, decisiones `AD-xx`, `BK-xx`, `UDS-xx` ni `COMP-xx`
  sin aprobación humana.
- Ningún secreto se versiona (`03_SEGURIDAD.md` §18). `.env` está en `.gitignore`.
- Los datos de negocio se eliminan de forma lógica, nunca física (`AD-18`).
