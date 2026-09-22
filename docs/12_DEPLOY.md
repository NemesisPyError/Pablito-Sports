# 12_DEPLOY.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Guía de Despliegue y Operación |
| **Código** | 12 |
| **Versión** | 1.3.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 31/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [03_SEGURIDAD.md](03_SEGURIDAD.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09_COMPONENTES.md](09_COMPONENTES.md) ✅ · [10_BACKEND.md](10_BACKEND.md) ✅ · [11_TESTING.md](11_TESTING.md) ✅ · [12.0_DEPLOY_ANALISIS_PREVIO.md](12.0_DEPLOY_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `99_AI_DEVELOPMENT_GUIDE.md`, `IMPLEMENTATION_ROADMAP.md`, `13_CHANGELOG.md` |

---

# 2. Objetivo

## 2.1 Propósito

Este documento es la **autoridad única** sobre cómo se despliega, opera, monitorea y recupera Pablito Sports en producción. Materializa las decisiones arquitectónicas aprobadas (`AD-04`, `AD-05`, `AD-11`, `AD-37`, `AD-38`, `AD-39`) y las decisiones de implementación de backend (`BK-01` a `BK-04`) en un procedimiento operativo ejecutable.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Topología de despliegue | `02_ARQUITECTURA.md` |
| Estrategia de release | — |
| Orden de despliegue seguro | — |
| Migraciones de base de datos en producción | `04_BASE_DATOS.md` |
| Health checks y smoke tests | `11_TESTING.md` |
| Rollback de aplicación y datos | — |
| Backups, retención y verificación | `02_ARQUITECTURA.md` §12.12 |
| Variables de entorno | `10_BACKEND.md` §3.2 |
| Observabilidad post-deploy | — |
| Seguridad de despliegue | `03_SEGURIDAD.md` |

## 2.3 Principios rectores

1. **Simplicidad operativa antes que sofisticación.** Se prefiere una solución que una persona pueda ejecutar y diagnosticar (`PA-11`).
2. **Recuperación verificada.** Un backup que no se ha restaurado exitosamente no se considera backup.
3. **Cambios reversibles.** Las migraciones de base de datos deben ser reversibles salvo aprobación explícita.
4. **Separación de responsabilidades.** Nginx sirve estáticos e imágenes; Gunicorn ejecuta la lógica de negocio; PostgreSQL persiste.
5. **Mínimo privilegio.** Los servicios ejecutan con usuarios dedicados y permisos restringidos.

---

# 3. Alcance

## 3.1 Incluye

- Topología de producción con Nginx, Gunicorn, Flask, React, PostgreSQL y volumen de imágenes.
- Estrategia de despliegue **Recreate** con ventana de mantenimiento.
- Orden de despliegue seguro.
- Reglas de migración **expand/contract**.
- Health checks `liveness` y `readiness`.
- Smoke tests post-deploy.
- Rollback de aplicación y de base de datos.
- Backups diarios de base de datos e imágenes originales.
- Variables de entorno obligatorias y opcionales.
- Observabilidad post-deploy.
- Criterios de éxito y rollback automático.
- Seguridad de despliegue.

## 3.2 No incluye (v1)

| Fuera de alcance v1 | Razón |
|---|---|
| Kubernetes u orquestación compleja | Sobredimensión para una sola instancia (`PA-11`). |
| Blue/Green o Canary | Requieren infraestructura duplicada y tráfico dividido. |
| CDN externo o S3/Cloudinary | Punto de extensión; v1 usa volumen persistente local (`DPL-04`). |
| Recuperación ante desastres detallada (DR) | Fuera del presupuesto operativo de v1. |
| SIEM centralizado | Volumen de logs no lo justifica (`DPL-06`). |

## 3.3 Relación con el Architecture Freeze

`02_ARQUITECTURA.md` v1.0.0 está congelado. Este documento **no introduce arquitectura nueva**; solo concreta la operación, el despliegue y la recuperación de decisiones ya aprobadas.

---

# 4. Definiciones

| Término | Definición en este documento |
|---|---|
| **Recreate** | Estrategia de despliegue que detiene la versión actual, aplica cambios y arranca la nueva versión. |
| **Expand/contract** | Patrón de migración que añade estructuras nuevas en una release y elimina las viejas en una release posterior. |
| **Health check liveness** | Verificación de que el proceso está vivo. |
| **Health check readiness** | Verificación de que la aplicación puede atender tráfico. |
| **Smoke test** | Prueba rápida de que las funciones críticas funcionan tras un despliegue. |
| **Rollback** | Proceso de restaurar la versión anterior de un componente o de los datos. |
| **RPO** | Recovery Point Objective: máxima pérdida de datos aceptable. |
| **RTO** | Recovery Time Objective: tiempo máximo aceptable para restaurar el servicio. |

---

# 5. Entornos

| Entorno | Propósito | Infraestructura | Datos |
|---|---|---|---|
| **local** | Desarrollo individual. | Docker Compose en máquina del desarrollador. | Fixtures y datos de prueba. |
| **testing** | Ejecución de tests automatizados. | Similar a local; base de datos dedicada. | Generados por tests; se recrean. |
| **staging** | Validación previa a producción. | Similar a producción (`DPL-02`). | Subconjunto anónimo o fixtures realistas. |
| **production** | Servicio real de clientes. | VPS único con Docker Compose (`DPL-07`). | Datos reales; respaldados diariamente. |

### 5.1 Reglas de entornos

- **Ningún secreto de producción se usa en staging, testing o local.**
- **Staging debe reflejar producción en versión de SO, PostgreSQL, Nginx y Python.**
- **Los datos de staging nunca contienen información personal real.**
- **Una release solo pasa a producción si smoke tests y checks pasaron en staging.**

### 5.2 Estado (Fase 0)

- **local** y **testing**: operativos (`docker-compose.yml`).
- **production**: los **artefactos** existen y se prueban en local
  (`docker-compose.prod.yml`, `nginx/prod/`, `scripts/prod/`), pero **no hay VPS
  ni dominio desplegado todavía**. El paso a un VPS real y a Cloudflare son fases
  posteriores.
- **staging** = una copia de `docker-compose.prod.yml` sin Cloudflare; se
  levanta cuando exista el VPS.

---

# 6. Topología de despliegue

```
Internet
   │
   ▼
[ Cloudflare :443 ]  ── WAF · rate limiting · mitigación DDoS (03_SEGURIDAD.md §23)
   │  (FASE POSTERIOR — no existe todavía; Fase 0 llega hasta Nginx)
   ▼
[ Nginx :443 ]  (docker-compose.prod.yml · nginx/prod/default.conf.template)
   │   TLS · server_tokens off · client_max_body_size 6m · errores JSON AD-16
   │
   ├──▶ SPA compilado (frontend/dist/) ──▶ /  ·  /assets/* (cache 1 año)
   │
   ├──▶ Imágenes ──▶ /uploads/* ──▶ volumen uploads_data (RO)
   │
   ├──▶ API ──▶ /api/v1/* ──▶ Gunicorn (1 worker) ──▶ Flask (FLASK_ENV=production)
   │                              │
   │                              ▼
   │                         [ PostgreSQL 16 ]  volumen postgres_data · sin puertos publicados
   │
   └──▶ SEO ──▶ /_seo/*, robots.txt, sitemap.xml ──▶ Gunicorn ──▶ Flask
```

**Fase 0** materializa desde `[ Nginx :443 ]` hacia abajo, con `docker-compose.prod.yml`.
Cloudflare y la protección del origen son una fase posterior (`03_SEGURIDAD.md` §23).

## 6.1 Componentes

| Componente | Tecnología | Rol | Artefacto (Fase 0) |
|---|---|---|---|
| Borde / CDN / WAF | Cloudflare | Primera barrera en producción: WAF, *rate limiting* de *edge*, mitigación DDoS, caché del estático (§6.3, `03_SEGURIDAD.md` §23). | *(fase posterior)* |
| Proxy inverso / servidor estático | Nginx `1.27-alpine` | Termina TLS, sirve el SPA compilado y las imágenes, enruta a API y SEO (`AD-04`). | `nginx/prod/default.conf.template` (renderizado por `envsubst`) |
| Frontend | React build estático (`npm run build` → `frontend/dist/`) | Catálogo comercial y panel. Servido por Nginx desde disco, **sin Vite dev server**. | `frontend/dist/` (bind-mount RO en Nginx) |
| Servidor WSGI | Gunicorn | Ejecuta Flask. **1 worker** en el arranque (decisión Fase 0, `03_SEGURIDAD.md` §14.4), sin `--reload`. | imagen `pablito-backend:<tag>` (`requirements/prod.txt`) |
| Backend | Flask | API JSON y endpoints SEO. `FLASK_ENV=production`. | idem |
| Base de datos | PostgreSQL `16-alpine` | Persistencia. Sin `ports:` publicados. | volumen `postgres_data` |
| Almacenamiento de imágenes | Volumen persistente | Originales y derivados (`AD-05`, `AD-38`, `AD-39`). | volumen `uploads_data` |
| Certificados TLS | Let's Encrypt o *Origin Certificate* de Cloudflare | HTTPS obligatorio (`RNF-12`). En local: autofirmado (`nginx/certs/generate-selfsigned.sh`). | `nginx/certs/*.pem` (gitignoreados) |
| Orquestación | Docker Compose | `docker-compose.prod.yml` (separado del de desarrollo). | — |

Scripts de operación: `scripts/prod/` (`build`, `deploy`, `backup-db`, `restore-db`, `verify-backup`, `rollback`).

## 6.2 Comunicación entre componentes

| Origen | Destino | Protocolo | Puerto |
|---|---|---|---|
| Cliente | Cloudflare | HTTPS | 443 |
| Cloudflare | Nginx (origen) | HTTPS | 443 |
| Nginx | React estático | Sistema de archivos | — |
| Nginx | Volumen de imágenes | Sistema de archivos | — |
| Nginx | Gunicorn | HTTP | 8000 |
| Gunicorn | PostgreSQL | TCP | 5432 |

## 6.3 Cloudflare (capa de borde)

En producción, Cloudflare se sitúa **delante** de Nginx como primera barrera:
`Cliente → Cloudflare → Nginx → Gunicorn`. La especificación completa de reglas
(WAF, *rate limiting*, *challenges*, restauración de IP) vive en
`03_SEGURIDAD.md` §23; aquí se listan solo los puntos que tocan al despliegue.

| Punto | Acción de despliegue |
|---|---|
| **IP de origen oculta** | El firewall del VPS acepta `:443` **solo** desde los rangos publicados de Cloudflare. Sin esto, un atacante que descubra la IP puentea toda la capa. |
| **Modo SSL/TLS** | *Full (strict)*: Nginx sigue terminando TLS con su propio certificado (Let's Encrypt o *Origin Certificate* de Cloudflare). |
| **IP real del visitante** | Cloudflare añade un salto de proxy. Se pone `TRUSTED_PROXY_COUNT=2` **en el mismo despliegue** que activa el modo *proxy*; si no, el *rate limiting* por IP del backend deja de discriminar (todo el tráfico parece venir de Cloudflare). Opcionalmente, el módulo `ngx_http_realip_module` de Nginx con los rangos de Cloudflare y `CF-Connecting-IP`. |
| **Caché** | *Bypass* para `/api/v1/*`; el estático de React sí se cachea en el *edge*. |
| **Sin dependencia de arranque** | Cloudflare es configuración externa: la aplicación arranca y funciona igual accedida directo por Nginx (staging sin Cloudflare, sondas internas). |
| **Credenciales** | La cuenta de Cloudflare y cualquier token de API se tratan como secretos (`03_SEGURIDAD.md` §18) y se protegen con 2FA. |

> **La configuración de Cloudflare no está versionada en este repositorio.** Se
> aplica en el panel de Cloudflare y se registra en el runbook de operaciones.
> Una iteración futura puede llevarla a Terraform.

---

# 7. Estrategia de despliegue

## 7.1 Decisión: Recreate para v1

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-01` |
| **Decisión** | En v1 se usa despliegue **Recreate**: se detiene el tráfico, se realiza backup verificado, se aplican migraciones, se despliega la nueva versión, se verifican health checks y smoke tests, y se habilita el tráfico. |
| **Justificación** | Pablito Sports v1 se ejecuta en una sola instancia con tráfico predecible. Blue/Green y Canary requieren infraestructura duplicada y lógica de enrutamiento que no se justifica. |
| **Consecuencias** | Existe una ventana de mantenimiento breve. Los despliegues se planifican fuera del horario comercial. |

## 7.2 Alternativas descartadas

| Estrategia | Estado | Razón |
|---|---|---|
| Blue/Green | Descartada | Doble infraestructura y sincronización de BD no justificadas. |
| Canary | Descartada | Requiere división de tráfico y métricas avanzadas. |
| Rolling | Reservada para v2 | Viable cuando existan múltiples instancias y health checks maduros. |

## 7.3 Ventana de mantenimiento

- Los despliegues en producción se programan en horarios de bajo tráfico.
- Se informa con antelación a los administradores.
- El downtime objetivo es menor a 5 minutos una vez iniciado el despliegue.

---

# 8. Orden de despliegue

El siguiente orden debe ejecutarse secuencialmente. Si un paso falla, se detiene el proceso y se evalúa rollback.

```
1. Backup verificado de base de datos e imágenes
        ↓
2. Aplicar migraciones de base de datos (expand/contract)
        ↓
3. Desplegar backend (Gunicorn + Flask)
        ↓
4. Verificar health checks del backend
        ↓
5. Desplegar frontend (build estático)
        ↓
6. Recargar configuración de Nginx
        ↓
7. Ejecutar smoke tests
        ↓
8. Habilitar tráfico / quitar mantenimiento
        ↓
9. Observar métricas durante 15–30 minutos
```

## 8.1 Reglas del orden

- **Las migraciones se aplican antes de arrancar la nueva versión del backend.**
- **El frontend no se despliega hasta que el backend pase los health checks.**
- **Nginx no se recarga hasta que el build estático esté completo y consistente.**
- **El tráfico no se habilita hasta que los smoke tests pasen.**

---

# 9. Migraciones y expand/contract

## 9.1 Responsabilidad

- Las migraciones se escriben con Alembic y se versionan en el repositorio (`04_BASE_DATOS.md`).
- Solo migraciones revisadas y probadas en staging se ejecutan en producción.
- Cada migración debe declarar si es **reversible** o **irreversible**.

## 9.2 Reglas de migración segura

| Prohibición | Razón |
|---|---|
| No renombrar columnas en una sola release. | El código anterior puede seguir leyendo el nombre viejo. |
| No eliminar columnas usadas por código activo. | Rompe la versión desplegada. |
| No cambiar tipos incompatibles directamente. | Puede causar pérdida o corrupción de datos. |
| No aplicar migraciones destructivas sin aprobación. | `02_ARQUITECTURA.md` §12.12. |

## 9.3 Patrón expand/contract

### Ejemplo: cambio de columna

```sql
-- Release N (expand)
ALTER TABLE products ADD COLUMN list_price_v2 INTEGER;
UPDATE products SET list_price_v2 = list_price;

-- Release N+1 (contract)
-- Una vez que todo el código usa list_price_v2
ALTER TABLE products DROP COLUMN list_price;
ALTER TABLE products RENAME COLUMN list_price_v2 TO list_price;
```

## 9.4 Reversibilidad

- **Toda migración que modifique datos debe incluir un `downgrade` probado.**
- **Las migraciones irreversibles requieren aprobación explícita por escrito y backup verificado.**
- **No se asume que una migración es reversible solo porque Alembic genera `downgrade()`.** El equipo debe probarla en staging.

## 9.5 Ejecución en producción (Fase 0)

- **Nunca automática.** El servicio `migrate` de `docker-compose.prod.yml` tiene
  `profiles: ["tools"]` — no arranca con `up`. Lo invoca el operador (o
  `scripts/prod/deploy.sh` como paso 2 del Recreate):

  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate
  ```

  Comando fijo del servicio: `flask db upgrade`. Nunca `flask db downgrade`
  automático.

- `/health/ready` incluye `check_schema_is_current()`: si el esquema aplicado en
  la base **no** coincide con el `head` del código, devuelve `503` y el deploy no
  habilita tráfico (§10.3).

- **Estado actual del esquema** (verificar antes de cada release):
  `flask db current` == `flask db heads` == `b99b11955f25`; `flask db check` →
  *"No new upgrade operations detected"*. Cuando exista producción, la primera
  `flask db upgrade` debe dejar la base **exactamente** en ese `head`.

---

# 10. Health checks

## 10.1 Liveness

| Check | Método | Respuesta esperada |
|---|---|---|
| Proceso de Gunicorn responde | `GET /health/live` | HTTP 200 en menos de 1 s |

```json
// GET /health/live
{
  "status": "ok"
}
```

## 10.2 Readiness

| Check | Método | Respuesta esperada |
|---|---|---|
| Conexión a PostgreSQL | Query de prueba | Conexión exitosa |
| Migraciones compatibles | Versión de esquema vs. código | Coinciden |
| Storage de imágenes accesible | Lectura/escritura de archivo de prueba | Operación exitosa |

```json
// GET /health/ready
{
  "status": "ok",
  "checks": {
    "database": true,
    "migrations": true,
    "storage": true
  }
}
```

## 10.3 Uso en el despliegue

- Antes de habilitar tráfico, `readiness` debe devolver HTTP 200 durante al menos 30 segundos consecutivos.
- Si `readiness` falla después de habilitar tráfico durante más de 2 minutos, se activa rollback automático.

---

# 11. Smoke tests post-deploy

Tras cada despliegue en producción se ejecuta la siguiente lista mínima de smoke tests.

| # | Ruta / Acción | Propósito |
|---|---|---|
| 1 | `GET /` | Página principal accesible. |
| 2 | `GET /catalogo` | Listado de productos. |
| 3 | `GET /producto/{slug}` | Ficha de producto. |
| 4 | `GET /api/v1/products` | API pública de productos. |
| 5 | `POST /api/v1/admin/auth/login` | Login administrativo. |
| 6 | `GET /api/v1/admin/dashboard` | Panel administrativo. |
| 7 | `POST /api/v1/admin/products/{id}/images` | Subida de imagen. |
| 8 | `POST /api/v1/cart/revalidate` | Revalidación de carrito. |
| 9 | `GET /_seo/products/{slug}` | Metadatos para rastreadores. |

## 11.1 Reglas de smoke tests

- Se ejecutan automáticamente como paso final del despliegue.
- Si cualquier test crítico falla, se activa rollback automático.
- La lista puede extenderse en `11_TESTING.md` si surgen nuevos flujos críticos.

---

# 12. Rollback

## 12.1 Alcance del rollback automático

El rollback automático aplica a:

- **Frontend:** restaurar build estático anterior.
- **Backend:** restaurar imagen o código anterior y reiniciar Gunicorn.
- **Nginx:** recargar configuración anterior si cambió.

## 12.2 Rollback de base de datos

**No todas las migraciones son reversibles.** El rollback de base de datos solo se ejecuta si se cumplen **ambas** condiciones:

1. La migración fue **marcada como reversible** y su `downgrade()` fue probado en staging.
2. Existe un **backup verificado** de la base de datos tomado antes del despliegue.

Si la migración es irreversible o no hay backup verificado, **no se hace rollback de base de datos**; se restaura desde backup.

## 12.3 Procedimiento de rollback de aplicación

```bash
# 1. Habilitar modo mantenimiento
# 2. Restaurar build estático anterior
# 3. Restaurar imagen/código anterior del backend
# 4. Reiniciar Gunicorn
# 5. Ejecutar health checks
# 6. Ejecutar smoke tests
# 7. Quitar modo mantenimiento
```

## 12.4 Procedimiento de rollback de datos

```bash
# 1. Habilitar modo mantenimiento
# 2. Si la migración es reversible:
#      alembic downgrade -1
# 3. Si la migración es irreversible:
#      Restaurar backup verificado
# 4. Verificar esquema y datos críticos
# 5. Ejecutar smoke tests
# 6. Quitar modo mantenimiento
```

## 12.5 Cuándo NO se hace rollback de base de datos

- La migración ya fue exitosa y el código nuevo escribió datos en el nuevo esquema.
- No existe backup verificado reciente.
- El rollback implicaría pérdida de datos de usuarios.
- La migración fue marcada como irreversible.

---

# 13. Backups

## 13.1 Frecuencia y retención

| Origen | Tipo | Frecuencia | Retención |
|---|---|---|---|
| PostgreSQL | Dump lógico (`pg_dump`) | Diario | 30 días |
| Imágenes originales | Copia incremental | Diario | 30 días |
| Derivados de imágenes | Regenerables | Semanal | 7 días |
| Configuración de Nginx | Archivo de configuración | En cada cambio | Últimas 10 versiones |

## 13.2 Verificación

- Cada backup de base de datos se restaura en un entorno aislado al menos una vez por semana.
- Un backup no verificado **no se considera backup** (`02_ARQUITECTURA.md` §12.12).
- Se registra el resultado de cada verificación.

## 13.3 Objetivos de recuperación

| Métrica | Valor |
|---|---|
| **RPO** | 24 horas |
| **RTO** | 4 horas |

## 13.4 Almacenamiento de backups

- Los backups se almacenan en una ubicación separada del servidor de producción.
- Se recomienda copia off-site (servidor secundario o almacenamiento en la nube) como punto de extensión.

---

# 14. Variables de entorno

## 14.1 Obligatorias

| Variable | Entornos | Descripción | Ejemplo |
|---|---|---|---|
| `DATABASE_URL` | Todos | Conexión PostgreSQL. | `postgresql://user:pass@db:5432/pablito` |
| `SECRET_KEY` | Todos | Firma de sesiones y tokens CSRF. | — |
| `SESSION_COOKIE_SECURE` | Todos | `True` en producción, `False` en dev/testing. | `True` |
| `UPLOAD_FOLDER` | Todos | Ruta del volumen de imágenes. | `/var/lib/pablito/uploads` |
| `LOG_LEVEL` | Todos | `DEBUG`, `INFO`, `WARNING`, `ERROR`. | `INFO` |
| `FLASK_ENV` | Todos | `development`, `testing`, `production`. | `production` |
| `TEST_DATABASE_URL` | Testing | Base de datos de pruebas. | `postgresql://.../pablito_test` |

Notas:

- `SESSION_COOKIE_SECURE` en producción lo **fuerza `ProductionConfig` a `True`**;
  la variable se documenta pero no hace falta pasarla en `docker-compose.prod.yml`.
- `TEST_DATABASE_URL` **no** se usa en producción.

## 14.2 Opcionales

| Variable | Entornos | Descripción | Ejemplo |
|---|---|---|---|
| `TRUSTED_PROXY_COUNT` | Todos | Saltos de proxy de confianza delante de Flask (`03_SEGURIDAD.md` §14.2). **`1` = Nginx → Flask — valor de producción en Fase 0.** Pasa a `2` **solo** en la fase Cloudflare (§6.3, `03_SEGURIDAD.md` §23 C7), después de cerrar el firewall del origen. `0` desactiva ProxyFix. | `1` |
| `SITE_BASE_URL` | Producción | Origen público (`https://<dominio>`) para URLs absolutas de Open Graph y sitemap. | `https://ejemplo.com` |
| `NGINX_SERVER_NAME` | Producción | `server_name` de Nginx (envsubst en `nginx/prod/default.conf.template`). | `ejemplo.com` |
| `GUNICORN_WORKERS` | Producción | Workers de Gunicorn. Se queda en `1` por capacidad, no por seguridad: el contador de rate limiting ya es compartido (`03_SEGURIDAD.md` §14.4), así que subirlo ya no multiplica el límite efectivo. | `1` |
| `RATELIMIT_STORAGE_URI` | Todos | Almacén compartido del contador de rate limiting (`03_SEGURIDAD.md` §14.4). **Obligatoria en producción**: la aplicación no arranca si falta o si apunta a `memory://`. | `redis://redis:6379/0` |
| `IMAGE_TAG` | Producción | Tag de las imágenes construidas (rollback). Los scripts usan el SHA corto de git. | `a9edcf8` |
| `SENTRY_DSN` | Producción | Trazabilidad de errores. Vacío = desactivado. | — |
| `CORS_ORIGINS` | — | **Ya no existe (S-11).** Estaba definida pero ningún código la leía. El backend no implementa CORS y todo es mismo-origen (`AD-04`); se retiró de `.env.example` y del compose para que no parezca un control que no es. |  |

## 14.3 Gestión de secretos

- Los secretos nunca se guardan en el repositorio (`03_SEGURIDAD.md` §18).
- **Desarrollo:** `.env` (gitignoreado). Plantilla versionada: `.env.example`.
- **Producción:** `.env.production` (gitignoreado vía `.env.*`). Plantilla
  versionada: **`.env.production.example`** — documenta todas las variables.
  `docker-compose.prod.yml` se invoca siempre con `--env-file .env.production`.
- El `SECRET_KEY` de producción se genera único por entorno
  (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) y jamás se
  reutiliza el de desarrollo. `ProductionConfig.validate()` rechaza placeholders
  y claves de menos de 32 caracteres.

---

# 15. Observabilidad post-deploy

Durante los 15–30 minutos posteriores a un despliegue se monitorea lo siguiente.

| Métrica | Umbral de alerta | Acción |
|---|---|---|
| Errores 5xx | > 1% de peticiones | Investigar; > 5% durante 2 min activa rollback. |
| Latencia p95 API | > 300 ms (`RNF-02`) | Investigar cuello de botella. |
| Errores de conexión a BD | Cualquier pico | Verificar salud de PostgreSQL. |
| Errores de uploads | > 2% de intentos | Verificar volumen de imágenes. |
| Errores de sesión/login | Cualquier pico | Verificar secretos y cookies. |
| Logs de error | Nuevos tipos de error | Revisar trazas. |

## 15.1 Herramientas

| Propósito | Herramienta v1 |
|---|---|
| Logs estructurados | Archivos JSON rotados en servidor. |
| Métricas de aplicación | Logs + scripts de análisis. |
| Alertas | Scripts periódicos + notificación manual. |
| Trazabilidad de errores | Punto de extensión (Sentry). |

## 15.2 Niveles de log

| Nivel | Uso |
|---|---|
| `DEBUG` | Solo desarrollo local. |
| `INFO` | Eventos normales en producción. |
| `WARNING` | Condiciones anómalas no críticas. |
| `ERROR` | Fallos que afectan usuarios o operación. |

---

# 16. Criterios de éxito del despliegue

Un despliegue se considera **exitoso** cuando **todas** las siguientes condiciones se cumplen:

- [ ] Backup verificado completado antes del despliegue.
- [ ] Migraciones aplicadas sin errores.
- [ ] Health check `liveness` devuelve HTTP 200.
- [ ] Health check `readiness` devuelve HTTP 200 durante 30 segundos consecutivos.
- [ ] Todos los smoke tests post-deploy pasan.
- [ ] Tasa de errores 5xx inferior al 1% durante 15 minutos.
- [ ] Latencia p95 inferior a 300 ms (`RNF-02`).
- [ ] Login administrativo funciona.
- [ ] Catálogo navegable.
- [ ] Revalidación de carrito funciona.

---

# 17. Criterios de rollback automático

Se activa rollback automático si ocurre **cualquiera** de las siguientes condiciones:

| Condición | Umbral |
|---|---|
| Tasa de errores 5xx | > 5% durante 2 minutos consecutivos. |
| Readiness falla | > 2 minutos consecutivos. |
| Smoke test crítico falla | Cualquier fallo en login, catálogo o revalidación de carrito. |
| Migración incompatible | El código no arranca por discrepancia de esquema. |
| Error crítico de storage | El backend no puede escribir imágenes. |

---

# 18. Seguridad de despliegue

| Control | Implementación |
|---|---|
| HTTPS obligatorio | Nginx termina TLS. Redirección 80 → 443. |
| HSTS | `Strict-Transport-Security: max-age=86400` en el primer despliegue. Se sube por escalones (semana → mes → año) según el plan de `nginx/hsts`, tras comprobar que la renovación del certificado funciona. |
| Secretos fuera del repositorio | Variables de entorno (`03_SEGURIDAD.md` §18). |
| Usuario no root | Ver §18.1: tabla por servicio, medida. |
| Privilegios del contenedor | `no-new-privileges:true` y `cap_drop: [ALL]` en **todos** los servicios de los dos compose; las capabilities devueltas se midieron una por una (§18.1). |
| Sistema de archivos de sólo lectura | `read_only: true` + `tmpfs /tmp` en `backend` y `migrate` de producción. |
| Permisos mínimos del volumen | Backend escribe en `UPLOAD_FOLDER` como `appuser`; Nginx solo lee. |
| Headers de seguridad | Configurados en Nginx (`03_SEGURIDAD.md` §12); se aplican también en las respuestas de error (`always` + `include security_headers` en los handlers de error). |
| CSP | Política restrictiva (`03_SEGURIDAD.md` §12). |
| Versión de Nginx oculta | `server_tokens off;` — el header `Server` queda en `nginx` sin versión, y las páginas de error por defecto no la muestran. Quitar el header por completo necesitaría el módulo `headers-more` (no incluido en la imagen oficial). |
| Límite de subida | Nginx `client_max_body_size 6m;` alineado con `MAX_CONTENT_LENGTH = 5 MB` de Flask (§19.3): una subida de 5–6 MB llega a Flask y recibe su 413 JSON; por encima la corta Nginx con el **mismo contrato AD-16** (`@error_413`). |
| Páginas de error de Nginx | 413, 502/503/504 y el 404 de `/uploads/*` responden JSON AD-16, no HTML genérico. Los 4xx/5xx JSON del backend pasan intactos (`proxy_intercept_errors` en `off`). |
| Borde / WAF / DDoS | Cloudflare delante de Nginx: WAF gestionado, *rate limiting* de *edge*, mitigación DDoS L3/L4 (`03_SEGURIDAD.md` §23, §6.3). |
| IP de origen | El firewall del VPS solo acepta `:443` desde los rangos de Cloudflare. |
| `TRUSTED_PROXY_COUNT` | `2` en producción con Cloudflare, para que el *rate limiting* por IP del backend siga viendo la IP real. |
| Actualización de dependencias | Revisión de vulnerabilidades antes de cada release. |
| Acceso SSH | Solo por clave, usuario no root, acceso restringido. |

## 18.1 Usuario y privilegios por contenedor (S-12)

Medido con `id`, `ps` y `/proc/1/status` en los contenedores reales de desarrollo
y de producción, no deducido de las imágenes.

| Servicio | Usuario del proceso | UID:GID | ¿Root? | Capabilities efectivas | Justificación |
|---|---|---|---|---|---|
| `backend` | `appuser` | 1000:1000 | No | ninguna | Gunicorn no necesita nada; en producción además con raíz de sólo lectura |
| `migrate` | `appuser` | 1000:1000 | No | ninguna | Alembic sólo escribe en la base |
| `frontend` (dev) | `node` | 1000:1000 | No | ninguna | **Cambiado en S-12**: antes corría todo como root |
| `frontend-build` | `node` | 1000:1000 | No | ninguna | **Cambiado en S-12**: ídem |
| `nginx` | master `root`, workers `nginx` | 0 / 101 | Master sí | `CHOWN`, `SETGID`, `SETUID`, `NET_BIND_SERVICE` | Excepción: liga 80/443 y lee la clave TLS |
| `postgres` | `postgres` | 70 | No (el daemon) | **ninguna** una vez arrancado | El entrypoint usa root un instante y baja de privilegios |
| `redis` | `redis` | 999 | No (el daemon) | **ninguna** una vez arrancado | Ídem |

**Las excepciones son tres y ninguna es por comodidad.** En `nginx`, `postgres` y
`redis` el proceso que atiende la red **ya es no privilegiado**; lo que queda en
root es el arranque de la imagen oficial. Forzar `nginx-unprivileged` obligaría a
cambiar los `listen`, remapear puertos y rehacer el TLS, a cambio de nada que no
dé ya el `cap_drop`.

**Capabilities: se midieron quitándolas.** No se copiaron de la documentación.
Nginx sin `CHOWN` falla con «chown(/var/cache/nginx/client_temp, 101) failed»;
`DAC_OVERRIDE` se probó y **no** hace falta, así que no está. PostgreSQL y Redis
con `cap_drop: ALL` a secas fallan en `chmod` y en `setresuid` con un volumen
nuevo, pero una vez arrancados quedan en `CapEff=0000000000000000`.

**`read_only` sólo donde se comprobó qué escribe cada cosa.** El backend de
producción escribe en dos sitios y sólo dos: el volumen de `UPLOAD_FOLDER` y
`/tmp` —ahí vuelca Werkzeug las subidas que superan el buffer en memoria y
Gunicorn el latido de sus workers—, de modo que basta un `tmpfs`. En desarrollo
**no** se aplica: `/app` es un bind mount donde pytest y ruff escriben sus cachés.

**Nota de despliegue.** `frontend-build` escribe `frontend/dist` en el host por
bind mount. Si el usuario que despliega no es uid 1000, hay que ajustar
`FRONTEND_BUILD_UID`/`FRONTEND_BUILD_GID`. Y si el checkout arrastra un
`node_modules` o un `dist` creados por la versión anterior —que corría como
root—, hay que borrarlos una vez: un proceso no privilegiado no puede
sobrescribirlos.

---

# 19. Archivos y storage

## 19.1 Persistencia de imágenes

- Las imágenes originales y derivadas viven en un **volumen persistente fuera del contenedor** (`AD-05`, `AD-38`, `AD-39`).
- **Nunca** dentro de la imagen Docker.
- El contenedor backend monta el volumen en `UPLOAD_FOLDER`.
- Nginx sirve las imágenes directamente desde el volumen (`AD-04`).

## 19.2 Permisos

| Recurso | Usuario | Permisos |
|---|---|---|
| Código fuente | `appuser` | Solo lectura. |
| Volumen de imágenes | `appuser` / `www-data` | Lectura/escritura backend; lectura Nginx. |
| Logs | `appuser` | Lectura/escritura. |
| Configuración Nginx | `root` (lectura), `www-data` (uso) | Solo lectura para el servicio. |

## 19.3 Límite de tamaño de subida

| Capa | Valor | Rol |
|---|---|---|
| **Flask** (`MAX_CONTENT_LENGTH`, `core/config/base.py`) | **5 MB** | Límite real por archivo (`03_SEGURIDAD.md` §11.1). Corta la petición con `413` JSON antes de materializar nada. |
| **Nginx** (`client_max_body_size`) | **6 MB** | Barrera exterior. El margen de 1 MB cubre el sobre multipart y el resto de campos del formulario, de modo que una subida de 5–6 MB **llega a Flask** y recibe su propio `413`; por encima de 6 MB la corta Nginx. |

Ambas capas responden el mismo sobre `AD-16` con `code: "payload_too_large"`, así
que el cliente no distingue quién cortó. Antes de esta alineación Nginx permitía
16 MB, dejando que archivos de 5–16 MB ocuparan un *worker* solo para ser
rechazados.

---

# 20. Lista de agentes de rastreo

`AD-09` define que el sistema solo permite rastreadores legítimos. La lista de agentes permitidos se mantiene en la configuración de Nginx. Cada actualización de la lista sigue este procedimiento:

1. Modificar el archivo de configuración de Nginx.
2. Probar la configuración con `nginx -t`.
3. Aplicar en staging.
4. Verificar que rastreadores legítimos no se bloquean.
5. Aplicar en producción y recargar Nginx.

Esto cierra el pendiente operativo `ADP-13`.

---

# 21. Decisiones

## DPL-01 — Estrategia de despliegue v1: Recreate

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-01` |
| **Decisión** | En v1 se usa despliegue **Recreate** con ventana de mantenimiento. |
| **Justificación** | Una sola instancia, tráfico predecible, downtime breve aceptable. Blue/Green y Canary son sobredimensión. |
| **Consecuencias** | Ventana de mantenimiento breve planificada fuera de horario comercial. |

## DPL-02 — Entorno de staging intermedio

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-02` |
| **Decisión** | Se implementa un entorno de **staging** con infraestructura similar a producción. |
| **Justificación** | Cierra `AP-01` / `ADP-04`. Permite validar migraciones, rendimiento y smoke tests antes de producción. |
| **Consecuencias** | Costo de infraestructura adicional. Los datos de staging se regeneran desde fixtures. |

## DPL-03 — Backup diario con verificación semanal

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-03` |
| **Decisión** | Backup diario de PostgreSQL e imágenes originales; verificación de restauración semanal. |
| **Justificación** | `RNF-16` y `02_ARQUITECTURA.md` §12.12. Un backup no verificado no es backup. |
| **Consecuencias** | RPO 24h, RTO 4h. |

## DPL-04 — Imágenes en volumen persistente local

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-04` |
| **Decisión** | Las imágenes se almacenan en un volumen persistente local montado en el servidor. |
| **Justificación** | `AD-05`. S3/Cloudinary queda como punto de extensión. |
| **Consecuencias** | El volumen debe incluirse en el backup y persistir ante redeploys. |

## DPL-05 — Docker Compose para orquestación en v1

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-05` |
| **Decisión** | Se usa **Docker Compose** para orquestar Nginx, Gunicorn, PostgreSQL y volumen de imágenes en producción v1. |
| **Justificación** | Suficiente para una sola instancia. Kubernetes es sobredimensión (`PA-11`). |
| **Consecuencias** | El escalado horizontal en v2 requerirá reconsiderar la orquestación. |

## DPL-06 — Logs en archivos estructurados, sin SIEM en v1

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-06` |
| **Decisión** | Los logs se escriben en archivos estructurados JSON en el servidor. No se implementa SIEM en v1. |
| **Justificación** | `OA-09` y `03_SEGURIDAD.md` §15. El volumen de logs no justifica SIEM. |
| **Consecuencias** | Rotación de logs y acceso SSH/SCP para diagnóstico. Punto de extensión para v2. |

## DPL-07 — VPS único con servicios en contenedores

| Campo | Valor |
|---|---|
| **Identificador** | `DPL-07` |
| **Decisión** | Se despliega en un **VPS único** con servicios contenerizados. |
| **Justificación** | Reduce complejidad operativa y costo. El tráfico previsto no requiere servicios separados. |
| **Consecuencias** | El escalado vertical tiene límites; migrar a servicios separados es punto de extensión. |

---

# 22. Trazabilidad

| Elemento aprobado | Se materializa en |
|---|---|
| `AD-04` (Nginx como proxy y servidor de archivos) | Topología §6, seguridad §18. |
| `AD-05` (imágenes fuera de la imagen Docker) | Storage §19, decisiones `DPL-04`. |
| `AD-09` (rastreadores legítimos) | Lista de agentes §20. |
| `AD-11` (PostgreSQL) | Topología §6, backups §13. |
| `AD-37` (Docker para despliegue) | Orquestación `DPL-05`. |
| `AD-38` / `AD-39` (almacenamiento de imágenes) | Storage §19, decisiones `DPL-04`. |
| `PA-11` (simplicidad antes que sofisticación) | Estrategia Recreate `DPL-01`. |
| `RNF-02` (rendimiento) | Umbrales de latencia §15 y §16. |
| `RNF-12` (HTTPS) | Seguridad §18. |
| `RNF-16` (disponibilidad y recuperación) | Backups §13, rollback §12. |
| `BK-01` a `BK-04` (decisiones de backend) | Variables de entorno §14, health checks §10. |

---

# 23. Checklist operativo de despliegue

## 23.1 Antes del despliegue

- [ ] La release pasó todos los tests en `testing`.
- [ ] La release pasó smoke tests en `staging`.
- [ ] Las migraciones fueron probadas en `staging`.
- [ ] Existe backup verificado de producción de menos de 24 h.
- [ ] Las variables de entorno de producción están actualizadas.
- [ ] Se programó la ventana de mantenimiento.

## 23.2 Durante el despliegue

- [ ] Backup verificado de base de datos e imágenes.
- [ ] Migraciones aplicadas.
- [ ] Backend desplegado y health checks pasan.
- [ ] Frontend desplegado.
- [ ] Nginx recargado.
- [ ] Smoke tests ejecutados y aprobados.
- [ ] Tráfico habilitado.

## 23.3 Después del despliegue

- [ ] Observación durante 15–30 minutos.
- [ ] Métricas dentro de umbrales.
- [ ] Sin alertas críticas.
- [ ] Registro de la release en `13_CHANGELOG.md`.

---

# 24. Puntos de extensión

| Extensión | Cuándo considerarla |
|---|---|
| CDN externo | Cuando el tráfico de imágenes supere la capacidad del VPS. |
| S3/Cloudinary | Cuando se requiera alta durabilidad o escala de almacenamiento. |
| Kubernetes | Cuando se requiera alta disponibilidad o escalado horizontal. |
| Blue/Green o Canary | Cuando el downtime de Recreate sea inaceptable. |
| SIEM centralizado | Cuando el volumen de logs requiera correlación avanzada. |

---

# 25. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 09/08/2026 | ✅ APROBADO | Guía formal de despliegue y operación: topología, estrategia Recreate, orden de despliegue, expand/contract, health checks, smoke tests, rollback, backups, variables de entorno, observabilidad, criterios de éxito/rollback, seguridad, storage, decisiones `DPL-01` a `DPL-07`, cierre de `AP-01` / `ADP-04` / `ADP-13`. |
| **1.1.0** | 28/08/2026 | 🟡 EN REVISIÓN | Se añade §6.3 (Cloudflare como capa de borde: IP de origen oculta, SSL *full strict*, restauración de IP real, caché) y la variable opcional `TRUSTED_PROXY_COUNT` (`2` con Cloudflare). Se actualiza la topología (§6), la tabla de componentes (§6.1), la de comunicación (§6.2) y la de seguridad de despliegue (§18). La especificación de reglas WAF/*rate limiting* vive en `03_SEGURIDAD.md` §23. |
| **1.2.0** | 28/08/2026 | 🟡 EN REVISIÓN | **Hardening de Nginx (auditoría E-4).** `server_tokens off;` en dev y en la plantilla de producción (oculta la versión en el header `Server` y en las páginas de error). `client_max_body_size` pasa de 16m a **6m**, alineado con `MAX_CONTENT_LENGTH` de Flask (nueva §19.3). Los errores que genera Nginx (413, 502/503/504, 404 de `/uploads/*`) responden JSON `AD-16` en lugar de HTML genérico, con las cabeceras de seguridad aplicadas; los 4xx/5xx JSON del backend siguen pasando intactos (`proxy_intercept_errors` en `off`). Sin cambios de código backend, frontend, base de datos ni APIs. Cloudflare sigue pendiente (§6.3, `03_SEGURIDAD.md` §23). |
| **1.3.0** | 31/08/2026 | 🟡 EN REVISIÓN | **Fase 0 — preparación de producción.** Artefactos de despliegue: `docker-compose.prod.yml` (sin Vite dev server, sin `--reload`, 1 worker de Gunicorn, servicios `migrate`/`frontend-build` con `profiles`), `nginx/prod/default.conf.template` (config desplegable con TLS, `envsubst` de `server_name`, `upstream`, SPA + `/assets/`, todo lo de E-4), `.env.production.example`, `scripts/prod/*` (build, deploy Recreate, backup, restore, verify-backup, rollback), `nginx/certs/` + generador autofirmado para prueba local. Se actualiza §6/§6.1 (topología y componentes con artefactos), §9.5 (migraciones en prod), §14 (variables de producción, `.env.production`). `nginx/production.conf.example` queda como referencia anotada. **Sin cambios de código, base de datos, migraciones ni del compose de desarrollo.** Probado end-to-end en local con cert autofirmado. Cloudflare y protección del origen: pendientes (§6.3, `03_SEGURIDAD.md` §23). |
