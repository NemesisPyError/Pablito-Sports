# 11_TESTING.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Estrategia de Testing |
| **Código** | 11 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 07/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [03_SEGURIDAD.md](03_SEGURIDAD.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [05.1_API_DATABASE_CROSS_REVIEW.md](05.1_API_DATABASE_CROSS_REVIEW.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09_COMPONENTES.md](09_COMPONENTES.md) ✅ · [10_BACKEND.md](10_BACKEND.md) ✅ · [11.0_TESTING_ANALISIS_PREVIO.md](11.0_TESTING_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `12_DEPLOY.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Este documento es la **autoridad única** sobre qué se prueba, cómo se prueba, dónde se prueba y cuándo una funcionalidad de Pablito Sports tiene evidencia suficiente de calidad. Materializa los requisitos (`RN-xx`, `RF-xx`, `RNF-xx`), las decisiones arquitectónicas (`AD-xx`) y las decisiones de implementación (`BK-xx`) en casos de prueba ejecutables.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Estrategia, pirámide y tipos de prueba | — |
| Trazabilidad entre elementos aprobados y casos de prueba | — |
| Matriz de criticidad y cobertura mínima | — |
| Entornos de prueba y pipeline de CI | `12_DEPLOY.md` (infraestructura) |
| Datos de prueba y fixtures | — |
| Casos críticos obligatorios | — |
| Métodos de medición de rendimiento | — |
| Controles de seguridad a verificar | `03_SEGURIDAD.md` |
| Criterios de accesibilidad y responsive | `08_UI_SYSTEM.md` |
| Definition of Done | — |
| Verificación de esquemas | `04_BASE_DATOS.md` |

---

# 3. Alcance

## 3.1 Incluye

- Pruebas unitarias, de integración, de contrato de API, E2E, de seguridad, de rendimiento, de accesibilidad, de componentes, smoke y regresión.
- Validación de `RN-xx`, `RF-xx`, `RNF-xx`, `AD-xx`, `BK-xx`, `UDS-xx`, `COMP-xx`.
- Flujos críticos del catálogo, carrito, panel, seguridad, SEO y WhatsApp.
- Verificación de esquema local contra producción.
- T-ADP07-08: verificación en dispositivo real de WhatsApp.

## 3.2 No incluye

| Fuera de alcance v1 | Razón |
|---|---|
| Pentesting profesional | `03_SEGURIDAD.md` §3.3. |
| Tests de carga masiva o estrés industrial | Volumen previsto no lo justifica. |
| Moderación automática de contenido de imágenes | No requerido en v1. |
| Tests de recuperación ante desastres (DR) | Cubierto por `RNF-16` y `12_DEPLOY.md`. |

## 3.3 Relación con el Architecture Freeze

`02_ARQUITECTURA.md` v1.0.0 está congelado. Este documento no introduce arquitectura nueva; solo define cómo verificar decisiones aprobadas.

---

# 4. Definiciones

| Término | Definición en este documento |
|---|---|
| **Prueba unitaria** | Verificación aislada de una función, clase o componente. |
| **Prueba de integración** | Verificación de la combinación de capas con base de datos real. |
| **Prueba de contrato de API** | Verificación de request/response contra `05_API.md`, con servicios mockeables. |
| **Prueba E2E** | Verificación de flujos completos desde la interfaz hasta el backend. |
| **Smoke test** | Verificación rápida de que lo esencial funciona. |
| **Prueba de regresión** | Prueba que se añade tras un bug para evitar su reaparición. |
| **Fixture** | Conjunto de datos reproducibles para pruebas. |
| **p95** | Percentil 95: el 95% de las mediciones están por debajo de este valor. |

---

# 5. Responsabilidades

| Responsabilidad | Responsable |
|---|---|
| Aprobar estrategia de testing | Responsable del proyecto |
| Mantener este documento | Redactor de testing |
| Escribir y mantener pruebas | Implementador |
| Verificar que cada `RN-xx` tiene prueba asociada | Revisor |
| Validar esquema local contra producción | Implementador + Revisor |

---

# 6. Estrategia general

`11_TESTING.md` hace verificables los contratos de API y las reglas de negocio sin reemplazarlos. La calidad se mide por **trazabilidad** y **evidencia**, no solo por porcentajes de cobertura.

**Principios.**

1. Cada `RN-xx` tiene al menos un caso de prueba.
2. Los servicios críticos se prueban unitariamente con dependencias mockeadas.
3. Los endpoints públicos y administrativos tienen pruebas de contrato.
4. Los flujos críticos del usuario tienen pruebas E2E.
5. Toda corrección de bug incluye una prueba de regresión (`TEST-REG-01`).
6. Las pruebas de rendimiento se miden en condiciones reproducibles.

---

# 7. Pirámide de pruebas

```
            /
           /  \         E2E / Aceptación manual
          /____\
         /      \       Contrato de API
        /________\
       /          \     Integración
      /____________\
     /              \   Unitarias / Componentes
    /________________\
```

| Nivel | Tipo | Propósito | Velocidad | Cantidad |
|---|---|---|---|---|
| **Base** | Unitarias / Componentes | Validar funciones, hooks, componentes, mappers, validators, schemas. | Muy rápido | Muchas |
| **Media baja** | Integración | Validar combinaciones de capas del backend con base de datos real. | Rápido | Moderadas |
| **Media alta** | Contrato de API | Validar request/response de `05_API.md`. | Rápido | Moderadas |
| **Cima** | E2E / Manuales | Validar flujos completos del usuario. | Lento | Pocas |

## 7.1 Tipos de prueba

| Tipo | Descripción | Ejemplo |
|---|---|---|
| **Unitarias** | Funciones puras, clases y métodos aislados. | `PriceValidator`, `ProductMapper`, `useCart`. |
| **Componentes** | Renderizado e interacciones de componentes React. | `ProductCard`, `VariantSelector`. |
| **Integración** | Combinación de capas del backend con PostgreSQL. | `ProductService` + `ProductRepository`. |
| **Contrato de API** | Verificar que la API cumple `05_API.md`. | Status, envoltura `AD-16`, DTOs, errores. |
| **E2E** | Flujo completo interfaz → backend. | Catálogo → carrito → mensaje WhatsApp. |
| **Manuales de aceptación** | Validación humana de criterios de negocio. | Revisión visual de homepage. |
| **Smoke tests** | Verificación rápida de lo esencial. | Login, lista de productos, detalle. |
| **Regresión** | Suite ante cambios. | Antes de merge a `main`. |

## 7.2 Separación entre contrato de API e integración

| Aspecto | Contrato de API | Integración |
|---|---|---|
| **Objetivo** | Validar request/response de `05_API.md`. | Validar combinación de servicios + repositorios + BD. |
| **Base de datos** | Mockeada o mínima. | Real (PostgreSQL en contenedor). |
| **Velocidad** | Rápida. | Moderada. |
| **Ejemplo** | `POST /cart/revalidate` devuelve `200` con envoltura correcta. | El servicio calcula precio efectivo y guarda en BD. |

---

# 8. Matriz de criticidad

| Área | Criticidad | Cobertura mínima |
|---|---|---|
| Revalidación del carrito | 🔴 Alta | Unit + Integration + API Contract + E2E |
| Autenticación admin | 🔴 Alta | Integration + Security + E2E |
| Autorización y permisos | 🔴 Alta | Integration + Security + E2E |
| Promociones / precio efectivo | 🔴 Alta | Unit + Integration |
| Soft delete y restauración | 🔴 Alta | Integration + API Contract |
| Auditoría | 🔴 Alta | Integration + E2E |
| Filtros y búsqueda de catálogo | 🟡 Media | Unit + Integration + API Contract |
| SEO / metadatos para rastreadores | 🟡 Media | Integration + Manual |
| Subida y procesamiento de imágenes | 🟡 Media | Integration + Security |
| Banners | 🟢 Baja | Integration |
| Configuración de tienda | 🟢 Baja | Integration + API Contract |

---

# 9. Reglas de regresión

**TEST-REG-01.** Toda corrección de un bug debe incluir una prueba de regresión que **falle antes del fix y pase después del fix**. La prueba se incorpora a la suite permanente.

**TEST-REG-02.** Antes de cada merge a `main`, la suite de regresión completa debe ejecutarse sin fallos.

**TEST-REG-03 — Aislamiento temporal.** Los tests no deben depender de la fecha/hora real del sistema. Se utilizará reloj controlado o fixtures de tiempo congelado. Queda prohibido usar `now()` directamente en aserciones.

## 9.1 Política de estabilidad de tests (flaky tests)

| Aspecto | Regla |
|---|---|
| **Definición** | Un test con tasa de fallo intermitente > 2% en 30 ejecuciones se considera flaky. |
| **Bloqueo de releases** | Un flaky test no puede bloquear un release sin ticket de corrección asociado. |
| **Remediación** | Se registrará causa raíz, acción correctiva y fecha objetivo de remediación. |
| **Prevención** | Evitar sleeps fijos, dependencias de orden, datos compartidos entre tests y condiciones de carrera. |

---

# 10. Trazabilidad obligatoria

| Prefijo | Elemento | Evidencia esperada |
|---|---|---|
| `RN-xx` | Regla de negocio | Al menos un test unitario o de integración que demuestre cumplimiento y violación. |
| `RF-xx` | Requisito funcional | Al menos una prueba funcional (integración, E2E o manual). |
| `RNF-xx` | Requisito no funcional | Método de medición reproducible + criterio de aceptación numérico. |
| `AD-xx` | Decisión arquitectónica | Prueba cuando sea verificable. |
| `BK-xx` | Decisión de implementación backend | Tests que validen estructura de capas y prohibiciones. |
| `UDS-xx` / `COMP-xx` | Token o componente UI | Pruebas visuales o de componentes. |

**Regla.** Si un `RN-xx` no tiene al menos un caso de prueba asociado, la funcionalidad no puede darse por implementada.

---

# 11. Matriz Documento → Testing

| Documento | Qué se valida | Tipos de prueba |
|---|---|---|
| `03_SEGURIDAD.md` | Autenticación, autorización, CSRF, XSS, SQL Injection, uploads, rate limiting, sesiones, headers, CSP. | Integración, E2E, seguridad. |
| `04_BASE_DATOS.md` | Constraints, índices, integridad referencial, soft delete, migraciones, rendimiento de facetas. | Integración, rendimiento, validación de esquema. |
| `05_API.md` | Endpoints, métodos, DTOs, envoltura `AD-16`, paginación, filtros, códigos de error. | Contrato de API, integración. |
| `06_FRONTEND.md` | Flujos críticos del catálogo, carrito, navegación, manejo de errores, SEO. | Unitarias, componentes, integración, E2E. |
| `07_PANEL_ADMIN.md` | CRUD de productos, marcas, categorías, promociones, banners, permisos, auditoría. | Integración, E2E, seguridad. |
| `08_UI_SYSTEM.md` | Tokens visuales, consistencia, accesibilidad. | Componentes, visuales, accesibilidad. |
| `09_COMPONENTES.md` | Comportamiento de componentes reutilizables, estados, props, eventos. | Unitarias, componentes. |
| `10_BACKEND.md` | Capas, dependencias, excepciones, transacciones, mappers, repositories, services. | Unitarias, integración, contrato de API. |

---

# 12. Tipos de pruebas por capa

## 12.1 Base de datos

| Aspecto | Método |
|---|---|
| Constraints y CHECK | Tests de integración que intenten violarlos. |
| Índices | `EXPLAIN ANALYZE` en consultas críticas; medir p95. |
| Soft delete | Verificar que `DELETE` lógico no borra filas y que consultas activas excluyen eliminadas. |
| Integridad referencial | Tests de migraciones y constraints. |
| Migraciones | Comparación estructural local/producción. |

## 12.2 Repositorios

| Aspecto | Método |
|---|---|
| Consultas | Tests de integración con base de datos real de pruebas. |
| Persistencia | Crear, actualizar, eliminar lógicamente entidades. |
| Filtros y ordenamiento | Verificar que los filtros de `05_API.md` se traducen correctamente. |
| Soft delete | `find_active` no devuelve filas eliminadas. |

## 12.3 Servicios

| Aspecto | Método |
|---|---|
| Reglas de negocio (`RN-xx`) | Tests unitarios con repositorios mockeados. |
| Transacciones | Verificar rollback ante excepciones. |
| Coordinación de repositorios | Tests de integración leve. |
| Integraciones externas | Mockear adaptadores; verificar `IntegrationError`. |

## 12.4 API

| Aspecto | Método |
|---|---|
| Contrato HTTP | Status, headers, envoltura `AD-16`. |
| Autenticación y autorización | `401`, `403`, cookies, CSRF. |
| Paginación | `page`, `per_page`, `total`, `total_pages`. |
| Filtros y ordenamiento | Combinaciones de parámetros, orden canónico. |
| Errores | Mapeo de excepciones a códigos HTTP. |

## 12.5 Frontend

| Aspecto | Método |
|---|---|
| Hooks y utilidades | Unitarias. |
| Componentes | Renderizado, interacciones, estados de carga/error. |
| Flujos de catálogo | Integración/E2E. |
| Carrito | Integración/E2E con LocalStorage. |
| SEO | Validación de metadatos y datos estructurados. |

## 12.6 Panel administrativo

| Aspecto | Método |
|---|---|
| CRUD | Integración contra mocks de API y E2E. |
| Permisos | `403` en endpoints restringidos; guardas de rutas. |
| Auditoría | Verificar que las escrituras generan filas en `audit_logs`. |
| Accesibilidad | Navegación por teclado, lectores de pantalla. |

## 12.7 Componentes

| Aspecto | Método |
|---|---|
| Props y eventos | Unitarias con React Testing Library. |
| Estados visuales | Cargando, vacío, error, deshabilitado. |
| Tokens del UI System | Verificar que usan variables de diseño. |

## 12.8 Integración externa

| Aspecto | Método |
|---|---|
| Adaptadores externos | Mockear respuestas; verificar traducción de errores (`ERR-06`). |
| WhatsApp | Validar generación de enlace `wa.me` y longitud del mensaje (`T-ADP07-01` a `T-ADP07-08`). |

## 12.9 Seguridad

| Aspecto | Método |
|---|---|
| Autenticación | Login válido/inválido, expiración por inactividad, logout. |
| Autorización | `401`/`403` en endpoints protegidos. |
| CSRF | Escrituras sin token o con token incorrecto. |
| XSS | Inyección de scripts en campos de texto. |
| SQL Injection | Intento de inyección en `q`, filtros y parámetros. |
| Uploads | Archivos no imagen, doble extensión, tamaño excesivo. |
| Rate limiting | Superar límites y verificar `429`. |
| Cookies | Atributos `HttpOnly`, `Secure`, `SameSite`. |
| CSP | Headers correctos en respuestas. |

---

# 13. Entornos

| Entorno | Qué se ejecuta | Cuándo |
|---|---|---|
| **Local** | Unitarias, integración leve, contrato de API. | Durante el desarrollo. |
| **CI** | Pipeline obligatoria: lint, type check, unit, integration, contract, coverage, build. | En cada push/PR. |
| **Staging** | E2E, smoke tests, seguridad básica, rendimiento con datos representativos. | Antes de release. |
| **Producción** | Solo smoke tests y monitoreo. | Post-despliegue. |

---

# 14. Datos de prueba

## 14.1 Datasets reproducibles

| Dataset | Contenido mínimo |
|---|---|
| **Usuarios** | Administrador, superadministrador, usuario inactivo. |
| **Productos** | Activo, inactivo, eliminado, destacado, nuevo, en oferta, sin stock. |
| **Variantes** | Activa, eliminada, con talles distintos. |
| **Promociones** | Vigente, vencida, futura, por producto/categoría/marca. |
| **Banners** | Activo, vencido, en posición específica. |
| **Imágenes** | Válidos (jpg, png, webp) e inválidos (pdf, exe, gif animado). |
| **Carrito** | Vacío, ítems válidos, ítems obsoletos, 26 ítems (`RN-75`). |
| **Auditoría** | Registros de escritura del panel. |
| **Historial de precios** | Cambios de precio con administrador y fecha. |

## 14.2 IDs de semilla congelados

| Entidad | ID | Slug |
|---|---|---|
| Administrador base | `ADMIN_ID = 1` | — |
| Superadministrador | `SUPER_ADMIN_ID = 2` | — |
| Marca Nike | `BRAND_NIKE_ID = 1` | `nike` |
| Categoría Botines | `CATEGORY_BOTINES_ID = 1` | `botines` |
| Género Unisex | `GENDER_UNISEX_ID = 1` | `unisex` |
| Tipo de talle numérico | `SIZE_TYPE_NUMERIC_ID = 1` | `footwear_numeric` |
| Producto base | `PRODUCT_BASE_ID = 1` | `botin-nike-mercurial` |
| Variante base | `VARIANT_BASE_ID = 1` | — |

> **Regla.** Los seeds de testing son inmutables. Un cambio de ID requiere actualizar todos los tests que lo referencian.

## 14.3 Reglas de datos

1. Los fixtures se cargan mediante semillas o factories, nunca con datos de producción.
2. Cada test arranca con un estado conocido y lo limpia al final.
3. Las imágenes de prueba viven en `tests/fixtures/images/` y son pequeñas (< 50 KB).

---

# 15. Casos críticos

| # | Caso | Origen | Tipo de prueba |
|---|---|---|---|
| 1 | Revalidación del carrito (precio, disponibilidad, producto oculto, variante eliminada) | `AD-25`, `AD-28`, `RN-56` | Unit + Integration + API Contract + E2E |
| 2 | Soft delete de productos, marcas, categorías | `AD-18` | Integration + API Contract |
| 3 | Restauración de productos y reconciliación | `AR-04`, `CONS-04` | Integration |
| 4 | Promociones concurrentes y precio efectivo | `RN-30`–`RN-38b`, `RN-32`, `RN-35` | Unit + Integration |
| 5 | Variante eliminada referenciada por un carrito | `AD-25` | Integration |
| 6 | Restauración de variante eliminada y revalidación de carrito previo | `AD-15`, `AD-25`, `AD-28` | Integration + E2E |
| 7 | Edición concurrente del mismo producto con auditoría consistente (Admin A cambia precio, Admin B cambia promoción) | `AD-20`, `RN-70`, `CONS-04` | Integration |
| 7b | Creación concurrente de dos productos con el mismo slug | `AD-19`, `RN-10` | Integration |
| 7c | Creación concurrente de promociones con rango de fechas solapado | `RN-36`, `RN-30`–`RN-38b` | Integration |
| 8 | Producto oculto/eliminado en API pública devuelve `404` | `AD-12`, `RN-01`, `RN-02` | Contrato API |
| 9 | Historial de precios tras cambio | `RN-70` | Integration |
| 10 | Auditoría de escrituras del panel | `AD-20` | Integration + E2E |
| 11 | Permisos de administrador vs. superadministrador | `RN-66`, `RN-67` | Seguridad + E2E |
| 12 | SEO: metadatos para rastreadores | `AD-09`, `RNF-10` | Contrato API + Manual |
| 13 | Generación de mensaje de WhatsApp y límite de longitud | `RN-75`, `RN-76`, `ADP-07` | E2E + Dispositivo real (`T-ADP07-08`) |
| 14 | Login fallido y rate limiting | `03_SEGURIDAD.md` §14 | Seguridad |
| 15 | Subida de imagen inválida | `03_SEGURIDAD.md` §11 | Seguridad |
| 16 | CSRF en escrituras del panel | `03_SEGURIDAD.md` §8 | Seguridad |

---

# 16. Rendimiento

## 16.1 Método de medición estándar

| Elemento | Valor |
|---|---|
| **Entorno** | Staging con infraestructura similar a producción. |
| **Dataset** | 2.000 productos activos, 10 marcas, 15 categorías, 5 deportes, 30 talles. |
| **Herramienta** | `pytest-benchmark` / `locust` para backend; Lighthouse CI para frontend. |
| **Iteraciones** | Mínimo 5 por escenario. |
| **Métrica** | Percentil 95 (p95). |
| **Cálculo del p95** | Sobre el conjunto total de observaciones (`n = repeticiones × requests`), no sobre promedios de cada repetición. |
| **Criterio de disparo** | Si p95 supera el umbral, se mide, se identifica el cuello de botella y se decide índice u optimización (`AD-35`). |

## 16.2 Objetivos

| Requisito | Métrica | Método |
|---|---|---|
| `RNF-01` | LCP < 2,5 s en 4G | Lighthouse CI; throttling 4G; 5 repeticiones; p95. |
| `RNF-02` | API de catálogo < 300 ms (p95) | `pytest` + `EXPLAIN ANALYZE`; dataset representativo; 5 repeticiones; p95. |
| `RNF-03` | Imágenes optimizadas y con lazy loading | Lighthouse + inspección de markup. |
| `RNF-07` | Todo producto alcanzable en ≤ 3 interacciones | E2E en viewport 390 px. |
| Facetas | p95 de consulta con facetas < 300 ms | Staging; dataset representativo; 5 repeticiones; p95. |
| Revalidación del carrito | < 300 ms con 26 ítems | Integración con fixture de 26 ítems; 5 repeticiones; p95. |

## 16.3 Reglas

1. Las pruebas de rendimiento se ejecutan en staging, no en CI.
2. Cada índice nuevo debe justificarse con una medición (`AD-35`).
3. Si el p95 supera el umbral, se documenta el plan de mitigación antes de release.

---

# 17. Seguridad

| Control | Qué se prueba | Tipo |
|---|---|---|
| Autenticación | Login válido/inválido, expiración por inactividad, logout. | Integración / E2E |
| Autorización | `401`/`403` en endpoints protegidos. | Contrato API / Seguridad |
| CSRF | Escrituras sin token o con token incorrecto. | Seguridad |
| XSS | Inyección en descripciones, nombres, mensajes de error. | Seguridad |
| SQL Injection | Intento de inyección en `q`, filtros y parámetros. | Seguridad |
| Subida de imágenes | MIME, extensión, magic bytes, tamaño, doble extensión. | Seguridad |
| Rate limiting | Login, API pública, subida de imágenes. | Seguridad |
| Sesiones | Atributos de cookie, invalidación. | Seguridad |
| CSP y headers | `Strict-Transport-Security`, `X-Frame-Options`, etc. | Seguridad |

---

# 18. Accesibilidad y responsive

## 18.1 Accesibilidad (WCAG 2.1 nivel AA)

| Criterio | Método de verificación |
|---|---|
| Foco visible | Inspección visual y navegación con teclado. |
| Navegación por teclado | Todos los controles interactivos alcanzables sin mouse. |
| Labels asociados | `axe-core` o Lighthouse; verificar `htmlFor`/`aria-label`. |
| Contraste AA | Lighthouse / inspección de tokens de color. |
| Orden lógico de tabulación | Navegación secuencial coherente con el flujo visual. |
| Mensajes de error anunciables | Verificar `role="alert"` o `aria-live`. |

## 18.2 Responsive: dispositivos de referencia

| Ancho | Dispositivo de referencia |
|---|---|
| 360 px | Móvil pequeño (baseline de aceptación mínimo). |
| 390 px | Móvil estándar (iPhone 14, baseline principal). |
| 768 px | Tablet vertical. |
| 1024 px | Tablet horizontal / escritorio pequeño. |
| 1440 px | Escritorio estándar. |

> **Baseline de aceptación:** 390 px. Toda funcionalidad crítica del catálogo público debe funcionar correctamente desde 390 px en adelante.

---

# 19. Definition of Done

Una funcionalidad se considera terminada cuando cumple, como mínimo:

- [ ] Documentación actualizada (`10_BACKEND.md`, `06_FRONTEND.md`, etc. según corresponda).
- [ ] Pruebas unitarias que cubren las reglas de negocio (`RN-xx`).
- [ ] Pruebas de integración para flujos que cruzan capas.
- [ ] Contratos de API validados (si expone endpoints).
- [ ] Sin regresiones: la suite completa de CI pasa.
- [ ] Revisión de código aprobada.
- [ ] Esquema local verificado contra producción (si aplica cambio de base de datos).
- [ ] Auditoría verificada para operaciones críticas del panel: cambio de precio, eliminación lógica, restauración, cambio de contraseña, publicación de banner (`AD-20`).

---

# 20. Automatización en CI

## 20.1 Pipeline obligatoria (bloquea merge)

| Paso | Herramienta sugerida |
|---|---|
| Lint | ESLint (frontend), Flake8/Ruff (backend). |
| Type checking | TypeScript (`tsc`). |
| Unit tests | Jest / Vitest (frontend), pytest (backend). |
| Integration tests | pytest + testcontainers (backend), React Testing Library (frontend). |
| API contract tests | pytest + Flask test client + esquemas de `05_API.md`. |
| Cobertura | cobertura de pytest / Vitest coverage. |
| Build | Vite build, Docker build backend. |

## 20.2 Pipeline opcional / nightly

| Paso | Herramienta sugerida | Frecuencia |
|---|---|---|
| E2E completo | Playwright / Cypress | Nightly o antes de release. |
| Pruebas de rendimiento | Lighthouse CI, `pytest-benchmark`, `locust` | Antes de release. |
| Security scan | `bandit` (Python), `npm audit`, `safety` | Semanal o antes de release. |
| Smoke tests en staging | Scripts de salud | Post-despliegue a staging. |

---

# 21. Cobertura basada en riesgo

No se fija un porcentaje arbitrario global. La cobertura se exige por tipo de elemento:

| Elemento | Cobertura esperada |
|---|---|
| Reglas de negocio (`RN-xx`) | 100% deben tener al menos un caso de prueba. |
| Servicios críticos | Todos los métodos públicos con lógica de negocio. |
| Endpoints públicos y administrativos | Todos deben tener pruebas de contrato. |
| Correcciones de bugs | Cada fix debe incluir una prueba de regresión (`TEST-REG-01`). |
| Mappers y validators | Cobertura alta (> 80%) por ser lógica pura. |
| Componentes compartidos | Cobertura de estados y eventos principales. |

**Métricas orientativas.**

- Backend servicios: ≥ 80%.
- Backend repositorios: ≥ 70%.
- Frontend utilidades/hooks: ≥ 80%.
- Frontend componentes: ≥ 70%.

La cobertura numérica no sustituye la trazabilidad con `RN-xx`.

---

# 22. Verificación de esquemas

> Antes de considerar completa cualquier modificación que afecte el esquema de la base de datos, debe verificarse que los esquemas de desarrollo/local y producción sean equivalentes mediante migraciones y comparación estructural.

**Proceso.**

1. Generar migración con Alembic.
2. Aplicar `upgrade` en entorno local.
3. Ejecutar tests de integración.
4. Comparar esquema local contra producción (estructura + índices + constraints).
5. Solo después, considerar la tarea finalizada.

> **Regla.** La comparación de esquemas debe realizarse mediante migraciones aplicadas y comparación estructural; **no se considera válida una verificación visual manual**.

**Elementos verificados.**

- Columnas, tipos y nullable.
- Claves primarias y foráneas.
- Constraints (`CHECK`, `UNIQUE`).
- Índices y índices parciales.
- Semillas obligatorias.

**Criterio de aprobación de release.** Una release no se considera aprobada si existen divergencias entre los esquemas de local, CI, staging y producción.

---

# 23. Dependencias con otros documentos

| Documento | Qué aporta a `11_TESTING.md` |
|---|---|
| `01_ANALISIS_NEGOCIO.md` | `RN-xx`, `RF-xx`, `RNF-xx`, casos de uso, riesgos. |
| `02_ARQUITECTURA.md` | Principios de calidad, `OA-09`, riesgos `AR-xx`. |
| `02.1_DECISIONES_ARQUITECTONICAS.md` | `AD-xx` verificables y no verificables. |
| `03_SEGURIDAD.md` | Controles de seguridad a probar. |
| `04_BASE_DATOS.md` | Esquema, constraints, migraciones, rendimiento de facetas. |
| `05_API.md` | Contratos a validar. |
| `06_FRONTEND.md` | Flujos críticos del frontend. |
| `07_PANEL_ADMIN.md` | Flujos críticos del panel. |
| `08_UI_SYSTEM.md` | Tokens y accesibilidad. |
| `09_COMPONENTES.md` | Componentes a probar. |
| `10_BACKEND.md` | Capas, dependencias, decisiones `BK-xx`. |
| `11.0_TESTING_ANALISIS_PREVIO.md` | Análisis previo aprobado. |
| `evidencia/ADP-07/INFORME_ADP-07.md` | Casos base `T-ADP07-01` a `T-ADP07-08`. |

---

# 24. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Estrategia formal de testing derivada de `11.0_TESTING_ANALISIS_PREVIO.md` aprobado. Incluye pirámide, criticidad, reglas `TEST-REG-01` a `TEST-REG-03`, política de flaky tests, trazabilidad, matriz Documento → Testing, tipos por capa, entornos, datos de prueba, casos críticos (incluyendo concurrencia y auditoría), rendimiento con cálculo correcto del p95, seguridad, accesibilidad, responsive, DoD, CI, cobertura basada en riesgo y verificación de esquemas. |
