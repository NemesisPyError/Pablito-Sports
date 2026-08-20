# 12_DEPLOY.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Guía de Despliegue y Operación |
| **Código** | 12 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 09/08/2026 |
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

---

# 6. Topología de despliegue

```
Internet
   │
   ▼
[ Nginx :443 ]
   │
   ├──▶ React build estático ──▶ / (SPA routes)
   │
   ├──▶ Imágenes ──▶ /uploads/* ──▶ volumen persistente
   │
   ├──▶ API ──▶ /api/v1/* ──▶ Gunicorn ──▶ Flask
   │                              │
   │                              ▼
   │                         [ PostgreSQL ]
   │
   └──▶ SEO ──▶ /_seo/* ──▶ Gunicorn ──▶ Flask
```

## 6.1 Componentes

| Componente | Tecnología | Rol |
|---|---|---|
| Proxy inverso / servidor estático | Nginx | Termina TLS, sirve estáticos e imágenes, enruta a API y SEO (`AD-04`). |
| Frontend | React build estático | Catálogo comercial y panel de administración. |
| Servidor WSGI | Gunicorn | Ejecuta Flask con múltiples workers. |
| Backend | Flask | API JSON y endpoints SEO. |
| Base de datos | PostgreSQL | Persistencia de datos. |
| Almacenamiento de imágenes | Volumen persistente | Archivos originales y derivados (`AD-05`, `AD-38`, `AD-39`). |
| Certificados TLS | Let's Encrypt u otro proveedor | HTTPS obligatorio (`RNF-12`). |

## 6.2 Comunicación entre componentes

| Origen | Destino | Protocolo | Puerto |
|---|---|---|---|
| Cliente | Nginx | HTTPS | 443 |
| Nginx | React estático | Sistema de archivos | — |
| Nginx | Volumen de imágenes | Sistema de archivos | — |
| Nginx | Gunicorn | HTTP | 8000 |
| Gunicorn | PostgreSQL | TCP | 5432 |

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

## 14.2 Opcionales

| Variable | Entornos | Descripción | Ejemplo |
|---|---|---|---|
| `CORS_ORIGINS` | Producción | Orígenes permitidos. | `https://pablito.example.com` |
| `SENTRY_DSN` | Producción | Trazabilidad de errores. | — |

## 14.3 Gestión de secretos

- Los secretos nunca se guardan en el repositorio (`03_SEGURIDAD.md` §18).
- En producción se usan variables de entorno inyectadas por el sistema de despliegue.
- En local/testing se usan archivos `.env` fuera del control de versiones.

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
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains`. |
| Secretos fuera del repositorio | Variables de entorno (`03_SEGURIDAD.md` §18). |
| Usuario no root | Gunicorn y Nginx ejecutan con usuarios dedicados. |
| Permisos mínimos del volumen | Backend escribe en `UPLOAD_FOLDER`; Nginx solo lee. |
| Headers de seguridad | Configurados en Nginx (`03_SEGURIDAD.md` §12). |
| CSP | Política restrictiva (`03_SEGURIDAD.md` §12). |
| Actualización de dependencias | Revisión de vulnerabilidades antes de cada release. |
| Acceso SSH | Solo por clave, usuario no root, acceso restringido. |

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
