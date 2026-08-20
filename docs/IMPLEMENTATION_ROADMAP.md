# IMPLEMENTATION_ROADMAP.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Hoja de Ruta de Implementación |
| **Código** | — |
| **Versión** | 1.1.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 09/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [03_SEGURIDAD.md](03_SEGURIDAD.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [05.1_API_DATABASE_CROSS_REVIEW.md](05.1_API_DATABASE_CROSS_REVIEW.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09_COMPONENTES.md](09_COMPONENTES.md) ✅ · [10_BACKEND.md](10_BACKEND.md) ✅ · [11_TESTING.md](11_TESTING.md) ✅ · [12_DEPLOY.md](12_DEPLOY.md) ✅ · [99_AI_DEVELOPMENT_GUIDE.md](99_AI_DEVELOPMENT_GUIDE.md) ✅ |
| **Documentos dependientes** | `13_CHANGELOG.md` |

---

# 2. Objetivo

## 2.1 Propósito

Este documento define la **hoja de ruta operativa y ejecutable** para implementar Pablito Sports v1. No introduce arquitectura, negocio ni contratos nuevos: solo organiza el trabajo de construcción en fases secuenciales, cada una con un entregable verificable.

## 2.2 Qué significa "MVP implementado"

El MVP de Pablito Sports v1 está implementado cuando:

- El backend sirve la API pública y el panel administrativo en `/api/v1/`.
- El frontend muestra el catálogo, el detalle de producto, el carrito y genera mensajes de WhatsApp.
- El panel admin permite gestionar productos, variantes, imágenes, promociones, banners y usuarios.
- La base de datos refleja el esquema aprobado en `04_BASE_DATOS.md`.
- Los contratos de API cumplen `05_API.md`.
- Los controles de seguridad de `03_SEGURIDAD.md` están activos.
- La suite crítica de tests de `11_TESTING.md` está en verde.
- El sistema despliega en staging y producción siguiendo `12_DEPLOY.md`.

## 2.3 Qué queda fuera de v1

| Fuera de v1 | Razón |
|---|---|
| Pasarela de pagos | El negocio opera por WhatsApp; no se requiere checkout online. |
| Sincronización de stock multi-canal | v1 sí maneja stock numérico por variante y descuento manual por venta registrada (`01_ANALISIS_NEGOCIO.md` `RN-39`, `RN-82`, v2.6.0); lo que queda fuera es la sincronización automática con otros canales de venta. |
| Notificaciones push/email | No requerido para el flujo de catálogo + WhatsApp. |
| App móvil nativa | El frontend es web responsive. |
| Analytics avanzado | Punto de extensión; logs básicos son suficientes. |
| Multi-idioma | Español único en v1. |
| CDN/S3 para imágenes | Volumen persistente local según `DPL-04`. |

---

# 3. Principios del roadmap

1. **Dependencias primero.** No se construye una fase hasta que sus dependencias entregan un sistema ejecutable.
2. **Vertical slices cuando sea posible.** Cada fase debe dejar una porción funcional completa (backend + frontend + tests).
3. **No romper contratos aprobados.** Los contratos de `05_API.md` y el modelo de `04_BASE_DATOS.md` son inmutables en v1.
4. **Cada fase termina en un sistema ejecutable.** No se avanza sin el entregable verificable.
5. **Seguridad desde el inicio.** Los controles de seguridad no son una fase final; se van incorporando progresivamente.
6. **IA bajo gobernanza.** Todo agente de IA sigue `99_AI_DEVELOPMENT_GUIDE.md`.

---

# 4. Preparación del repositorio

Antes de comenzar la Fase 1 se prepara el repositorio base.

| Tarea | Entregable | Referencia |
|---|---|---|
| Crear estructura de carpetas | `backend/`, `frontend/`, `docs/`, `scripts/`, `tests/` | `10_BACKEND.md`, `06_FRONTEND.md` |
| Configurar tooling | Linter, formateador, hooks básicos | `99_AI_DEVELOPMENT_GUIDE.md` §13 |
| Configurar Docker Compose | `docker-compose.yml` con Nginx, Gunicorn, PostgreSQL, volumen | `12_DEPLOY.md` §6 |
| Inicializar Alembic | `backend/migrations/` configurado | `04_BASE_DATOS.md` |
| Variables de entorno | `.env.example` con todas las variables obligatorias | `12_DEPLOY.md` §14 |
| CI mínima | Pipeline que ejecute linting y tests en cada push | `11_TESTING.md` |
| README operativo | Instrucciones de instalación y arranque local | — |

---

# 5. Fase 1 — Fundación backend

**Objetivo:** Tener un backend Flask ejecutable con configuración, logging, errores y health checks.

| Tarea | Entregable |
|---|---|
| Bootstrap Flask con factory pattern | Aplicación arranca sin errores. |
| Configuración por entorno | `development`, `testing`, `production`. |
| Logging estructurado | Logs JSON en archivo. |
| Manejo centralizado de errores | Respuestas de error consistentes. |
| Health checks | `/health/live` y `/health/ready` funcionan. |
| Autenticación base | Login de administrador con sesión segura. |
| Estructura de carpetas | `app/api/v1/`, `app/models/`, `app/services/`, etc. |

**Entregable verificable:** API responde + health checks OK.

---

# 6. Fase 2 — Modelo de datos

**Objetivo:** Tener el esquema de base de datos aprobado con migraciones, seeds e índices.

| Tarea | Entregable |
|---|---|
| Migraciones iniciales | Tablas: store_settings, banners, categories, brands, products, variants, images, users, etc. |
| Seeds de catálogo | Datos mínimos para probar catálogo y panel. |
| Índices obligatorios | Slugs, búsquedas, claves foráneas. |
| Verificación de esquemas | `11_TESTING.md` §verificación de esquema local vs producción. |
| Reversibilidad | Todas las migraciones tienen `downgrade()` probado. |

**Entregable verificable:** Migraciones aplican y revierten correctamente.

---

# 7. Fase 3 — API pública

**Objetivo:** Exponer los endpoints públicos del catálogo en el orden de dependencias.

| Orden | Endpoint / Dominio | Descripción |
|---|---|---|
| 1 | Store settings | Configuración general de la tienda. |
| 2 | Banners | Banners promocionales. |
| 3 | Categorías | Jerarquía de categorías. |
| 4 | Marcas | Listado de marcas. |
| 5 | Productos (listado) | Catálogo con filtros y paginación. |
| 6 | Producto detalle | Ficha de producto por slug. |
| 7 | Facetas | Filtros disponibles del catálogo. |

**Entregable verificable:** Catálogo navegable por API.

---

# 8. Fase 4 — Carrito y WhatsApp

**Objetivo:** Implementar el carrito del frontend, la revalidación y la generación del mensaje de WhatsApp.

| Tarea | Entregable |
|---|---|
| Estado del carrito con Zustand | Carrito persiste en sesión/local según decisión. |
| Revalidación de carrito | `POST /api/v1/cart/revalidate` funciona. |
| Matriz de discrepancias | Detecta diferencias entre frontend y backend. |
| Generación de mensaje | Texto formateado listo para WhatsApp. |
| Pruebas críticas | Tests de integración y E2E del flujo. |

**Entregable verificable:** Carrito revalida correctamente y genera mensaje de WhatsApp.

---

# 9. Fase 5 — Frontend público

**Objetivo:** Tener la tienda pública navegable y usable en móvil.

| Tarea | Entregable |
|---|---|
| Layout base | Header, footer, navegación. |
| Home | Banners, destacados, accesos. |
| Catálogo | Listado, filtros, ordenamiento. |
| Detalle de producto | Información completa, variantes, imágenes. |
| Carrito | Vista del carrito con revalidación. |
| SEO pages | `/producto/{slug}` con metadatos y `_seo` fallback. |

**Entregable verificable:** Tienda usable en móvil y escritorio.

---

# 10. Fase 6 — Panel administrativo

**Objetivo:** Tener el panel admin funcional para gestionar el contenido del catálogo.

| Tarea | Entregable |
|---|---|
| Login admin | Autenticación segura. |
| Dashboard | Vista resumen. |
| CRUD de productos | Alta, baja, modificación, listado. |
| Variantes | Gestión de variantes por producto. |
| Imágenes | Upload, orden, eliminación lógica. |
| Promociones | Gestión de precios promocionales. |
| Banners | Gestión de banners. |
| Usuarios | Gestión de usuarios administradores. |

**Entregable verificable:** CRUD completo de productos desde el panel.

---

# 11. Fase 7 — Seguridad y endurecimiento

**Objetivo:** Activar todos los controles de seguridad definidos en `03_SEGURIDAD.md`.

| Tarea | Entregable |
|---|---|
| CSRF | Tokens en formularios y endpoints de mutación. |
| CSP | Política de contenidos activa. |
| Rate limiting | Límites por IP y por usuario. |
| Upload seguro | Validación de tipo, tamaño, sanitización. |
| Auditoría | Logs de acciones administrativas. |
| Headers de seguridad | HSTS, X-Content-Type-Options, etc. |

**Entregable verificable:** Controles de seguridad activos y verificables.

---

# 12. Fase 8 — Testing

**Objetivo:** Tener la suite de tests crítica en verde.

| Tipo | Cobertura mínima |
|---|---|
| Unitarios | Utilidades, mappers, validaciones. |
| Integración | Repositorios, servicios, migraciones. |
| Contrato API | Todos los endpoints públicos y admin. |
| E2E crítico | Flujos: catálogo, carrito, login admin, CRUD producto. |
| Performance básico | Latencia p95 < 300 ms (`RNF-02`). |

**Entregable verificable:** Suite crítica en verde.

---

# 13. Fase 9 — Staging

**Objetivo:** Validar el despliegue en un entorno similar a producción.

| Tarea | Entregable |
|---|---|
| Deploy en staging | Servicio accesible en URL de staging. |
| Smoke tests | Todos los smoke tests de `12_DEPLOY.md` pasan. |
| Backup verificado | Restauración de backup probada. |
| Rollback probado | Rollback de aplicación ejecutado exitosamente. |
| Validación de seguridad | Headers, CSP, rate limiting en staging. |

**Entregable verificable:** Staging validado.

---

# 14. Fase 10 — Producción

**Objetivo:** Llevar el sistema a producción de forma controlada.

| Tarea | Entregable |
|---|---|
| Checklist go-live | Todos los ítems de `12_DEPLOY.md` §23 cumplidos. |
| Despliegue en producción | Servicio accesible en dominio productivo. |
| Monitoreo 24 h | Observación de métricas durante las primeras 24 horas. |
| Criterio de aceptación | Todos los criterios de éxito de `12_DEPLOY.md` §16 cumplidos. |
| Backup post-deploy | Backup inmediato tras confirmar estabilidad. |

**Entregable verificable:** Producción aceptada.

---

# 15. Tabla de entregables por fase

| Fase | Entregable verificable |
|---|---|
| Preparación | Repositorio clonable y ejecutable localmente. |
| F1 — Fundación backend | API responde + health checks OK. |
| F2 — Modelo de datos | Migraciones aplican y revierten correctamente. |
| F3 — API pública | Catálogo navegable por API. |
| F4 — Carrito y WhatsApp | Carrito revalida correctamente y genera mensaje. |
| F5 — Frontend público | Tienda usable en móvil y escritorio. |
| F6 — Panel administrativo | CRUD completo de productos. |
| F7 — Seguridad y endurecimiento | Controles de seguridad activos y verificables. |
| F8 — Testing | Suite crítica en verde. |
| F9 — Staging | Staging validado. |
| F10 — Producción | Producción aceptada. |

---

# 16. Qué NO hacer durante la implementación

Durante toda la implementación de v1, el equipo y los agentes de IA **no** deben:

- Modificar requisitos de negocio (`RN-xx`).
- Modificar decisiones arquitectónicas (`AD-xx`).
- Cambiar DTOs públicos sin aprobación.
- Cambiar rutas públicas sin aprobación.
- Introducir nuevas librerías base sin aprobación.
- Reutilizar slugs eliminados.
- Realizar deletes físicos de datos de negocio (solo borrado lógico).
- Modificar documentos de definición aprobados (`00_*.md` a `09_*.md`).
- Omitir tests críticos para cumplir plazos.
- Desplegar en producción sin pasar por staging.

---

# 17. Trazabilidad

| Fase | Documentos que gobiernan |
|---|---|
| Preparación | `10_BACKEND.md`, `06_FRONTEND.md`, `12_DEPLOY.md` |
| F1 — Fundación backend | `10_BACKEND.md`, `03_SEGURIDAD.md` |
| F2 — Modelo de datos | `04_BASE_DATOS.md`, `11_TESTING.md` |
| F3 — API pública | `05_API.md`, `05.1_API_DATABASE_CROSS_REVIEW.md`, `10_BACKEND.md` |
| F4 — Carrito y WhatsApp | `01_ANALISIS_NEGOCIO.md`, `05_API.md`, `06_FRONTEND.md` |
| F5 — Frontend público | `06_FRONTEND.md`, `08_UI_SYSTEM.md`, `09_COMPONENTES.md` |
| F6 — Panel administrativo | `07_PANEL_ADMIN.md`, `08_UI_SYSTEM.md`, `09_COMPONENTES.md` |
| F7 — Seguridad y endurecimiento | `03_SEGURIDAD.md` |
| F8 — Testing | `11_TESTING.md` |
| F9 — Staging | `12_DEPLOY.md`, `11_TESTING.md` |
| F10 — Producción | `12_DEPLOY.md` |

---

# 18. Dependencias entre fases

```
Preparación
    │
    ▼
F1 Fundación backend
    │
    ▼
F2 Modelo de datos
    │
    ▼
F3 API pública
    │
    ├──▶ F4 Carrito y WhatsApp
    │         │
    │         ▼
    │    F5 Frontend público
    │         │
    ▼         ▼
F6 Panel administrativo
    │
    ▼
F7 Seguridad y endurecimiento
    │
    ▼
F8 Testing
    │
    ▼
F9 Staging
    │
    ▼
F10 Producción
```

---

# 19. Checklist de inicio de fase

Antes de comenzar cada fase, verificar:

- [ ] La fase anterior entregó su entregable verificable.
- [ ] Los documentos de referencia están aprobados.
- [ ] No hay dependencias bloqueantes.
- [ ] El equipo/agente de IA leyó `99_AI_DEVELOPMENT_GUIDE.md`.
- [ ] Las tareas de la fase están descompuestas en prompts ejecutables.

---

# 20. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.1.0** | 18/08/2026 | 🟡 EN REVISIÓN | Corrige §2.3: "Gestión de stock en tiempo real" quedaba fuera de v1 citando a `01_ANALISIS_NEGOCIO.md`, pero ese documento nunca reflejó que v1.4.0 ya implementó stock numérico por variante. Se reformula a lo que realmente queda fuera: sincronización automática multi-canal (`01_ANALISIS_NEGOCIO.md` v2.6.0, `RN-82`). |
| **1.0.0** | 09/08/2026 | ✅ APROBADO | Hoja de ruta de implementación v1: preparación del repositorio, 10 fases secuenciales, entregables verificables, dependencias, qué no hacer y trazabilidad a documentos aprobados. |
