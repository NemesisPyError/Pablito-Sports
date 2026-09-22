# 10_BACKEND.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Especificación de Implementación del Backend |
| **Código** | 10 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 07/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [05.1_API_DATABASE_CROSS_REVIEW.md](05.1_API_DATABASE_CROSS_REVIEW.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09_COMPONENTES.md](09_COMPONENTES.md) ✅ · [03_SEGURIDAD.md](03_SEGURIDAD.md) ✅ · [10.0_BACKEND_ANALISIS_PREVIO.md](10.0_BACKEND_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `11_TESTING.md`, `12_DEPLOY.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Este documento es la **referencia definitiva de implementación del backend** de Pablito Sports. Materializa las decisiones arquitectónicas aprobadas (`AD-xx`), las reglas de negocio (`RN-xx`) y los contratos de API en código ejecutable: estructura de carpetas, responsabilidades por capa, ciclo de vida de una petición, excepciones, middleware, configuración, transacciones, logging, testing y convenciones de nombres.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Organización del código backend | — |
| Responsabilidades y dependencias entre capas | — |
| Ciclo de arranque y ciclo de vida de una petición | — |
| Jerarquía de excepciones y manejo global de errores | — |
| Middleware esencial | — |
| Configuración por entorno | `12_DEPLOY.md` (secretos e infraestructura) |
| Integraciones externas (adaptadores) | — |
| Transacciones, concurrencia y caché | — |
| Logging, observabilidad y auditoría | — |
| Convenciones de nombres y estilo | `00.3_NOMENCLATURA.md` |
| Estrategia de testing por capa | `11_TESTING.md` |
| Contratos de API | `05_API.md` |
| Modelo de datos | `04_BASE_DATOS.md` |
| Seguridad | `03_SEGURIDAD.md` |

---

# 3. Alcance

## 3.1 Incluye

- Bootstrap de la aplicación Flask.
- Ciclo de vida de una petición HTTP.
- Capas del backend y sus responsabilidades.
- Contrato de carpetas y reglas de importación.
- Jerarquía de excepciones y mapeo a la envoltura `AD-16`.
- Middleware esencial.
- Configuración por entorno.
- Integraciones externas y adaptadores.
- Transacciones, concurrencia y política de caché.
- Logging, observabilidad y auditoría.
- Convenciones de nombres.
- Testing por capa.
- Eventos internos reservados.
- Estrategia de migraciones.
- Decisiones de implementación backend (`BK-01` a `BK-06`).
- Backend Anti-Patterns.
- Checklist para crear un nuevo módulo.

## 3.2 No incluye

- Reglas de negocio detalladas → `01_ANALISIS_NEGOCIO.md`.
- Decisiones arquitectónicas → `02_ARQUITECTURA.md` y `02.1_DECISIONES_ARQUITECTONICAS.md`.
- Contratos de API → `05_API.md`.
- Esquema físico de base de datos → `04_BASE_DATOS.md`.
- Políticas de seguridad → `03_SEGURIDAD.md`.
- Infraestructura de despliegue → `12_DEPLOY.md`.

## 3.3 Relación con el Architecture Freeze

`02_ARQUITECTURA.md` v1.0.0 está aprobado y congelado. Este documento no introduce nuevas decisiones arquitectónicas; solo materializa las existentes. Si durante la implementación surge un vacío que requiera una nueva decisión `AD-xx`, se registra como pendiente y se resuelve en `02_ARQUITECTURA.md` / `02.1_DECISIONES_ARQUITECTONICAS.md` antes de continuar.

---

# 4. Definiciones

| Término | Definición en este documento |
|---|---|
| **Capa** | Agrupación lógica de módulos con responsabilidad similar y dependencias controladas (`AD-02`). |
| **Agregado** | Cluster de entidades que se tratan como una unidad de cambio (por ejemplo, Producto + Variantes). |
| **DTO** | *Data Transfer Object*. Estructura de datos que la API devuelve o recibe (`AD-12`). |
| **Schema** | Definición de validación de entrada (Marshmallow/Pydantic). |
| **Mapper** | Función/clase que transforma modelos ORM en DTOs y viceversa. |
| **Blueprint** | Registro de rutas de Flask agrupado por dominio (`BK-03`). |
| **Bootstrap** | Proceso de arranque de la aplicación: carga de config, extensiones, blueprints y middleware. |

---

# 5. Responsabilidades

| Responsabilidad | Responsable |
|---|---|
| Aprobar cambios en la arquitectura del backend | Responsable del proyecto |
| Mantener este documento actualizado | Redactor del backend |
| Implementar respetando capas y dependencias | Implementador |
| Verificar que el código cumple `BK-01` a `BK-06` | Revisor |
| Validar esquema local contra producción antes de cerrar tarea | Implementador + Revisor |

---

# 6. Bootstrap de la aplicación

Antes de atender la primera petición, la aplicación sigue este orden de arranque:

```
app.py / application factory
    ↓
Carga configuración desde core/config (según FLASK_ENV)
    ↓
Inicializa logging estructurado
    ↓
Inicializa SQLAlchemy (db)
    ↓
Inicializa migraciones (Migrate)
    ↓
Inicializa gestión de sesiones (Flask-Session)
    ↓
Inicializa protección CSRF
    ↓
Inicializa rate limiting (Flask-Limiter)
    ↓
Registra Blueprints (api/v1/public, api/v1/admin, api/v1/seo)
    ↓
Registra manejadores globales de errores
    ↓
Registra middleware (request_id, logging, headers de seguridad)
    ↓
Servidor listo
```

**Reglas.**

1. Ninguna extensión se inicializa fuera de la factory.
2. La configuración se valida antes de que cualquier extensión se configure; si falta un valor obligatorio, la aplicación no arranca (`CFG-02`).
3. Los blueprints se registran después de las extensiones pero antes de los manejadores de error.
4. El registro de middleware ocurre al final para que envuelva toda la aplicación.

---

# 7. Ciclo de vida de una petición

```
Cliente ──▶ Nginx ──▶ Gunicorn ──▶ Flask app
                                     │
                                     ▼
                               Middleware (request_id, rate limit, seguridad)
                                     │
                                     ▼
                               Router / Blueprint
                                     │
                                     ▼
                               Controlador (route handler)
                                     │
                                     ▼
                               Validación de entrada (schema)
                                     │
                                     ▼
                               Servicio de negocio
                                     │
                                     ▼
                               Repositorio / Integración externa
                                     │
                                     ▼
                               Modelo ORM / Base de datos
                                     │
                                     ▼
                               DTO de salida (vía mapper)
                                     │
                                     ▼
                               Middleware de respuesta (envoltura, headers, log)
                                     │
                                     ▼
                               Cliente
```

**Puntos fijos.**

- Nginx termina TLS y decide si la petición va a archivos estáticos, imágenes, API JSON (`/api/v1/*`) o SEO (`/_seo/*`) (`AD-04`).
- Cada petición recibe un `request_id` único; viaja en `meta.request_id` y en logs (`OA-09`).
- El rate limiting se aplica antes de autenticación en API pública y después en panel (`03_SEGURIDAD.md` §14).
- La autenticación de panel lee la cookie `session` (`AD-37`); la API pública es anónima salvo revalidación.

  **Atributos de la cookie de sesión.** `HttpOnly=true`, `Secure=true`, `SameSite=Strict`, `Path=/api/v1/admin`, `Max-Age=12 horas` (`SEG-01`, `03_SEGURIDAD.md` §7.1).

- La autorización ocurre en el controlador o mediante decorador.
- Los errores se traducen en el manejador global a la envoltura `AD-16`; los detalles técnicos no llegan al cliente (`03_SEGURIDAD.md` §16).

---

# 8. Capas y responsabilidades

## 8.1 `api/` — Controladores y rutas

**Responsabilidad:** recibir HTTP, extraer parámetros, invocar servicios, devolver respuesta HTTP.

**Puede:**

- Validar presencia de campos mediante schema.
- Llamar a servicios.
- Manejar autorización de ruta (quién puede acceder).
- Ensamblar la envoltura `AD-16` con los datos devueltos por el servicio.

**No puede:**

- Tocar modelos, repositorios ni base de datos.
- Contener reglas de negocio (`AD-03`).
- Construir DTOs complejos directamente (usa mappers).

## 8.2 `schemas/` — Validación estructural de entrada

**Responsabilidad:** validar que los datos de entrada tienen la forma correcta.

**Puede:**

- Declarar tipos, longitudes, formatos, rangos, obligatoriedad.
- Usar Marshmallow o Pydantic.

**No puede:**

- Contener lógica de negocio.
- Acceder a base de datos.

> **DTOs de entrada.** En v1, los `schemas/` cumplen el rol de validación y deserialización de la entrada. Los DTOs de entrada se introducirán únicamente si una futura complejidad del dominio lo justifica (`PA-11`).

## 8.3 `validators/` — Validación de negocio reusable

**Responsabilidad:** encapsular invariantes simples de negocio que no requieren base de datos.

**Puede:**

- Validar formatos de negocio, invariantes matemáticas, reglas cruzadas simples.

**No puede:**

- Acceder a base de datos.
- Decidir reglas de agregado complejas (`RN-xx`).

## 8.4 `services/` — Reglas de negocio y transacciones

**Responsabilidad:** aplicar reglas de negocio (`RN-xx`), orquestar repositorios, construir DTOs de salida, abrir transacciones y llamar integraciones.

**Puede:**

- Usar repositorios, integraciones, `validators`, `core`, otros servicios.
- Abrir transacciones.
- Aplicar reglas de negocio.

**No puede:**

- Conocer HTTP (`flask.request`, `jsonify`).
- Tocar modelos directamente.
- Recibir schemas de salida.

> **Regla de oro.** Si una función en `services/` necesita importar `flask.request`, está mal ubicada.
>
> **Regla de exclusividad.** Los `services/` son la **única** capa que puede abrir transacciones, coordinar repositorios, aplicar `RN-xx` y llamar integraciones.

## 8.5 `repositories/` — Acceso a datos

**Responsabilidad:** consultar y persistir agregados.

**Puede:**

- Usar modelos SQLAlchemy y utilidades de `core`.
- Recibir IDs, entidades o parámetros simples.

**No puede:**

- Contener reglas de negocio.
- Recibir DTOs.
- Usar otros repositorios o servicios.

> **Regla.** Los repositorios nunca reciben DTOs. Si una función de repositorio recibe `CreateProductDTO`, está mal ubicada.
>
> **Regla de eliminación.** Los repositorios implementan eliminación lógica mediante `deleted_at`; nunca ejecutan `DELETE` físico de entidades de negocio (`AD-18`).

## 8.6 `models/` — Estructura de datos del ORM

**Responsabilidad:** definir tablas, columnas, relaciones, restricciones.

**Puede:**

- Definir la estructura del esquema.

**No puede:**

- Importar de `api`, `services`, `repositories`, `dtos` ni `mappers`.
- Contener lógica de negocio.

## 8.7 `dtos/` — Estructuras de salida de la API

**Responsabilidad:** representar los datos que la API devuelve.

**Puede:**

- Ser construido por mappers desde modelos o servicios.

**No puede:**

- Contener lógica de negocio.
- Depender de ORM ni conocer modelos.

> **Excepción a `AD-12`.** `variant_id` es el único identificador interno que se expone en los DTOs, justificado por `AD-15` (el carrito necesita referirse a una variante estable).

## 8.8 `mappers/` — Transformación entre modelos y DTOs

**Responsabilidad:** convertir modelos ORM en DTOs y viceversa.

**Puede:**

- Conocer modelos y DTOs.

**No puede:**

- Contener lógica de negocio.
- Acceder a base de datos.

> **Regla.** Los DTOs nunca conocen SQLAlchemy; los Models nunca conocen DTOs. Solo los Mappers unen ambos mundos.

## 8.9 `integrations/` — Adaptadores externos

**Responsabilidad:** adaptar servicios externos (WhatsApp, futuros) al lenguaje del dominio.

**Puede:**

- Usar clientes HTTP y traducir fallos a `IntegrationError` (`ERR-06`).

**No puede:**

- Exponer detalles del proveedor al resto del sistema.

## 8.10 `core/` — Lógica transversal pura

**Responsabilidad:** configuración, excepciones base, seguridad base, logging, utilidades transversales, auditoría.

**Puede:**

- Ser importado por cualquier capa.

**No puede:**

- Depender de `api`, `services`, `repositories`, `models`, `dtos`, `mappers` ni `integrations`.

## 8.11 `infrastructure/` — Detalles técnicos

**Responsabilidad:** proveer detalles técnicos de persistencia y almacenamiento.

**Puede:**

- Proveer clientes de base de datos, almacenamiento de archivos, conectores externos base.

**No puede:**

- Contener lógica de negocio.
- Ser importado por `services` o `repositories` salvo a través de abstracciones.

> **Separación conceptual.** `core/` contiene lógica transversal pura; `infrastructure/` contiene detalles técnicos. Cuando el proyecto migre a S3, Cloudinary u otro proveedor, solo cambiará `infrastructure/` (`PA-12`).

---

# 9. Contrato de carpetas

```
backend/
├── app/
│   ├── __init__.py              # factory de Flask
│   ├── extensions.py            # db, migrate, session, limiter
│   └── cli.py                   # comandos personalizados (seed, cleanup)
├── api/
│   ├── __init__.py              # registro de blueprints
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── public/              # endpoints de catálogo
│   │   └── admin/               # endpoints del panel
│   └── errors.py                # importa y registra los manejadores definidos en core/exceptions/handlers.py
├── seo/                         # endpoints HTML para rastreadores (/_seo/)
│   ├── __init__.py
│   ├── products.py
│   ├── categories.py
│   └── catalog.py
├── schemas/
│   ├── product_schemas.py
│   ├── variant_schemas.py
│   ├── admin_schemas.py
│   └── shared.py                # esquemas reutilizables
├── validators/
│   ├── product_validators.py
│   ├── price_validators.py
│   └── shared.py
├── services/
│   ├── product_service.py
│   ├── variant_service.py
│   ├── catalog_service.py
│   ├── cart_service.py
│   ├── admin_service.py
│   ├── auth_service.py
│   ├── audit_service.py
│   └── image_service.py
├── repositories/
│   ├── product_repository.py
│   ├── variant_repository.py
│   ├── brand_repository.py
│   ├── category_repository.py
│   └── administrator_repository.py
├── models/
│   ├── __init__.py
│   ├── product.py
│   ├── variant.py
│   └── ...
├── dtos/
│   ├── product_dtos.py
│   ├── catalog_dtos.py
│   └── admin_dtos.py
├── mappers/
│   ├── product_mappers.py
│   ├── catalog_mappers.py
│   └── admin_mappers.py
├── integrations/
│   ├── whatsapp_adapter.py
│   └── __init__.py
├── core/                        # lógica transversal pura
│   ├── config/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── testing.py
│   │   └── production.py
│   ├── exceptions/
│   │   ├── base.py
│   │   ├── business.py
│   │   ├── validation.py
│   │   ├── auth.py
│   │   ├── not_found.py
│   │   ├── integration.py
│   │   └── handlers.py          # define las funciones manejadoras de excepciones
│   ├── security/
│   │   ├── password.py
│   │   └── csrf.py
│   ├── logging/
│   │   ├── config.py
│   │   └── request_context.py
│   ├── audit/
│   │   ├── decorator.py
│   │   └── service.py
│   ├── decorators/
│   │   ├── transactional.py
│   │   └── requires_role.py
│   └── utils/
│       ├── slug.py
│       ├── pagination.py
│       └── validators.py
├── infrastructure/              # detalles técnicos
│   ├── database.py
│   ├── storage/
│   │   ├── local_storage.py
│   │   └── storage_interface.py
│   └── external/
│       └── http_client.py
├── migrations/                  # Alembic
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── mappers/
│   │   ├── validators/
│   │   └── core/
│   ├── integration/
│   │   ├── api/
│   │   └── services/
│   └── fixtures/
└── requirements/
    ├── base.txt
    ├── dev.txt
    └── prod.txt
```

## 9.1 Dependencias permitidas

| Desde | Puede usar |
|---|---|
| `Controller` (`api/`) | `schemas`, `services`, `dtos`, `mappers`, `core` |
| `Service` (`services/`) | `repositories`, `integrations`, `validators`, `core`, `infrastructure` (solo abstracciones de servicios externos: almacenamiento de archivos, email, nube, etc.), otros `services` |
| `Repository` (`repositories/`) | `models`, `core`, `infrastructure` (solo abstracciones) |
| `Mapper` (`mappers/`) | `dtos` + `models` |
| `Schema` (`schemas/`) | `core` |
| `Validator` (`validators/`) | `core` |
| `DTO` (`dtos/`) | `core` |
| `Model` (`models/`) | `core` |
| `Integration` (`integrations/`) | `core`, `infrastructure` (clientes base) |
| `Core` (`core/`) | — |

## 9.2 Dependencias prohibidas

| Origen → Destino | Razón |
|---|---|
| `Controller` → `Repository` ❌ | La ruta no accede a datos directamente (`AD-02`). |
| `Controller` → `Model` ❌ | Los modelos no deben filtrar a la API (`AD-12`). |
| `Service` → `Model` ❌ | El servicio habla con repositorios, no con el ORM directamente. |
| `Repository` → `Service` ❌ | La dependencia es unidireccional. |
| `Repository` → `DTO` ❌ | Los repositorios reciben IDs, entidades o parámetros simples. |
| `Model` → `Repository` ❌ | Los modelos no conocen la capa de acceso a datos. |
| `Model` → `DTO` ❌ | Solo los mappers unen ambos mundos. |
| `DTO` → `Model` ❌ | Los DTOs no conocen SQLAlchemy. |
| `DTO` → `Repository` ❌ | Los DTOs son salida de la API, no argumentos de persistencia. |
| `Schema` → `Model` ❌ | La validación de entrada no depende del ORM. |
| `Core` → cualquier capa de negocio ❌ | `core/` es la capa más interna; no puede depender del exterior. |
| `Infrastructure` → `Service` / `Repository` (implementaciones) ❌ | La infraestructura es detalle técnico; no orquesta negocio. |

**Regla de acceso a datos.** Los `services/` pueden depender de `infrastructure/` únicamente para servicios externos (almacenamiento de archivos, correo, almacenamiento en la nube, etc.). **Nunca** podrán acceder a la base de datos por esta vía. Todo acceso a datos pasa exclusivamente por `repositories/` (`DEP-03`).

---

# 10. Jerarquía de excepciones

```
AppException (base, abstracta)
├── BadRequestError              → 400 (petición malformada)
├── ValidationError              → 422
│   └── RequestValidationError   → 422 (esquema de entrada)
├── AuthenticationError          → 401
├── AuthorizationError           → 403
├── NotFoundError                → 404
├── BusinessRuleError            → 409
│   └── ConcurrencyError         → 409 (conflicto por actualización concurrente)
├── RateLimitError               → 429
├── IntegrationError             → 502
└── InternalError                → 500
```

## 10.1 Mapeo a la envoltura `AD-16`

| Excepción | HTTP | Código en `errors[].code` | Campo adicional |
|---|---|---|---|
| `BadRequestError` | `400` | `bad_request` | — |
| `ValidationError` | `422` | `validation_error` | `field` cuando aplica |
| `RequestValidationError` | `422` | `validation_error` | `field` |
| `AuthenticationError` | `401` | `authentication_error` | — |
| `AuthorizationError` | `403` | `authorization_error` | — |
| `NotFoundError` | `404` | `resource_not_found` | `resource` |
| `BusinessRuleError` | `409` | `business_rule_violation` | `rule` (el `RN-xx`) |
| `ConcurrencyError` | `409` | `conflict` | — |
| `RateLimitError` | `429` | `rate_limit_exceeded` | `retry_after` |
| `IntegrationError` | `502` | `integration_error` | `provider` |
| `InternalError` | `500` | `internal_error` | — |

## 10.2 Reglas `ERR-01` a `ERR-06`

- `ERR-01`: toda excepción conocida hereda de `AppException`.
- `ERR-02`: el manejador global traduce `AppException` a la envoltura uniforme; cualquier otra excepción se registra como `InternalError` con `request_id`.
- `ERR-03`: `BusinessRuleError` siempre expone el `RN-xx` violado en `errors[].rule`.
- `ERR-04`: `ValidationError` expone el campo problemático cuando existe.
- `ERR-05`: `IntegrationError` oculta detalles del proveedor; solo devuelve `provider` y código genérico.
- `ERR-06`: fallos externos nunca se propagan tal cual; se traducen a `IntegrationError`.

---

# 11. Middleware esencial

| Middleware | Orden | Responsabilidad | Origen |
|---|---|---|---|
| `RequestIdMiddleware` | 1 | Generar o propagar `X-Request-Id`; almacenar en `g.request_id`. | `OA-09` |
| `SecurityHeadersMiddleware` | 2 | Agregar headers de seguridad dependientes del request. | `03_SEGURIDAD.md` §12 |
| `RequestLoggingMiddleware` | 3 | Log de entrada/salida: método, ruta, status, duración, `request_id`, IP. | `03_SEGURIDAD.md` §15 |
| `RateLimitMiddleware` / Flask-Limiter | 4 | Aplicar límites por endpoint. | `RNF-11` |
| `SessionMiddleware` / Flask-Session | 5 | Gestionar cookie de sesión en rutas `/api/v1/admin/*`. | `AD-37` |
| `CSRFMiddleware` | 6 | Validar token CSRF en métodos de escritura del panel. | `03_SEGURIDAD.md` §8 |
| `ErrorWrapperMiddleware` | 7 (último) | Capturar excepciones, invocar manejador global, devolver envoltura `AD-16`. | `AD-16` |

> **Tipos de la entrada (S-13).** El cuerpo JSON se lee con
> `schemas.shared.json_body()` —que exige un objeto y responde 400 si no lo es— y
> los campos de texto con `schemas.shared.texto()`, que **rechaza el tipo en vez
> de convertirlo**. Antes, un barrido de 304 peticiones malformadas producía 90
> respuestas 500 por `AttributeError` al llamar `.strip()` sobre un no-string.
> `123` no se acepta como `"123"`: se responde 422 señalando el campo.

> **Headers estáticos.** `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` se configuran preferentemente en Nginx. El middleware solo complementa lo que dependa del request.

---

# 12. Configuración por entorno

**Decisión `AD-11`**: solo `core/config` lee variables de entorno.

```python
# core/config/base.py
import os

class BaseConfig:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_TYPE = 'sqlalchemy'
    SESSION_SQLALCHEMY_TABLE = 'sessions'
    PERMANENT_SESSION_LIFETIME = 43200  # 12 horas
    WTF_CSRF_ENABLED = True

class DevelopmentConfig(BaseConfig):
    DEBUG = True
    TESTING = False

class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    WTF_CSRF_ENABLED = False

class ProductionConfig(BaseConfig):
    DEBUG = False
    TESTING = False
```

## 12.1 Reglas `CFG-01` a `CFG-05`

- `CFG-01`: solo `core/config` lee variables de entorno.
- `CFG-02`: configuración se valida al arrancar; falta un valor obligatorio → la aplicación no arranca.
- `CFG-03`: se distinguen tres niveles: negocio (`store_settings`), entorno (variables) y constantes de código.
- `CFG-04`: configuración de negocio editable por administrador vive en base de datos, no en `.env`.
- `CFG-05`: valores sensibles nunca se loguean.

## 12.2 Variables obligatorias

| Variable | Entornos | Uso |
|---|---|---|
| `SECRET_KEY` | Todos | Firma de sesiones y tokens CSRF. |
| `DATABASE_URL` | Todos | Conexión PostgreSQL. |
| `TEST_DATABASE_URL` | Testing | Base de datos de pruebas. |
| `UPLOAD_FOLDER` | Todos | Ruta base de imágenes. |
| `LOG_LEVEL` | Todos | Nivel de log. |

---

# 13. Integraciones externas

En v1 la única integración externa planificada es **WhatsApp**. Aunque el envío real ocurre desde el cliente (`wa.me`), el backend puede necesitar generar metadatos para rastreadores (`AD-09`) y reservar la futura Cloud API.

## 13.1 Contrato de integraciones (`INT-01` a `INT-07`)

| Regla | Aplicación |
|---|---|
| `INT-01` | Cada integración vive en su propio módulo bajo `integrations/`. |
| `INT-02` | El resto del sistema consume la integración a través de una interfaz estable. |
| `INT-03` | Los errores del proveedor se traducen a `IntegrationError`. |
| `INT-04` | Las respuestas del proveedor se validan antes de usarse. |
| `INT-05` | Cada integración declara timeouts y reintentos. |
| `INT-06` | Configuración por `core/config`; puede desactivarse. |
| `INT-07` | Tests de integración usan mocks o servidores de prueba. |

## 13.2 Estructura para v1

```
integrations/
├── __init__.py
├── base.py              # IntegrationResult, IntegrationError
└── whatsapp_adapter.py  # constructor de enlaces wa.me y futura Cloud API
```

---

# 14. Transacciones y concurrencia

## 14.1 Reglas de transacción

1. **Unidad de trabajo por servicio.** Cada operación de escritura en un servicio corre dentro de una transacción SQLAlchemy.
2. **Decorador `@transactional`.** Vive en `core/decorators/transactional.py`. Se aplica a métodos de servicio de escritura.
3. **No transacciones en lectura.** Las operaciones de lectura no abren transacción explícita.
4. **Integraciones fuera de la transacción.** Nunca se invoca una integración externa dentro de una transacción.

## 14.2 Manejo de concurrencia

- **Concurrencia optimista.** Para entidades editables concurrentemente, se usa `updated_at` como token de versión. Si el token recibido no coincide con el almacenado, se lanza `ConcurrencyError` → `409`.
- **Lectura repetible.** El cálculo de promociones vigentes y generación de slugs usan aislamiento adecuado.

## 14.3 Flujo típico de escritura

```
ruta ──▶ schema.validate() ──▶ servicio.create_or_update()
                                  │
                                  ▼
                           @transactional inicia tx
                                  │
                                  ▼
                           repositorio.save(modelo)
                                  │
                                  ▼
                           auditoría.registrar()
                                  │
                                  ▼
                           tx.commit() o rollback() en excepción
```

---

# 15. Política de caché v1: No Cache

**Decisión `BK-06`.** En v1 no se implementa caché de aplicación (Redis/memoria).

La estrategia de rendimiento se basa en:

1. **Índices de base de datos** para consultas frecuentes.
2. **Nginx como cache de archivos estáticos e imágenes** (`AD-04`).
3. **Respuestas JSON sin cache del lado del servidor.**

## 15.1 Headers de control de caché

| Tipo de respuesta | `Cache-Control` |
|---|---|
| API JSON pública | `no-store, no-cache, must-revalidate` |
| API JSON privada | `no-store, private` |
| Imágenes y estáticos | Gestionado por Nginx con `expires` y `etag` |

## 15.2 Justificación

El catálogo es pequeño, la carga principal son imágenes, y agregar caché de aplicación introduce invalidaciones que en v1 no están justificadas (`PA-11`). El punto de extensión queda documentado para cuando el volumen lo requiera.

---

# 16. Logging y observabilidad

## 16.1 Niveles de log

| Nivel | Uso |
|---|---|
| `DEBUG` | Información de desarrollo; desactivado en producción. |
| `INFO` | Eventos normales de la aplicación. |
| `WARNING` | Situaciones anómalas pero recuperables. |
| `ERROR` | Fallos que requieren atención. |

## 16.2 Sistemas de observabilidad

| Sistema | Responsabilidad | Destino | Estado v1 |
|---|---|---|---|
| **Logs** | Eventos técnicos y diagnóstico. | Archivo/stdout estructurado. | ✅ Activo |
| **Audit** | Operaciones de escritura del panel. | Tabla `audit_logs` inmutable. | ✅ Activo |
| **Metrics** | Métricas de uso, rendimiento y salud. | Reservado. | ⏸️ Reservado |
| **Tracing** | Trazabilidad distribuida. | Reservado. | ⏸️ Reservado |

> **AUDIT no es un nivel de log.** Es un sistema independiente.

## 16.3 Principios de logs

1. Toda petición tiene `request_id`.
2. Estructura JSON en producción: `timestamp`, `level`, `request_id`, `user_id`, `message`, `extra`.
3. No se loguean contraseñas, hashes, tokens CSRF ni datos sensibles.

## 16.4 Eventos de seguridad

| Evento | Destino |
|---|---|
| Login exitoso | `audit_logs` |
| Login fallido | logs + `audit_logs` |
| Cambio de contraseña | `audit_logs` |
| CRUD de entidades | `audit_logs` |
| Subida de imagen | `audit_logs` |
| `403`, `401`, `429` | logs de aplicación |

---

# 17. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Módulos y paquetes | `snake_case` | `product_service.py` |
| Clases | `PascalCase` | `ProductService` |
| Funciones y métodos | `snake_case` | `get_by_slug()` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| Variables privadas | `_leading_underscore` | `_validate_price()` |
| Blueprints | `nombre_bp` | `products_bp` |
| Excepciones | sufijo `Error` | `BusinessRuleError` |
| DTOs | sufijo `DTO` | `ProductDetailDTO` |
| Schemas | sufijo `Schema` | `ProductCreateSchema` |
| Repositorios | sufijo `Repository` | `ProductRepository` |
| Servicios | sufijo `Service` | `ProductService` |
| Mappers | sufijo `Mapper` | `ProductMapper` |
| Validators | sufijo `Validator` | `PriceValidator` |
| Test files | `test_*.py` | `test_product_service.py` |

## 17.1 Reglas adicionales

- Un archivo por dominio dentro de cada capa.
- Funciones de servicio con verbos de acción: `create`, `update`, `delete`, `get_by_slug`, `list`, `revalidate`.
- Funciones de repositorio con verbos de consulta: `get_by_id`, `find_by_slug`, `list_active`, `save`, `soft_delete`.
- DTOs de salida: `ProductListItemDTO`, `ProductDetailDTO`, `BrandAdminDTO`.

---

# 18. Testing por capa

| Capa | Tipo de test | Alcance | Herramientas |
|---|---|---|---|
| `models/` | Unitario | Constraints, relaciones, factory methods. | pytest + test container. |
| `schemas/` | Unitario | Validación de entrada, mensajes de error, casos límite. | pytest + schema library. |
| `validators/` | Unitario | Invariantes simples, casos de error. | pytest. |
| `mappers/` | Unitario | Transformación modelo ↔ DTO. | pytest. |
| `repositories/` | Integración leve | Consultas y persistencia contra BD de pruebas. | pytest + PostgreSQL container. |
| `services/` | Unitario | Reglas de negocio con repositorios mockeados. | pytest + mock. |
| `api/` | Integración | Endpoints completos: status, envoltura, auth, rate limit. | pytest + Flask test client. |
| `integrations/` | Integración | Adaptadores con mocks. | pytest + responses/VCR. |
| `core/` | Unitario | Configuración, excepciones, utilidades. | pytest. |

## 18.1 Reglas de tests

1. Cada test de servicio usa repositorios mockeados; no levanta base de datos salvo que sea necesario.
2. Los tests de API no tocan servicios reales.
3. Los tests de integración con base de datos usan una base aislada en contenedor.
4. Los tests de integración externa nunca llaman al proveedor real en CI.
5. Cobertura mínima objetivo: 80% en servicios, 70% en repositorios.

---

# 19. Validación: estructural vs. negocio

| Tipo | Vive en | Responsabilidad | Ejemplo |
|---|---|---|---|
| **Validación estructural** | `schemas/` | Tipos, longitudes, formatos, rangos, obligatoriedad. | `price` debe ser entero ≥ 1. |
| **Validación de negocio reusable** | `validators/` | Invariantes simples sin base de datos. | `sale_price < list_price`. |
| **Validación de agregado** | `services/` | Reglas que requieren estado del dominio. | `RN-31`, `RN-68`, `RN-70`. |

**Reglas.**

1. `schemas/` nunca accede a base de datos.
2. `validators/` nunca accede a base de datos.
3. Las reglas que dependen del estado actual del sistema viven en `services/`.

---

# 20. Eventos internos (reservado)

En v1 no se implementa un bus de eventos. Se documentan los eventos de dominio identificados para reservar el patrón (`PA-12`):

- `ProductCreated`, `ProductUpdated`
- `ProductActivated`, `ProductDeactivated`
- `PriceChanged`
- `PromotionActivated`, `PromotionDeactivated`
- `BannerPublished`
- `ImageUploaded`, `ImageDeleted`

**Reglas para v1.**

1. Las reacciones se implementan síncronamente dentro del servicio.
2. No se crea infraestructura de publicación/suscripción.
3. Los nombres quedan reservados para futura migración.

---

# 21. Estrategia de migraciones

Flujo oficial:

```
Modelo en código (SQLAlchemy)
    ↓
Generar migración con Alembic (autogenerate + revisión manual)
    ↓
Aplicar upgrade en entorno local
    ↓
Verificar esquema local contra producción (estructura y semillas)
    ↓
Ejecutar tests de integración
    ↓
Aplicar upgrade en producción con backup previo
    ↓
Verificar consistencia post-migración
```

**Reglas.**

1. Nunca se edita una migración ya aplicada en otro entorno.
2. Toda migración de datos destructivos requiere backup y rollback validado.
3. Antes de cerrar una tarea, el esquema local debe coincidir con el de producción (`04_BASE_DATOS.md` §5).
4. Las migraciones se versionan en `migrations/versions/`.

---

# 22. Decisiones de implementación backend

## BK-01 — Un repositorio por agregado

| Campo | Valor |
|---|---|
| **Identificador** | `BK-01` |
| **Título** | Cada agregado tiene su propio repositorio explícito |
| **Decisión** | Se crea un repositorio por agregado (`ProductRepository`, `BrandRepository`, etc.). Puede existir una clase base muy ligera, pero **no** un repositorio genérico universal. |
| **Consecuencias** | Los servicios no construyen consultas SQL. Cada repositorio es rastreable a un dominio. |

## BK-02 — Un servicio por agregado funcional

| Campo | Valor |
|---|---|
| **Identificador** | `BK-02` |
| **Título** | Servicios organizados por agregado funcional y servicios transversales |
| **Decisión** | Un servicio por agregado: `ProductService`, `BrandService`, etc. Servicios transversales: `AuthService`, `AuditService`, `ImageService`, `CatalogService`, `CartService`. |
| **Consecuencias** | Las reglas `RN-xx` se agrupan naturalmente. Evita servicios gigantes y servicios de un solo método. |

## BK-03 — Un Blueprint por agregado

| Campo | Valor |
|---|---|
| **Identificador** | `BK-03` |
| **Título** | Cada agregado expone sus rutas a través de un Blueprint propio |
| **Decisión** | Blueprints: `products_bp`, `brands_bp`, `categories_bp`, `promotions_bp`, `administrators_bp`, `banners_bp`, `auth_bp`, `cart_bp`. |
| **Consecuencias** | Autorización y prefijos por blueprint. Endpoints de un dominio viven juntos. |

## BK-04 — Tamaño de servicio como señal de revisión

| Campo | Valor |
|---|---|
| **Identificador** | `BK-04` |
| **Título** | Un servicio que supera aproximadamente 400–500 líneas es señal de revisión |
| **Decisión** | **No es un límite rígido.** Si un servicio supera las 400–500 líneas, se revisa si contiene múltiples responsabilidades y si conviene dividirlo. |
| **Consecuencias** | Mantiene cohesión y evita servicios monolíticos dentro de la capa de negocio. |

## BK-05 — DTOs ensamblados en servicios

| Campo | Valor |
|---|---|
| **Identificador** | `BK-05` |
| **Título** | Los DTOs de salida se ensamblan en la capa de servicios |
| **Decisión** | El servicio devuelve DTOs listos; la ruta solo los envuelve en la respuesta `AD-16`. |
| **Consecuencias** | La lógica de presentación de la API no se filtra al controlador. |

## BK-06 — Política de caché v1: No Cache

| Campo | Valor |
|---|---|
| **Identificador** | `BK-06` |
| **Título** | En v1 no se implementa caché de aplicación |
| **Decisión** | Sin Redis ni caché en memoria para respuestas JSON. Rendimiento por índices, Nginx y optimización de consultas. |
| **Consecuencias** | Sistema más simple; punto de extensión para v2 si las métricas lo justifican. |

---

# 23. Backend Anti-Patterns

| Anti-patrón | Síntoma | Prevención |
|---|---|---|
| **Fat Controller** | La ruta valida reglas de negocio o construye DTOs complejos. | La ruta extrae parámetros, valida schema y delega al servicio. |
| **Repository genérico universal** | `BaseRepository` con métodos genéricos que fuerzan a servicios a conocer consultas. | `BK-01`: repositorios específicos por agregado. |
| **Servicio por endpoint** | `CreateProductService`, `UpdateProductService`, etc. | `BK-02`: servicio por agregado funcional. |
| **Lógica de negocio en el ORM** | Validaciones en `sqlalchemy.event` o métodos de modelo. | `AD-03`: reglas en servicios; modelos solo estructuran datos. |
| **Fuga de HTTP en servicios** | `request` o `jsonify` importados desde `services`. | Prohibición explícita; servicios ejecutables desde script. |
| **Repository que recibe DTO** | `repository.create(CreateProductDTO)`. | Repositorios reciben IDs, entidades o parámetros simples. |
| **Mapper con lógica de negocio** | El mapper decide visibilidad o descuentos. | Los mappers solo transforman estructuras. |
| **Servicio gigante** | Servicio de 500+ líneas con múltiples responsabilidades. | `BK-04`: revisar y dividir. |
| **Excepciones crudas al cliente** | Devolver stacktraces o SQL. | Jerarquía de excepciones + manejador global. |
| **Caché preventiva** | Agregar Redis "por si acaso". | `BK-06`: No Cache en v1. |
| **Configuración dispersa** | Variables de entorno leídas en módulos sueltos. | `AD-11`: solo `core/config`. |
| **Transacciones largas** | Transacción abarca lecturas o llamadas externas. | `@transactional` solo en escritura; integraciones fuera. |
| **Confundir log con audit** | Eventos de negocio críticos solo en logs. | Audit es sistema separado; escrituras del panel van a `audit_logs`. |
| **Mockar solo lo fácil** | Tests de servicio levantan base de datos innecesariamente. | Repositorios mockeados en tests de servicio. |
| **Doble fuente de verdad de sesión** | Cookie + JWT + memoria. | `AD-37`: solo sesión de servidor con cookie. |
| **Validación solo en el frontend** | Backend confía en el cliente. | El backend valida siempre. |

---

# 24. Checklist para crear un nuevo módulo

Al agregar un nuevo recurso (por ejemplo, `promotions`):

- [ ] `Model` en `models/`.
- [ ] `Repository` en `repositories/`.
- [ ] `Service` en `services/`.
- [ ] `DTOs` en `dtos/`.
- [ ] `Mappers` en `mappers/`.
- [ ] `Validators` en `validators/` (si aplica validación reusable).
- [ ] `Schemas` en `schemas/`.
- [ ] `Controller` + `Blueprint` en `api/v1/public/` o `api/v1/admin/`.
- [ ] Tests unitarios para `Service`, `Repository`, `Mapper`, `Validator`.
- [ ] Tests de integración para `Controller`.
- [ ] Auditoría (`core/audit`) si el recurso tiene escrituras del panel.
- [ ] Permisos y guardas de rol si el recurso es del panel.
- [ ] Documentación en `10_BACKEND.md` y trazabilidad con `RN-xx`/`AD-xx`.

---

# 25. Dependencias con otros documentos

| Documento | Qué aporta a `10_BACKEND.md` |
|---|---|
| `01_ANALISIS_NEGOCIO.md` | Reglas `RN-xx` que los servicios implementan (`AD-03`). |
| `02_ARQUITECTURA.md` | Capas, `DEP-01`–`DEP-07`, `ERR-01`–`ERR-06`, `CFG-01`–`CFG-05`, `INT-01`–`INT-07`. |
| `02.1_DECISIONES_ARQUITECTONICAS.md` | Razonamiento de `AD-02`, `AD-03`, `AD-11`, `AD-12`, `AD-13`, `AD-14`, `AD-16`, `AD-37`, etc. |
| `04_BASE_DATOS.md` | Modelo físico, tablas, relaciones, soft delete, migraciones, semillas. |
| `05_API.md` | Endpoints, DTOs, envoltura `AD-16`, códigos HTTP, paginación, facetas. |
| `05.1_API_DATABASE_CROSS_REVIEW.md` | Precisiones de comportamiento de endpoints y errores. |
| `06_FRONTEND.md` | Contrato de consumo: frontend no decide, solo anticipa. |
| `07_PANEL_ADMIN.md` | Operaciones a auditar, matriz de permisos, flujos críticos. |
| `08_UI_SYSTEM.md` | Tokens visuales; no impacta backend directamente. |
| `09_COMPONENTES.md` | Componentes del panel que consumen endpoints backend. |
| `03_SEGURIDAD.md` | Sesiones, CSRF, headers, rate limiting, auditoría, errores seguros. |
| `10.0_BACKEND_ANALISIS_PREVIO.md` | Análisis previo aprobado con decisiones `BK-01` a `BK-06`. |

---

# 26. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Especificación de implementación del backend derivada de `10.0_BACKEND_ANALISIS_PREVIO.md` aprobado. Incluye bootstrap, ciclo de vida, capas, carpetas, excepciones, middleware, configuración, integraciones, transacciones, caché No Cache, logging, observabilidad, nombres, testing, eventos reservados, migraciones, decisiones `BK-01` a `BK-06`, anti-patrones y checklist de módulo. Aprobado tras Backend Review v1 con correcciones M-01 (SEO fuera de `/api/v1/`), M-02 (`BadRequestError` → `400`), M-03 (aclaración de `infrastructure`), O-01 (atributos de cookie), O-02 (soft delete en repositorios), O-03 (excepción `variant_id`), O-04 (responsabilidades de `errors.py`/`handlers.py`), O-05 (DTOs de entrada no obligatorios en v1). |
