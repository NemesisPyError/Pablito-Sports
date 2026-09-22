# 13_CHANGELOG.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Registro de Cambios |
| **Código** | 13 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 09/08/2026 |

---

# 2. Objetivo

Este documento registra los cambios significativos del proyecto Pablito Sports. Separa la **fase de especificación** (documentación de negocio, arquitectura, diseño, seguridad, testing, despliegue y guía de IA) de la **fase de implementación** (código, migraciones, tests y despliegues).

Cada entrada debe ser breve, factual y trazable a un documento, decisión o fase del roadmap.

---

# 3. Convenciones

Este changelog sigue el formato:

```
## [Versión o fecha] — Título

### Agregado
- ...

### Cambiado
- ...

### Corregido
- ...

### Aprobado
- ...

### Implementado
- ...
```

Las categorías se usan según el tipo de cambio:

| Categoría | Uso |
|---|---|
| `Agregado` | Nuevos documentos, funcionalidades, componentes o fases. |
| `Cambiado` | Modificaciones a documentos o comportamientos aprobados. |
| `Corregido` | Errores, inconsistencias o ajustes menores. |
| `Aprobado` | Conclusión de revisión de un documento o fase. |
| `Implementado` | Código, migraciones, tests o despliegues ejecutados. |

---

# 4. Historial

## [19/09/2026] — Manual del administrador y respaldo de imágenes

### Agregado
- `docs/manual/Pablito_Sports_Manual_del_Administrador.pdf` (5 páginas): ingreso, Dashboard,
  carga de productos, listado, registro de ventas, categorías/marcas, promociones, banners,
  configuración, usuarios y problemas frecuentes. Redactado con los textos reales del panel.
  Aclara lo que **no** se cambia desde el panel (razón social, RUC y textos legales).
- `scripts/prod/backup-uploads.sh`: respalda `originals/`. `12_DEPLOY.md` §13.1 pide copia
  diaria de las imágenes originales y el checklist §23.2 exige «backup de base de datos e
  imágenes», pero ningún script lo hacía: restaurar solo la base dejaba el catálogo sin fotos.

### Corregido
- `backup-db.sh` escribía el volcado directo a su nombre final: una falla a mitad de camino
  dejaba un `.dump` vacío o cortado indistinguible de un backup. Ahora usa un temporal y valida
  con `pg_restore --list` antes de renombrar.
- `verify-backup.sh` dejaba una base `verify_*` huérfana si la restauración fallaba, y daba por
  bueno un dump sin administradores (nadie podría entrar al panel). Ahora limpia siempre, falla
  en ese caso y, opcionalmente, valida también el respaldo de imágenes.
- Probado con un `docker` simulado (fallo, salida vacía, dump ilegible); **no** contra
  Postgres real: falta ejecutarlo con la pila levantada.

---

## [19/09/2026] — Íconos, imagen para compartir y datos estructurados de la tienda

### Agregado
- `frontend/public/`: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (monograma
  «PS» en Archivo ExtraBold sobre `--color-ink-900`) y `og-default.png` (1200×630, con
  el wordmark tipográfico del pie). `index.html` los enlaza y suma `theme-color` y una
  descripción por defecto. Sin `site.webmanifest`: la CSP de producción
  (`default-src 'none'`) lo bloquearía y una PWA está fuera de v1.
- `SeoService._store_schema`: `Schema.org/SportingGoodsStore` en `/_seo/catalog`, que
  Nginx entrega también a los rastreadores que piden `/`. Usa solo lo que la
  configuración pública ya publica (nombre, WhatsApp como teléfono, dirección, redes);
  el horario queda fuera por ser texto libre.

### Cambiado
- Toda página sin imagen propia (portada, catálogo, categorías, productos sin fotos)
  cae a `og-default.png` en Open Graph y Twitter, en backend (`DEFAULT_SHARE_IMAGE`) y
  frontend (`resolveMeta`), y la tarjeta pasa a ser siempre `summary_large_image`. El
  dato estructurado de un producto sigue llevando solo fotos reales.
- Tests: 4 nuevos en `test_seo.py`; `pageMeta.test.js` actualizado al nuevo contrato.
- Carrito vacío: `CartPage` usa `EmptyState` con «Ver catálogo» en lugar de una línea
  gris sin salida. Test nuevo en `CartPage.test.jsx`.
- Accesibilidad: `EmptyState` y los avisos de verificación del carrito son regiones
  `role="status"`, para que un lector de pantalla anuncie «no encontramos productos» o
  «precios verificados» al aparecer.

---

## [19/09/2026] — Datos del titular cargados en las páginas legales

### Agregado
- `LEGAL_ENTITY` en `legalContent.js` ahora trae razón social (Pablito Sports),
  RUC (4357800-4) y un correo de respaldo (pablo.caballeroirala@gmail.com). La
  ficha «Datos del titular» de los Términos del Servicio muestra razón social y
  RUC; el correo aparece en esa ficha y en «Canales de contacto y reclamos».

### Cambiado
- El correo sigue saliendo primero de la historia de la tienda (panel); el de
  `LEGAL_ENTITY` solo se usa si el administrador no cargó uno.

---

## [11/09/2026] — Textos legales publicados en el sitio

El cliente aprobó el documento de políticas (`docs/legal/Pablito_Sports_Politicas_Legales.pdf`).
Las cuatro rutas del pie dejan de mostrar «Estamos preparando este contenido».

### Agregado
- `features/store/legal/legalContent.js`: los textos aprobados, repartidos en
  Términos del Servicio, Política de Privacidad, Política de Envío y Reembolso y
  Preguntas Frecuentes. Los anexos internos del PDF no se publican.
- `LegalPage`: un solo componente para las cuatro rutas. WhatsApp, dirección,
  horario y redes salen de la configuración de la tienda; el correo, de
  `/store/about`. Una fila sin dato se omite en lugar de mostrarse vacía.
- `LEGAL_ENTITY` en `legalContent.js`: único lugar para razón social, RUC y días
  de reserva para retiro, que no existen en el sistema. Mientras sean `null`, no
  se muestran.
- 16 tests en `LegalPage.test.jsx`.

### Cambiado
- Se retira `LegalPlaceholderPage`, reemplazada por `LegalPage`.
- Las referencias cruzadas por número de sección del PDF («ver la Sección 6»)
  pasan a nombrar la página, porque en el sitio cada política vive por separado.

---

## [10/09/2026] — Sexos por categoría, para ordenar el menú desde el panel

Hasta ahora cada categoría raíz aparecía automáticamente bajo Hombres, Mujeres
e Infantil, y la única forma de sacar una de ahí era agregar su slug a una lista
escrita en `navAxes.js`. Ahora la categoría declara a qué sexos aplica y el
administrador lo controla desde el panel. Pedido explícito del usuario.

### Añadido — esquema (migración `c5b1f0a72e14`)
- Nueva tabla `category_genders` (`category_id`, `gender_id`), clave primaria
  compuesta, sin columna propia ni marcas de tiempo. Mismo patrón que
  `product_genders`.
- **Sin backfill, a propósito** (`AD-41`): la ausencia de filas significa «sin
  restricción», así que al aplicar la migración el menú se ve exactamente igual
  que antes y ninguna categoría cargada necesita tocarse.

### Añadido — backend
- `Category.genders` con `lazy="selectin"`: el árbol público carga los sexos de
  todas las categorías en una consulta extra, no una por categoría.
- `AdminCategoryService` acepta `gender_ids` en el alta y la edición, y lo
  devuelve en `CategoryAdminDTO`. El `PUT` reemplaza la lista completa; un id
  inexistente responde `422` en vez de colarse como `None` en la relación.
- Como el snapshot de auditoría se deriva del DTO, el cambio de sexos queda
  registrado en `audit_logs` sin código adicional (`AD-20`).
- `CategoryTreeDTO` suma `genders` (slugs, no ids — `AD-12`) y sus `children`
  pasan a `CategoryNodeDTO`, que también los lleva: una subcategoría puede
  restringirse sin que la madre lo esté.
- Solo se publican los sexos activos: uno desactivado deja de existir para el
  catálogo y no debe seguir restringiendo la navegación.

### Añadido — panel
- El formulario de categoría suma **Sexos de esta categoría**: cinco casillas
  (Hombre, Mujer, Unisex, Niño, Niña) con el texto de ayuda que explica a qué
  menú corresponde cada una.
- Una categoría nueva nace con las cinco tildadas. No cambia el resultado
  —tildar todo y no tildar nada se ven igual— pero le muestra al administrador
  que el campo existe. Mismo criterio que `show_in_strip` en marcas.

### Cambiado — tienda
- `MegaMenu`: cada eje de sexo muestra solo las categorías que declaran ese
  sexo. Las subcategorías se filtran dentro de su columna, y la columna
  desaparece si no queda nada. Una raíz que no aplica sobrevive si alguna hija
  sí aplica, porque `AD-29` hace que filtrar por el padre incluya a los
  descendientes.
- Catálogo: el desplegable de categorías oculta las que no corresponden al sexo
  que el cliente ya está filtrando. Sin filtro de sexo se muestran todas. La
  categoría ya seleccionada nunca se esconde, para que el desplegable no quede
  en blanco mostrando productos filtrados por ella.
- La regla vive en `shared/utils/categoryGenders.js` y no dentro de una feature:
  la aplican dos pantallas que no deben depender una de la otra.

### Implementado — tests
- `categoryGenders.test.js`: la regla de intersección, la lista vacía como «sin
  restricción», y la raíz que sobrevive por sus hijas.
- `navAxes.test.js`: nuevos casos de filtrado por eje. Los casos anteriores usan
  categorías sin `genders`, así que también comprueban la compatibilidad hacia
  atrás.
- `test_category_genders.py`: contrato del panel (alta, reemplazo por `PUT`,
  lista vacía, `422` por id inexistente, duplicados, auditoría) y del árbol
  público (slugs, hijas).
- `category_genders` se suma a las listas de vaciado de `tests/fixtures/catalog.py`
  y `scripts/seed_dev_data.py`: la FK es `RESTRICT` y sin eso el reset falla en
  cuanto una categoría tenga sexos.

### Documentación
- `01` v2.7.0 (`RN-83`) · `02.1` (`AD-41`) · `04` v1.7.0 (§9.2.16) ·
  `05` v1.10.0 · `07` v1.15.0 (§14.4) · `09` v2.10.0 (§9.8, `COMPP-09`).

---

## [09/09/2026] — Registro manual de ventas desde el panel de Productos

Permite registrar una venta de una o varias líneas y descontar el stock de cada
variante, en una sola transacción.

### Añadido — esquema (migración `e6a2b91c73df`)

`sales` era una fila por variante vendida: sin precio y sin forma de saber qué
líneas fueron juntas. Se agrega lo mínimo para una venta multilínea con snapshot
de precio:

- **`sale_orders`** (nueva): cabecera con `administrator_id`, `total_amount`
  (`INTEGER`, como `products.list_price` — el guaraní no tiene subunidad) y
  `created_at`. Inmutable, mismo patrón que `price_history` (RN-70).
- **`sales`** suma `sale_order_id` y `unit_price`, **ambas nulas**: las filas
  anteriores no tienen cabecera ni precio, y rellenarlas con el precio de hoy
  sería inventar un dato histórico. `unit_price IS NULL` significa "venta previa
  al registro manual", no "vendida a cero".

Verificada desde una base limpia (`flask db upgrade` completo) y reversible
(`downgrade` deja el esquema anterior exacto).

### Añadido — backend

- `POST /api/v1/admin/sales` (05_API.md §9.19), en `api/v1/admin/sales.py`.
  Requiere sesión administrativa; 60 por minuto y por sesión.
- `schemas/sale_schemas.py`: validación estricta de tipos (S-13), rechazo de la
  misma variante dos veces y cotas que evitan el desborde de `INTEGER`.
- `AdminProductService.register_manual_sale`, bajo `@transactional`.
- `SaleRepository.create_order`; `record()` acepta cabecera y precio.
- El detalle administrativo de producto expone `effective_price`, para que el
  panel proponga el precio vigente sin reimplementar la regla en el cliente.

### Cambiado — un solo mecanismo de descuento de stock

Se extrae `_sell_locked_variant`: bloquear, comprobar, descontar, registrar la
línea, recalcular disponibilidad y auditar. La venta de una sola variante que ya
existía (`POST /products/{id}/variants/{id}/sales`) y la venta manual entran las
dos por ahí, en vez de tener cada una su copia. Su contrato HTTP no cambia.

### Corregido — el bloqueo de fila de S-04 podía leer un valor viejo

`find_variant_for_update` hacía `SELECT ... FOR UPDATE`, pero
`session.execute(select(...))` devuelve la instancia que ya esté en el *identity
map* **sin releer sus columnas**. Si algo había cargado la variante antes en la
misma petición —la venta manual carga el producto para resolver el precio—, el
candado se tomaba pero `variant.quantity` seguía siendo el valor leído *antes* de
esperarlo: dos ventas concurrentes volvían a perder una.

Se añade `execution_options(populate_existing=True)`. Lo encontró el test de dos
ventas concurrentes que **sí** caben en stock: ambas respondían 201 y solo una
descontaba.

### Corregido — desborde monetario devolvía 500

Una cantidad absurda (99.999 × ₲585.000) hacía que `total_amount` no entrara en
la columna `INTEGER` y el insert de la cabecera reventara. Lo encontró la
verificación E2E. Ahora hay cotas por campo y una comprobación del total: 422.

### Añadido — frontend

- "Registrar venta" en el listado de Productos, con modal
  (`ManualSaleDialog.jsx`) sobre el marcado de `ConfirmDialog`.
- `utils/manualSale.js`: aritmética y reglas de las líneas, en funciones puras.
- `hooks/useManualSale.js`: **sin actualización optimista**. Se invalidan las
  variantes de cada producto vendido, el detalle, el listado y el dashboard, y se
  vuelve a leer: el servidor es el único que sabe cómo quedó cada stock.
- Una variante sin stock no aparece en el desplegable; volver a elegir la misma
  variante suma a la línea existente en vez de duplicarla.

### Verificación (Docker)

- **Backend:** 889 pasan, 1 omitido, 0 fallos (44 nuevos). `ruff check` limpio.
- **Frontend:** 712 tests en 38 archivos, 0 fallos (78 nuevos). `eslint` 0
  errores. `vite build` correcto.
- **E2E contra el stack:** venta de una línea y multilínea con descuento correcto,
  rechazo `409` por stock insuficiente, **sin descuento parcial** cuando falla una
  de dos líneas, validación de entrada y rechazo sin sesión.
- **Migración:** aplicada sobre base limpia y sobre la base de desarrollo.

### Limitaciones

- No hay pantalla de historial de ventas: no existía antes y §10 del pedido
  indica no construirla salvo que sea imprescindible. Las ventas quedan
  correctamente almacenadas para incorporarlo después.
- No se pudo comparar el esquema contra una base de **producción**: no hay
  ninguna desplegada (los volúmenes `pablito-prod_*` son de una prueba aislada
  anterior, sin stack en ejecución).
- El flujo del panel no se recorrió en navegador: exigiría escribir la contraseña
  del administrador en el formulario de login. Se cubrió con 33 tests del
  diálogo real y con el E2E contra la API.

---

## [09/09/2026] — Vuelve «Configuración» al panel; arreglos de navegación y búsqueda

### Corregido — «Configuración» era inalcanzable

v1.6.0 retiró del menú **Configuración**, **Plantilla WhatsApp** y **Datos del
sistema** a pedido del usuario, dejando el código en su sitio a propósito. El
efecto no previsto: `SettingsPage` es la única pantalla que edita dirección,
horarios, WhatsApp, redes sociales y el texto y la foto de "Nuestra historia".
Sin ruta ni ítem de sidebar, esos contenidos dejaron de ser administrables.

Lo detectó el usuario por el camino más directo: el texto público de "Nosotros"
decía «reemplazalo desde el panel de administración → Configuración → Nuestra
historia» y ese lugar no existía.

- `AdminRoutes.jsx`: vuelve `<Route path="settings">`, fuera de
  `RequireSuperAdmin` (§8.2: `manage_store_settings`, rol mínimo Administrador).
- `AdminSidebar.jsx`: vuelve el ítem "Configuración", visible para ambos roles.
- `AdminIcon.jsx`: se suma el glifo `settings` (engranaje), sin dependencias.
- `features/admin/index.js`: se exportan `SettingsPage` y `settingsApi`.
- **Plantilla WhatsApp** y **Datos del sistema** siguen fuera: nadie las pidió,
  y Configuración ya no las enlaza, así que no reaparece ningún enlace muerto.
- Contenido: se quitó de `store_settings.about_text` el párrafo
  «(Texto de ejemplo: …)», por el `PUT` del panel — con validación y auditoría—,
  no por `UPDATE` directo a la base.

### Corregido — la posición no se reiniciaba al cambiar de página

No había ningún manejo de scroll en la aplicación. React Router sustituye el
árbol pero no toca el desplazamiento, y para el navegador una navegación de
cliente no es una navegación, de modo que tampoco restaura nada: entrar a una
ficha de producto desde otra dejaba al usuario a media página.

- Nuevo `shared/components/ScrollToTop.jsx`, montado en `PublicLayout`.
- Atrás y adelante (`POP`) **no** saltan: esa restauración ya la hace el
  navegador y era correcta.
- Cambiar el query string sin cambiar de ruta tampoco salta: filtrar y paginar
  el catálogo no son páginas nuevas.

### Cambiado — la lupa del buscador con el campo vacío

Estaba deshabilitada, con el argumento de que `q=` vacío no es una búsqueda.
Cierto, pero dejaba un control muerto justo para quien pulsa la lupa porque
todavía no sabe qué escribir. Ahora navega a `/catalogo` **sin** `q`, para que
`useCatalogFilters` no arranque con un filtro de texto activo.

### Verificación (Docker)

- `vitest`: 634 tests en 36 archivos, todos en verde (16 nuevos entre
  `SearchForm.test.jsx`, `ScrollToTop.test.jsx` y `AdminSidebar.test.jsx`).
- `eslint`: 0 errores (persiste 1 *warning* previo en `ProductForm.jsx`).
- `vite build`: correcto.
- Navegador contra el stack: la lupa vacía navega a `/catalogo`; la secuencia
  catálogo → producto A → atrás → producto B llama a `scrollTo(0,0)` solo en los
  dos pasos de ida, y no al volver.

---

## [02/09/2026] — Se retira la vista y restauración de productos eliminados

Pedido explícito del usuario (*"elimina esa opcion"*). El borrado de producto
sigue siendo lógico (`AD-18`): la fila permanece por integridad referencial
(`price_history`, `sales`, `audit_logs`, slugs no reutilizables). Lo que
desaparece es la forma de verlo y revertirlo desde el panel.

### Cambiado

- **`docs/05_API.md` v1.9.0** — se elimina `POST /api/v1/admin/products/{id}/restore`;
  `GET /api/v1/admin/products` pierde el parámetro `deleted`.
- **`docs/07_PANEL_ADMIN.md` v1.14.0** — `PADP-02` revertida: sin filtro
  "Ver eliminados", sin acción "Restaurar", sin la operación crítica asociada.
- **`docs/02_ARQUITECTURA.md` v0.9.2** — excepción documentada a §12.6 regla 2
  y ajuste de la tabla de §15.10. `AD-18` sin cambios.

### Implementado

- **Frontend** — se quitan el checkbox de `ProductsFilters`, el estado `deleted`
  de `useAdminProducts`, el método `restore()` de `productsApi`, el hook
  `useRestoreProduct` y el cableado de restaurar en `ProductsPage` / `ProductsTable`.
- **Backend** — se elimina la ruta `/restore` (`admin/products.py`), el método
  `AdminProductService.restore`, el campo `deleted` de `AdminProductListQuery`
  y el filtro por `deleted` del repositorio (ahora siempre `deleted_at IS NULL`).
- Marcas, categorías, deportes, talles y promociones conservan su restauración.

### Verificación (Docker)

| Prueba | Resultado |
|---|---|
| `pytest tests/integration/api/test_admin_products.py` | **passed** |
| `eslint` | 0 errores (1 warning preexistente ajeno) |
| `vitest` (feature productos) | 45 passed |

## [31/08/2026] — Fase 0: preparación de producción

Arquitectura de producción **preparada y probada en local**. **NO desplegado**
en un VPS real; DNS, Cloudflare y firewall **sin tocar**. `docker-compose.yml`
de desarrollo **sin cambios**. Cero cambios de código, base de datos o migraciones.

### Añadido

- **`docker-compose.prod.yml`** — orquestación de producción, separada del de
  desarrollo:
  - Nginx sirve el **build estático** (`frontend/dist/`), **sin Vite dev server**.
  - Gunicorn **sin `--reload`**, **1 worker** (decisión: evita la limitación de
    `RATELIMIT_STORAGE_URI="memory://"` entre procesos — `03_SEGURIDAD.md` §14.4;
    no se toca Flask-Limiter ni se introduce Redis).
  - Sin bind-mounts de código; imágenes con tag (`IMAGE_TAG`).
  - `restart: unless-stopped`; PostgreSQL sin puertos publicados; healthchecks.
  - Servicio **`migrate`** (`profiles: ["tools"]`, `flask db upgrade`) —
    **nunca automático**.
  - Servicio **`frontend-build`** (`profiles: ["build"]`) — compila el SPA.
- **`nginx/prod/default.conf.template`** — configuración Nginx **desplegable**
  (renderizada por `envsubst`, filtro `^NGINX_`): TLS `:443`, redirección 80→301,
  `server_name` por variable, `upstream backend`, SPA + fallback `index.html`,
  `/assets/*` con cache de 1 año, `/uploads/*` desde el volumen, `/api/v1/*` y
  `/_seo/*` al backend, y **todo lo de E-4** (`server_tokens off`,
  `client_max_body_size 6m`, errores JSON `AD-16`, cabeceras de seguridad en
  errores). Derivación por agente para rastreadores (AD-09).
- **`.env.production.example`** — plantilla versionada de todas las variables de
  producción. El `.env.production` real queda gitignoreado (`.env.*`).
- **`scripts/prod/`** — `build.sh`, `deploy.sh` (Recreate: backup → migrate →
  up → readiness → smoke), `backup-db.sh`, `restore-db.sh`, `verify-backup.sh`,
  `rollback.sh`, `lib.sh`, `README.md`.
- **`nginx/certs/`** — carpeta para el cert TLS (gitignoreada) + `.gitkeep` +
  `generate-selfsigned.sh` (solo para probar el compose en local).

### Cambiado

- **`.gitignore`** — `!.env.production.example`; `nginx/certs/*.pem|key|crt`.
- **`nginx/production.conf.example`** — pasa a ser **referencia anotada**; apunta
  a `nginx/prod/default.conf.template` como la config real. No se despliega.
- **`docs/12_DEPLOY.md` v1.3.0** — §5.2 (estado Fase 0), §6/§6.1 (topología y
  artefactos), §9.5 (migraciones en prod), §14 (variables de producción,
  `.env.production`, `SITE_BASE_URL`, `NGINX_SERVER_NAME`, `GUNICORN_WORKERS`,
  `IMAGE_TAG`; `CORS_ORIGINS` marcada "no usar").

### Verificación (local, Docker, cert autofirmado)

| Prueba | Resultado |
|---|---|
| `pytest` completo | **589 passed, 1 skipped** (sin regresión — Fase 0 no toca código) |
| `vitest` / `eslint` / `vite build` | 458 passed / 0 errores / OK |
| `ruff` / `black` | limpios salvo 2 archivos **preexistentes** ajenos a Fase 0 (no se tocan) |
| `nginx -t` (config renderizada) | syntax OK |
| `docker compose -f docker-compose.prod.yml config` | válido; `migrate`/`frontend-build` ocultos por `profiles` |
| `build.sh` | `frontend/dist/` generado + imagen `pablito-backend` |
| `migrate` sobre base vacía | 14 migraciones → `b99b11955f25` |
| `up -d` | 3 servicios *healthy* |
| HTTPS `:443` + `Server: nginx` (sin versión) | ✅ |
| HTTP `:80` → `301 https://` | ✅ |
| `/health/live` / `/health/ready` | `200` / `200` (`migrations: true`) |
| SPA + fallback (`/`, `/ruta-inexistente`, `/admin`) | `200 text/html` |
| `/api/v1/*` (200) y `/api/v1/no-existe` | `404` JSON `AD-16` con `request_id` |
| `/uploads/faltante` | `404` JSON `resource_not_found`, `Content-Type: application/json` |
| `413` > 6 MB (Nginx) y 5–6 MB (Flask) | JSON `payload_too_large` |
| CSRF `403` | `code=csrf_token_invalid`, `X-Request-Id` presente (E-5) |
| Login admin semilla | `super_administrator`, cookie `session` con `Secure=TRUE` |
| Persistencia PostgreSQL tras `down` (sin `-v`) + `up -d` | dato sobrevive |
| Persistencia uploads tras recrear contenedores | archivo sobrevive, servido `200` |
| `backup-db.sh` + `verify-backup.sh` | restaura en base efímera, `alembic_version=b99b11955f25` |
| `flask db current == heads == b99b11955f25` (prod **y** dev) | ✅ |
| `flask db check` (prod y dev) | "No new upgrade operations detected" |

### Pendiente (fuera de Fase 0)

- **Fase Cloudflare** (`03_SEGURIDAD.md` §23): DNS *proxied*, SSL Full strict,
  WAF, rate limiting de edge, firewall del origen, `TRUSTED_PROXY_COUNT=2`.
- VPS real, dominio, cert de Let's Encrypt / Origin Certificate.
- Cron de backups off-site; job de deploy en CI.
- Preexistente (ajeno a Fase 0): 2 archivos con `ruff`/`black` sucios
  (`app/repositories/product_repository.py`, `app/services/admin_product_service.py`)
  — trabajo sin commitear anterior, **no se toca**.

## [28/08/2026] — Hardening de Nginx (E-4)

Último ítem de la auditoría de errores/rutas. **Solo `nginx/*`** — sin tocar
backend, frontend, sesiones, cookies, Flask-Limiter, base de datos ni APIs.
Cloudflare sigue pendiente de aprobación.

### Cambiado — `nginx/conf.d/default.conf` (dev) y `nginx/production.conf.example`

- **`server_tokens off;`** — el header `Server` queda en `nginx` sin versión, y
  las páginas de error por defecto tampoco la muestran. (Quitar el header por
  completo necesitaría `headers-more`, ausente en la imagen oficial.)
- **`client_max_body_size` 16m → 6m** — alineado con `MAX_CONTENT_LENGTH = 5 MB`
  de Flask (`core/config/base.py`). El margen de 1 MB cubre el sobre multipart:
  una subida de 5–6 MB llega a Flask y recibe su `413` JSON; por encima la corta
  Nginx con **el mismo contrato `AD-16`** (`code: "payload_too_large"`).
- **Páginas de error JSON** en vez de HTML genérico de Nginx:
  - `error_page 413` → `@error_413` (JSON `AD-16`).
  - `error_page 502 503 504` → `@error_upstream` (JSON `503` `service_unavailable`).
  - `/uploads/<faltante>` → `@uploads_missing` (JSON `404` `resource_not_found`,
    `Content-Type: application/json`).
- **`proxy_intercept_errors` queda en `off`**: los 4xx/5xx JSON del backend
  —incluido el `404` de `/api/v1/*`— pasan **intactos**.
- Las **cabeceras de seguridad** (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`) se aplican también en estas respuestas de error
  (`include security_headers` en dev; `add_header ... always` a nivel `server`
  en producción).
- **Dev y producción quedan separados**: `production.conf.example` NO se monta en
  `docker-compose` (sigue siendo plantilla de referencia); solo `conf.d/default.conf`
  está en vigor.

### Añadido — `nginx/production.conf.example`

- Bloque final "PENDIENTE — se configura en Cloudflare" con la lista de lo que
  NO se resuelve en Nginx (DNS *proxied*, SSL Full strict, WAF, *rate limiting*
  de edge, firewall del VPS a rangos de Cloudflare, `TRUSTED_PROXY_COUNT=2`,
  IP real). Spec completa en `03_SEGURIDAD.md` §23.

### Verificación (`curl` a través de Nginx dev, `nginx -t` + reload)

| Prueba | Resultado |
|---|---|
| `Server` header | `nginx` (sin versión) |
| `GET /api/v1/no-existe` | `404` JSON `AD-16` con `request_id` — **intacto** |
| `GET /uploads/x.jpg` (faltante) | `404` JSON `resource_not_found`, `Content-Type: application/json`, `X-Content-Type-Options: nosniff` |
| `POST` con body 5–6 MB | `413` JSON de **Flask** (`payload_too_large`) |
| `POST` con body > 6 MB | `413` JSON de **Nginx** (`payload_too_large`), mismas cabeceras |
| `GET /api/v1/products`, `/health/live`, `/` | `200` — sin cambios |
| `404` de ruta SPA | `200` + página 404 visible (E-1) — sin cambios |
| CSRF `403` | sigue con `request_id` (E-5) — sin cambios |
| `test_image_pipeline` + `test_storage_namespaces` + `test_admin_banners` + `test_admin_products` | 108 passed (Nginx no está en el camino de los tests, confirmado sin regresión) |

### Documentación

- `03_SEGURIDAD.md` v1.2.0 — §11.5, §12, checklist §22.
- `12_DEPLOY.md` v1.2.0 — §18, nueva §19.3, historial.

### Pendiente (exclusivo de Cloudflare, requiere aprobación)

- Todo `03_SEGURIDAD.md` §23.2 + firewall del VPS + `TRUSTED_PROXY_COUNT=2`.

## [28/08/2026] — Cierre de manejo de errores y rutas (E-1, E-2, E-3, E-5)

Continuación de la auditoría de errores/rutas. Se implementan los cuatro huecos
aprobados; **E-4 (Nginx) queda para la fase Cloudflare/producción**.

### E-1 — Página 404 del frontend

- Antes: una ruta inexistente redirigía en silencio al Home / Dashboard (HTTP 200, sin pantalla).
- **Nuevo** [`NotFoundPage.jsx`](../frontend/src/features/store/pages/NotFoundPage.jsx)
  (pública, dentro de `PublicLayout` → navbar + footer, enlaces a Inicio y Catálogo) y
  [`AdminNotFoundPage.jsx`](../frontend/src/features/admin/layout/AdminNotFoundPage.jsx)
  (dentro de `AdminLayout`, enlace al Dashboard).
- `PublicRoutes.jsx`: `path="*"` → `NotFoundPage` (se retira `<Navigate to="/">`).
- `AdminRoutes.jsx`: `path="*"` **dentro** de `AdminLayout` → `AdminNotFoundPage` (se retira el `<Navigate to="/admin/dashboard">` externo).
- El HTTP sigue en `200`: una SPA sin SSR no puede devolver un `404` real para una
  ruta arbitraria y **no se falsean cabeceras desde React**. Documentado en
  `06_FRONTEND.md` §8.3.

### E-2 — Manejo de `429` y catálogo central de errores

- **Nuevo** [`shared/services/errorMessages.js`](../frontend/src/shared/services/errorMessages.js):
  `describeApiError(error)`, `isRateLimit`, `RATE_LIMIT_MESSAGE` (+ test).
- `ErrorState`: prop opcional `error`; un `429` **siempre** muestra
  *"Demasiadas solicitudes. Esperá un momento y volvé a intentar."* y **oculta el
  botón de reintento**. Se pasa `error` desde catálogo público (Catalog, Home,
  ProductDetail) y listados del panel (Promociones, Usuarios, Productos, Banners,
  Clasificaciones).
- Helpers `mensajeDe*` de los formularios de escritura: rama `429` → mensaje central.
- Login y cambio de contraseña conservan su comportamiento (ya trataban el `429`).
- No se tocan los límites de Flask-Limiter. TanStack Query ya no reintenta un `429`
  (solo reintenta fallos de red).
- Ficha de producto: un `404` de la API pasa a mostrar "Producto no encontrado"
  con vuelta al catálogo, en vez de `ErrorState` con reintento.

### E-3 — Error Boundaries de sección (`06_FRONTEND.md` §15.2)

- [`ErrorBoundary.jsx`](../frontend/src/app/ErrorBoundary.jsx) generalizado: props
  `fallback` y `resetKeys` (+ `componentDidUpdate` que reinicia si hay error y
  cambió la ruta). Fallback por defecto sin cambios.
- **Nuevo** [`RouteErrorBoundary.jsx`](../frontend/src/app/RouteErrorBoundary.jsx):
  wrapper con `useLocation()`, `resetKeys=[pathname]` y fallback con "Reintentar" +
  enlace de salida.
- Envuelven: `/carrito` y `/producto/:slug` (en `PublicRoutes.jsx`) y el `<Outlet/>`
  del panel (en `AdminLayout.jsx`). El fallo de una sección ya no derriba el resto.
- Sin librerías nuevas.

### E-5 — `request_id` en el `403` de CSRF

- [`handlers.py`](../backend/app/core/exceptions/handlers.py): `handle_csrf_error`
  llama a `_ensure_request_id()` — si el middleware de correlación todavía no
  corrió (el `before_request` de CSRF va antes), genera un id de emergencia con el
  mismo formato. **No se cambia el orden global de inicialización.**
- Único handler afectado: el resto de errores ocurre después del middleware.
- Test en `test_admin_users_hardening.py`: el `403` de CSRF trae `meta.request_id`
  no nulo y el header `X-Request-Id`.

### Verificación

- **Backend**: `pytest` completo en verde (`+1` test); `ruff` y `black` limpios en
  los archivos tocados (`handlers.py`, `test_admin_users_hardening.py`).
- **Frontend**: `vitest` 458/458 (`+8`), `eslint` sin errores (1 warning
  preexistente ajeno), `vite build` OK. Todo en Docker.
- Manual/`curl`: ruta pública inexistente → 404 visible; ruta admin inexistente →
  404 del panel dentro del layout; admin sin permisos → sigue "Sin permisos";
  `429` → mensaje correcto sin reintento; CSRF `403` → `request_id` presente +
  header `X-Request-Id`.

### Documentación

- `06_FRONTEND.md` v1.1.0 — §8.1, §8.3, §10.5, §15.2, §15.3.

### Pendiente

- **E-4 (Nginx)** — `server_tokens off`, páginas de error propias, alinear
  `client_max_body_size` — reservado para la fase Cloudflare/producción.

## [28/08/2026] — Módulo Usuarios en el panel y endurecimiento de credenciales

Pedido explícito del usuario: sección "Usuarios" en el panel + auditoría de
sesiones, credenciales, rate limiting y estrategia Cloudflare.

### Auditoría previa (antes de tocar código)

- El backend de gestión de administradores **ya existía completo** desde Fase 6:
  `GET/POST/PUT/DELETE /api/v1/admin/users` + `POST .../change-password`
  ([`users.py`](../backend/app/api/v1/admin/users.py),
  [`admin_user_service.py`](../backend/app/services/admin_user_service.py)),
  con `RN-67`, `RN-71`, `RN-72`, bcrypt coste 12, DTOs sin `password_hash`,
  auditoría por operación e invalidación de sesiones (§7.3).
- Sesiones/cookies/CSRF/rate-limiting **ya implementados y probados**: cookie
  `HttpOnly`+`Secure`(prod)+`SameSite=Strict`+`Path=/api/v1/admin`, expiración
  30 min inactividad / 12 h absoluta, rotación de `sid` post-login (session
  fixation), CSRF Flask-WTF en toda escritura del panel, `5/15 min` en login,
  `3/15 min` en `change-password`, `_TIMING_EQUALIZER_HASH` contra enumeración
  de usuarios, `ProxyFix` con `TRUSTED_PROXY_COUNT`.
- **Huecos encontrados:** (1) sin UI de Usuarios en el frontend; (2) sin
  estrategia Cloudflare documentada; (3) `RATELIMIT_STORAGE_URI="memory://"` es
  por-*worker*; (4) sin test del rate limit de login. No se tocó nada del
  backend de autenticación salvo agregar el test (4).

### Implementado

- **Frontend — nuevo feature `admin/users`**
  ([`usersApi.js`](../frontend/src/features/admin/users/api/usersApi.js),
  [`useUsers.js`](../frontend/src/features/admin/users/hooks/useUsers.js),
  [`userForm.js`](../frontend/src/features/admin/users/utils/userForm.js) +
  `.test.js`, componentes `UsersTable` / `UserForm` / `ChangePasswordForm` /
  `ChangePasswordDialog`, páginas `UsersPage` / `UserFormPage` / `AccountPage`):
  listado (usuario, correo, rol, estado, último acceso), alta, edición,
  eliminación lógica y cambio de contraseña propia y de terceros, cada
  destructiva con `ConfirmDialog`. La contraseña nunca se muestra ni se precarga.
- **`RequireSuperAdmin`**
  ([componente](../frontend/src/features/auth/components/RequireSuperAdmin.jsx)):
  guarda de rol para `/admin/users*`; muestra «Sin permisos» (§8.2). El `403`
  real lo sigue imponiendo el backend.
- **`/admin/account` («Mi cuenta»)**: cualquier administrador cambia su propia
  contraseña; enlazada desde el nombre de usuario del topbar. Exige la actual y
  cierra la sesión al terminar (§7.3).
- **Sidebar**: ítem «Usuarios» con `superOnly`, filtrado por el rol de la
  sesión; nuevo glifo `users` en `AdminIcon`. `AdminLayout` suma los títulos.
- **Backend — solo tests**
  ([`test_session_hardening.py`](../backend/tests/integration/api/test_session_hardening.py)):
  dos tests nuevos para el rate limit del login (`5/15 min`, `429` que no revela
  si el usuario existe, sin bloqueo permanente por IP). Ningún cambio de código
  de producción, sin migraciones.
- **Documentación**:
  - `03_SEGURIDAD.md` v1.1.0 — §5.7 (gestión de credenciales y cuentas),
    §14.3 (rate limiting ≠ DDoS), §14.4 (contador por-*worker*, mover a Redis
    como punto de extensión), §14.5 (endpoints costosos), §23 (protección de
    borde con Cloudflare: WAF, *rate limiting* de *edge*, IP de origen oculta,
    reglas concretas, riesgos y tareas manuales).
  - `12_DEPLOY.md` v1.1.0 — §6.3 (Cloudflare), variable `TRUSTED_PROXY_COUNT`,
    topología y tablas de §6/§18 actualizadas.
  - `07_PANEL_ADMIN.md` v1.13.0 — §7.1, §8.2, §14.9 (pantalla Usuarios y Mi
    cuenta, rutas reales en inglés).

### Verificación

- **Frontend**: 450/450 tests (`vitest`, +20 nuevos), `eslint` sin errores
  (1 *warning* preexistente ajeno), `vite build` exitoso. Verificado en Docker
  (`docker compose exec -T frontend`).
- **Backend**: `pytest` de la suite completa en verde; `ruff` y `black` limpios
  en el archivo tocado. Verificado en Docker.
- **Pendiente de verificación manual**: clic real en `/admin/users` y
  `/admin/account` (no se ingresan credenciales de admin, límite de siempre).

### Requiere configuración manual (no versionable)

- Cloudflare: aplicar §23.2 de `03_SEGURIDAD.md` en el panel de Cloudflare
  (DNS *proxied*, SSL *Full strict*, restaurar IP real, WAF *managed*, reglas de
  *rate limiting* para login / `/api/v1/admin/*` / API pública, Bot Fight Mode).
- Firewall del VPS: aceptar `:443` solo desde rangos de Cloudflare.
- Poner `TRUSTED_PROXY_COUNT=2` en el mismo despliegue que activa el modo
  *proxy* de Cloudflare.

## [24/08/2026] — Rediseño visual del panel administrativo

### Implementado

- **Pedido explícito del usuario**, sobre una imagen de referencia de
  composición (no de contenido ni funcionalidad). Auditado antes de tocar
  nada: `AdminLayout`/`AdminSidebar`/`AdminTopbar`/`AdminContent`, el
  Dashboard y sus tres componentes, y los tokens ya definidos en
  `tokens.css` — el panel usaba Bootstrap sin ningún módulo de estilos
  propio; el catálogo público sí tenía uno completo, así que este rediseño
  reutiliza exactamente esos mismos tokens (`--color-surface-inverse`,
  `--color-volt-500`, la escala de espaciado/tipografía/sombra), no inventa
  ninguno nuevo.
- **Ninguna ruta, permiso, dato ni funcionalidad cambió** — es
  exclusivamente CSS y composición. Las ocho secciones de la sidebar y sus
  ocho rutas siguen intactas; las siete tarjetas del dashboard muestran
  exactamente los mismos siete valores de `totals`; los dos paneles
  inferiores muestran los mismos datos con la misma lógica.
- **Nuevo [`AdminIcon.jsx`](../frontend/src/features/admin/layout/AdminIcon.jsx)**:
  set de glifos SVG en línea compartido por sidebar, topbar, tarjetas de
  métricas y los dos paneles del dashboard — mismo criterio sin librería
  que ya usa `PublicNavbar`/`PublicFooter` en el catálogo. Reemplaza los
  glifos Unicode que tenía la sidebar (▦▤▧◈⚽◫％▬) y el "☰" del topbar.
- **[`AdminSidebar.jsx`](../frontend/src/features/admin/layout/AdminSidebar.jsx)**:
  mismas ocho secciones y rutas; ítem activo destacado con
  `--color-volt-500` (el acento que ya existe en el proyecto, no un color
  nuevo), bloque de marca propio, más espaciado entre ítems.
- **[`AdminTopbar.jsx`](../frontend/src/features/admin/layout/AdminTopbar.jsx)**:
  mismos tres elementos (alternar sidebar, título, usuario, Salir);
  título más grande, botón "Salir" con ícono en píldora, usuario con
  ícono de persona.
- **[`AdminLayout.module.css`](../frontend/src/features/admin/layout/AdminLayout.module.css)**:
  reescrito — sidebar oscura, topbar y fondo de contenido (`--color-surface-alt`,
  para que las tarjetas blancas se distingan sin más sombra).
- **[`MetricCard.jsx`](../frontend/src/features/admin/dashboard/components/MetricCard.jsx)**
  (+ nuevo `MetricCard.module.css`): ícono en caja de color según `tone`,
  etiqueta y número más grandes. El color es apoyo visual únicamente — la
  etiqueta de texto sigue anunciando el dato.
  **[`useDashboard.js`](../frontend/src/features/admin/dashboard/hooks/useDashboard.js)**:
  `buildMetricCards` suma `icon` por tarjeta y ajusta `tone` al criterio de
  color que pidió el usuario (verde disponible/activo, ámbar stock bajo,
  rojo no disponible, acento de marca en oferta, neutro el resto) — antes
  "En oferta" usaba el tono `danger` de Bootstrap solo por ser el más
  llamativo disponible. Las siete claves, valores y su orden no cambiaron
  (cubierto por `useDashboard.test.js`, sin tocar).
- **[`DashboardPage.jsx`](../frontend/src/features/admin/dashboard/pages/DashboardPage.jsx)**:
  de paso se corrige un desajuste preexistente — el esqueleto de carga
  dibujaba 8 tarjetas placeholder cuando `buildMetricCards` siempre
  devuelve 7, así que la pantalla "saltaba" de tamaño al llegar los datos
  reales; ahora dibuja 7.
- **[`IncompleteProductsCard.jsx`](../frontend/src/features/admin/dashboard/components/IncompleteProductsCard.jsx)**
  y **[`RecentPriceChangesCard.jsx`](../frontend/src/features/admin/dashboard/components/RecentPriceChangesCard.jsx)**
  (+ nuevo `DashboardPanel.module.css`, compartido entre los dos): encabezado
  con ícono, estado vacío con ícono (vía la nueva prop `icon`, opcional, de
  `EmptyState`). Mismos datos, misma lógica — nada de lo que muestran
  cambió, solo cómo se presenta.
- **[`EmptyState.jsx`](../frontend/src/shared/components/EmptyState.jsx)**
  (componente compartido, usado también en el catálogo público y en otros
  listados del panel): suma una prop `icon` completamente opcional y
  retrocompatible — sin ella, el componente se ve exactamente igual que
  antes en sus otros nueve usos. Solo los dos paneles del dashboard la
  pasan por ahora.
- **Documentación**: `07_PANEL_ADMIN.md` v1.12.3 (§5.1, §14.1).
- **Verificación estática**: no se pudo hacer clic real en el panel (no se
  ingresan credenciales de admin, misma limitación de siempre). Se
  verificó en cambio, por inspección directa de código: cada clase CSS
  referenciada en JSX existe en su módulo correspondiente (sin errores de
  tipeo que quedarían silenciosos en tiempo de build) y cada nombre de
  ícono usado (sidebar, topbar, tarjetas, paneles) existe en `AdminIcon`.
- Frontend: 430/430 tests (sin cambios: ningún test cubre clases CSS ni
  JSX de presentación, y `useDashboard.test.js` no hace asunciones sobre
  `tone`), lint sin errores nuevos, build exitoso.

### Pendiente de verificación manual

Clic real en `/admin/dashboard` y en cada opción de la sidebar, en
desktop y mobile — no se pudo hacer por la política de no ingresar
credenciales.

## [24/08/2026] — La categoría principal no se ofrece como adicional

### Implementado

- **Pedido explícito del usuario**: al elegir "Categoría principal", esa
  categoría seguía apareciendo en "Categorías adicionales", invitando a
  tildarla dos veces.
- **[`ProductForm.jsx`](../frontend/src/features/admin/products/components/ProductForm.jsx)**:
  nuevo `categoriasAdicionalesDisponibles` (`useMemo`, depende de
  `opciones.categories` y `values.primary_category_id`) filtra la
  categoría principal antes de pasarle las opciones a `GrupoCasillas` —
  deja de ofrecerse como casilla, en Crear y en Editar por igual (mismo
  `ProductForm`). El `onChange` del selector de categoría principal ahora
  también saca esa categoría de `values.category_ids` si ya estaba tildada,
  para que cambiarla varias veces no deje restos de una selección anterior.
- **[`productForm.js`](../frontend/src/features/admin/products/utils/productForm.js)**:
  `toFormValues` excluye la categoría principal de `category_ids` al
  precargar un producto existente — cubre el caso de datos guardados antes
  de esta regla, con la misma categoría en las dos partes. `toPayload` ya
  deduplicaba con un `Set` al armar el payload (sin cambios ahí: es la
  misma red de seguridad de siempre, ahora reforzada por no ofrecer la
  opción en la interfaz).
- Ninguna categoría se tocó en la base de datos ni en el backend: es
  exclusivamente qué opciones ofrece el selector del formulario.
- **Documentación**: `07_PANEL_ADMIN.md` v1.12.2 (§14.3, Clasificación).
- Frontend: 430/430 tests (3 nuevos en `productForm.test.js`: excluye la
  principal al cargar un producto con la duplicación vieja, no toca nada
  si no hay duplicación, y el caso general de relaciones múltiples se
  actualizó para reflejar la exclusión), lint sin errores nuevos, build
  exitoso.

## [24/08/2026] — El campo SKU deja de mostrarse en Crear/Editar producto

### Implementado

- **Pedido explícito del usuario**: quitar el campo "SKU (opcional)" del
  formulario de producto (Crear y Editar, mismo `ProductForm`), sin tocar
  la lógica interna ni el backend. El Nombre pasa a ocupar toda la fila.
- **[`ProductForm.jsx`](../frontend/src/features/admin/products/components/ProductForm.jsx)**:
  se retira el `<Campo>` de SKU y su texto de ayuda; `Nombre` pasa de
  `col-12 col-lg-6` a `col-12`. `values.sku` sigue viajando en el estado del
  formulario sin campo propio: en alta llega vacío desde `VACIO` y
  `toPayload` lo autogenera con `generarSku(nombre)` — comportamiento sin
  cambios, ya existía desde v1.12.0; en edición, `toFormValues` lo precarga
  con el SKU real del producto y, al no haber input que lo toque, se
  reenvía intacto al guardar. No se modificó `productForm.js`, ni el
  backend, ni el contrato de la API.
- **Documentación**: `07_PANEL_ADMIN.md` v1.12.1 (§14.3, secciones del
  formulario y validaciones).
- Frontend: 428/428 tests (sin cambios en `productForm.test.js`: la lógica
  de generación/preservación de SKU no se tocó), lint sin errores nuevos
  (advertencia preexistente de Fast Refresh, no relacionada), build
  exitoso.

## [24/08/2026] — Segunda foto del producto también en táctil

### Implementado

- **Pedido explícito del usuario**: "que en vista móvil cuando se mantiene
  apretado la foto del catálogo cambie como en la animación vista PC" — el
  cruce a la segunda foto (`secondary_thumbnail_url`) estaba deliberadamente
  restringido a `@media (hover: hover)` (dispositivos con puntero real), así
  que en mobile la tarjeta se quedaba siempre en la imagen principal.
- **[`ProductCard.jsx`](../frontend/src/features/catalog/components/ProductCard.jsx)**:
  el `<div className={styles.media}>` suma `onTouchStart` (activa el mismo
  `enHover` que ya usa el mouse), `onTouchEnd`/`onTouchCancel` (lo apaga al
  soltar) y `onTouchMove` (lo apaga si el dedo se desplaza — es scroll, no
  el gesto de sostener la foto). Sin `preventDefault`: el scroll de la
  página sigue funcionando con el dedo apoyado sobre una foto.
- **[`ProductCard.module.css`](../frontend/src/features/catalog/components/ProductCard.module.css)**:
  `.hoverImageVisible { opacity: 1; }` sale de dentro de
  `@media (hover: hover)` — ya no hace falta esa guarda porque el estado
  táctil ahora se controla explícitamente (antes la guarda existía para
  evitar que un `mouseenter` sintético post-tap dejara la tarjeta "pegada"
  en la segunda foto; ese riesgo no aplica a un estado que se apaga
  explícitamente con `touchend`/`touchmove`). El zoom por `:hover` de la
  imagen principal (gesto de mouse puro, no pedido) sigue exclusivo de
  `@media (hover: hover)`, sin cambios. Se suma `-webkit-touch-callout: none`
  a `.media` para que el menú nativo de iOS (guardar/copiar imagen) no
  compita con el gesto de mantener apretado.
- **Documentación**: `09_COMPONENTES.md` v2.9.9 (§9.8 `ProductCard`,
  estados).
- **Verificado en vivo** (Docker, `http://localhost:8080/catalogo`, emulación
  mobile 375px): se disparó `touchstart`/`touchmove`/`touchend` reales sobre
  una tarjeta con segunda foto y se confirmó por `getComputedStyle` real en
  el DOM — opacidad de la segunda foto en `0` antes, `1` mientras se
  mantiene apretada, `0` al soltar, y también `0` si el dedo se mueve
  (scroll) en vez de sostenerse quieto.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Corrección: logos de Progresar y Bancop deformados

### Corregido

- **Reportado por el usuario** con una captura: los logos de "Progresar" y
  "Bancop" se veían estirados/deformados. Causa: al quitarles el fondo
  negro en la tanda anterior, el recorte de esos dos usó coordenadas
  distintas (aproximadas a mano) a las que se habían detectado con
  precisión para las otras cuatro tarjetas — el recuadro quedó más ancho
  de lo real, y el navegador lo escalaba a la misma altura que las demás
  sin conservar su proporción original.
- Se rehicieron esos dos recortes con las coordenadas precisas (mismas que
  ya se habían usado para Contimarket/Sudameris/Banco GNB/Banco Familiar),
  manteniendo la transparencia.
- **Verificado en vivo** (Docker, `http://localhost:8080`): las 6 imágenes
  cargan con la misma altura natural (58px) y proporciones consistentes
  entre sí, confirmado por JS real en el DOM.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso (no hubo
  cambios de código, solo de los dos archivos de imagen).

## [24/08/2026] — Color de marca real en las tarjetas de bancos

### Implementado

- **Pedido explícito del usuario**: dar a Contimarket, Sudameris, Banco GNB
  y "Banco Familiar" (el usuario confirmó que esa sexta tarjeta, sin nombre
  legible en la referencia, es Banco Familiar) un fondo del color que les
  corresponde, y quitar el negro de cada una.
- **Fondo negro de los logotipos**: no era un color de marca — era el fondo
  de la captura de referencia que quedó dentro del recorte rectangular de
  cada logo. Se reprocesaron los 6 recortes con transparencia (umbral de
  brillo: los píxeles casi negros pasan a alfa 0), así el logo (el
  recuadro blanco redondeado con el nombre) queda limpio sobre cualquier
  color de fondo de la tarjeta.
- **Color de cada tarjeta**: tomado por muestreo de píxeles del propio
  logotipo en la imagen de referencia (no inventado) —
  Contimarket azul marino (`#0d2f78`, del ícono "M"), Sudameris rojo
  (`#d90000`, del texto "SUDAMERIS"), Banco GNB verde oscuro (`#134a3d`,
  del texto "BANCO GNB"). "Banco Familiar" usa el naranja con el que esa
  entidad se reconoce en Paraguay. Las cuatro pasan de fondo blanco/celeste
  con texto de color a fondo de color con texto blanco. Progresar y
  Bancop no se tocaron: el usuario no las mencionó y ya tenían color de
  fondo propio, no negro.
- **Documentación**: comentario junto a `BANK_PROMOTIONS` en
  [`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)
  actualizado con el motivo de cada color y la transparencia.
- **Verificado en vivo** (Docker, `http://localhost:8080`): los 6 colores de
  fondo se confirmaron por `getComputedStyle` real en el DOM; las 6
  imágenes siguen cargando (`complete: true`); en mobile (375px) sigue sin
  scroll horizontal.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Copyright centrado al final, más separación en el pie

### Implementado

- **Pedido explícito del usuario**: más separación entre ubicación/horario
  y "Desarrollado por CodingMaxPy", y el copyright ("© 2026 Pablito Sports.
  Todos los derechos reservados.") movido a su propia línea, centrada, bien
  abajo del todo — antes compartía fila con esos dos bloques.
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**: `.bottom`
  queda solo con ubicación/horario y "Desarrollado por"; el copyright pasa
  a un `<p className={styles.copyright}>` propio, después de `.bottom`.
- CSS: `.bottom` gana más separación horizontal (`gap` con
  `--spacing-7` en el eje principal); nuevo `.copyright`, centrado.
- **Verificado en vivo** (Docker, `http://localhost:8080`): la fila superior
  del pie solo tiene ubicación/horario y "Desarrollado por CodingMaxPy",
  con más aire entre ambos; el copyright aparece como línea propia,
  centrada, al final; en mobile (375px) sigue sin scroll horizontal.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Horario junto a la ubicación en el pie inferior

### Implementado

- **Pedido explícito del usuario**: el horario de atención vivía en un
  bloque propio debajo del pie inferior; ahora va en la misma línea que
  "Trinidad, Itapúa - Paraguay", separado por un punto medio.
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**: se
  retira el bloque `.schedule` independiente; `storeSettings.business_hours`
  se agrega dentro del mismo `<p>` de la dirección, condicionado a que
  también haya dirección (antes se mostraba aunque no hubiera dirección
  cargada — caso de borde que no se da en la práctica, ya que ambos
  campos se cargan juntos desde "Configuración de la tienda").
- CSS: se retiran `.schedule`/`.scheduleLabel`/`.scheduleHours` (sin uso),
  se agrega `.copySeparator` y `.copy` pasa a `flex-wrap: wrap` para no
  desbordar en pantallas angostas con dirección + horario en la misma línea.
- **Verificado en vivo** (Docker, `http://localhost:8080`): el pie inferior
  muestra dirección y horario en la misma línea, separados por "·"; en
  mobile (375px) sigue sin scroll horizontal.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Logo real de CodingMaxPy

### Implementado

- **Pedido explícito del usuario**: el logo de CodingMaxPy, que en los dos
  intentos anteriores no llegó a un archivo localizable, esta vez se
  proveyó con su ruta exacta (`C:\Users\titoj\Downloads\codingMaxPy.png`).
- Se redujo de 1254×1254 (1.15 MB) a 160×160 (27 KB, con Pillow) y se
  guardó como estático en
  [`frontend/public/codingmaxpy-logo.png`](../frontend/public/codingmaxpy-logo.png)
  — mismo criterio que los logos de bancos: no pasa por el pipeline de
  derivados de imágenes de productos/banners.
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**: el
  bloque "Desarrollado por CodingMaxPy" reemplaza el ícono genérico
  `<Icon name="code">` por el logo real, junto al texto "CodingMaxPy" que
  ya estaba. El enlace a `https://wa.me/595986848215` no cambia.
- **Verificado en vivo** (Docker, `http://localhost:8080`): el logo carga
  (`complete: true`, 160px de ancho natural, confirmado por JS en el DOM
  real) y el bloque completo sigue apuntando al WhatsApp correcto.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Logotipos reales en la franja de bancos

### Implementado

- **Pedido explícito del usuario**: "faltan las imágenes de los bancos" — la
  franja `BANK_PROMOTIONS` (v2.9.7) mostraba el nombre de cada entidad como
  texto; el usuario pidió los logotipos reales.
- Se recortaron los 6 logotipos directamente de la imagen de referencia que
  el usuario ya había provisto (con Pillow, instalado puntualmente para esta
  tarea) — son los logotipos reales de Contimarket, Sudameris, Banco GNB,
  Progresar, Bancop y la sexta tarjeta genérica, no una recreación. Viven en
  [`frontend/public/banks/`](../frontend/public/banks/), servidos tal cual por
  Vite (no pasan por el pipeline de derivados de imágenes de productos/
  banners: son estáticos, no contenido que cargue un administrador).
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**: cada
  entrada de `BANK_PROMOTIONS` suma `logo`; la tarjeta muestra la imagen en
  vez del nombre en texto.
- Se detectó y corrigió un bug de carga: con `loading="lazy"` el `<img>` sin
  ancho explícito medía `width: 0` antes de cargar, y en este entorno de
  verificación esa combinación nunca disparaba la carga diferida (quedaba en
  `complete: false` permanentemente). Se quita `loading="lazy"` — son 6
  imágenes de ~10 KB cada una, no justifica la carga diferida ni el riesgo.
- **Logo de CodingMaxPy**: el usuario lo volvió a compartir en el chat, pero
  tampoco esta vez llegó a un archivo localizable en el sistema (se buscó de
  nuevo en `Descargas`, `Imágenes`, `Escritorio` y `Temp` sin encontrarlo) —
  sigue pendiente. El bloque "Desarrollado por CodingMaxPy" se mantiene como
  wordmark tipográfico.
- **Verificado en vivo** (Docker, `http://localhost:8080`): las 6 imágenes
  cargan (`complete: true`, ancho natural correcto en cada una, confirmado
  por JS en el DOM real); en mobile (375px) sigue sin scroll horizontal.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Correcciones sobre el reestilo del Footer

### Implementado

- **Pedido explícito del usuario**, tres correcciones puntuales sobre el
  reestilo de v2.9.6:
- **Bancos con reintegro confirmados como reales**: el usuario aclaró que
  los bancos de la referencia (Contimarket 35%, Sudameris 20%, Banco GNB
  20%, Progresar 20%, Bancop 20%, y una sexta tarjeta genérica de débito/
  crédito) son datos reales de Pablito Sports, no de otro negocio — se
  agregan como franja fija `BANK_PROMOTIONS` en
  [`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx), debajo de
  las columnas y arriba del pie inferior, mismo criterio que
  `PAYMENT_METHODS` (texto fijo confirmado, no dato de `store_settings`).
  Los colores de cada tarjeta son literales a propósito: son la identidad
  de cada banco, no del sistema visual de la tienda.
- **Facebook en Redes sociales**: el componente ya soportaba cualquier red
  cargada en `social_links` (incluido el ícono con color de marca, sumado
  ahora también para Instagram); solo faltaba en los datos de ejemplo del
  entorno de desarrollo. Se agrega `facebook` a `social_links` en
  [`scripts/seed_dev_data.py`](../scripts/seed_dev_data.py) y se actualiza la fila
  real de `store_settings` en la base de desarrollo (mismo efecto que
  editarlo desde el panel; no se tocó backend ni modelo).
- **Ubicación real**: se actualiza `address` en desarrollo a "Trinidad,
  Itapúa - Paraguay" y `business_hours` a las dos líneas reales ("Lunes a
  sábado: 08:00 - 18:30" / "Domingo: 08:00 - 11:00"), y el enlace "Ver en
  Google Maps" pasa de una búsqueda por texto a la URL específica que el
  usuario proveyó (con el `geocode` real del local, no derivable del texto
  de la dirección): `GOOGLE_MAPS_URL`, fija en el componente — si la
  ubicación cambia, hay que regenerarla a mano desde Google Maps.
- **Logo de CodingMaxPy**: el usuario ofreció pasarlo, pero el archivo no
  llegó a un lugar accesible en el proyecto (se buscó en `Descargas`,
  `Imágenes`, `Escritorio` y las carpetas temporales del sistema sin
  encontrarlo) — sigue pendiente. El bloque "Desarrollado por CodingMaxPy"
  se mantiene como wordmark tipográfico hasta que el archivo esté
  disponible en el repositorio.
- **Documentación**: `09_COMPONENTES.md` v2.9.7 (§9.8 `PublicFooter`).
- **Verificado en vivo** (Docker, `http://localhost:8080`, contra la base
  de desarrollo ya actualizada): "Redes sociales" muestra Facebook e
  Instagram, cada uno con su color de marca; "Ubicación" muestra "Trinidad,
  Itapúa - Paraguay" y el enlace de Maps es exactamente la URL provista
  (confirmado por `href` real en el DOM); el horario aparece en las dos
  líneas reales; la franja de bancos muestra los 6 confirmados con sus
  datos; en mobile (375px) sigue sin scroll horizontal.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Footer reestilado sobre referencia visual

### Implementado

- **Pedido explícito del usuario**, con una captura de una tienda deportiva
  de referencia. Antes de tocar código se auditó el `PublicFooter` actual,
  `08_UI_SYSTEM.md`/`09_COMPONENTES.md` y los campos reales de
  `store_settings` (mismo procedimiento que la reestructuración de v2.9.2).
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**: conserva la
  grilla de columnas de v2.9.2 (Marca + Soporte + Formas de pago +
  Redes/Ubicación), reestilada — íconos en línea (mismo criterio sin
  librería que `PublicNavbar`: SVG a mano, `08_UI_SYSTEM.md` §8), tarjetas
  con borde, encabezados con un divisor corto en el acento azul
  (`--color-volt-500`, azul desde `08_UI_SYSTEM.md` v2.2.0). Se suman:
  - **CTA de WhatsApp de la tienda** bajo la marca, con `storeSettings.whatsapp_number`.
  - **Columna "Ubicación"**: dirección real (`storeSettings.address`) con
    enlace a búsqueda de Google Maps (`google.com/maps/search`, sin mapa
    embebido ni SDK — nada de librerías pesadas).
  - **"Desarrollado por CodingMaxPy"**: bloque completo clicable a
    `https://wa.me/595986848215` (WhatsApp fijo del desarrollador, pedido
    explícito del usuario — no es un dato de `store_settings`). No existe
    ningún logo de CodingMaxPy en el proyecto (se buscó antes de escribir
    nada); se usa un wordmark tipográfico con un ícono genérico, no una
    imagen inventada ni externa.
  - **Bloque de horario** separado al final, con su propio divisor —
    `storeSettings.business_hours` deja de mezclarse en la línea de datos
    institucionales del pie inferior y no se repite en ningún otro lugar.
  - Se retira `historia?.email` del pie: no estaba en la referencia y ya
    era redundante con la página de Contacto.
- **No se reprodujo la franja de bancos con reintegros** de la imagen de
  referencia (Contimarket, Sudameris, Banco GNB, etc. con porcentajes de
  descuento): nombra entidades financieras y cifras de otro negocio, no
  confirmadas para Pablito Sports, y no estaba en el pedido escrito — solo
  en la captura. Reproducirla habría violado la prohibición ya vigente de
  este componente de no inventar datos comerciales.
- **[`shared/utils/whatsapp.js`](../frontend/src/shared/utils/whatsapp.js)** (nuevo):
  `simpleWhatsAppHref(numero)` — antes era una función local duplicada en
  `StoryBlock.jsx`; se comparte porque el footer ahora necesita la misma
  lógica (enlace `wa.me` sin texto precargado).
  [`StoryBlock.jsx`](../frontend/src/features/store/components/StoryBlock.jsx)
  se actualiza para importarla en vez de mantener su propia copia.
- **Documentación**: `09_COMPONENTES.md` v2.9.6 (§9.8 `PublicFooter`,
  contrato y estructura reescritos).
- **Verificado en vivo** (Docker, `http://localhost:8080`): las 4
  columnas se renderizan con los datos reales (Soporte, Formas de pago con
  descripciones, Redes sociales con Instagram real, Ubicación con enlace a
  Maps funcional); el CTA de WhatsApp de la tienda usa el número real; el
  bloque "Desarrollado por CodingMaxPy" enlaza exactamente a
  `https://wa.me/595986848215` (confirmado por `href` real en el DOM); el
  bloque de horario aparece al final, separado, sin duplicar teléfonos; en
  mobile (375px) las columnas se apilan en una sola sin scroll horizontal
  y el bloque de CodingMaxPy sigue siendo clicable; los enlaces
  preexistentes de "Soporte" (páginas placeholder) siguen funcionando.
- Frontend: 428/428 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Corrección: los marcos de vista previa de banners seguían siendo 21:9

### Corregido

- **Reportado por el usuario** ("aun dice 21:9") tras la corrección del recorte de banners de la misma tanda: aunque el recorte de **datos** ya no forzaba 21:9, los **contenedores visuales** de la vista previa (`BannerImageField.jsx`) y de la miniatura del listado (`BannersTable.jsx`) seguían usando la clase `ratio-21x9` de Bootstrap — el marco en sí seguía siendo panorámico (con `object-fit: contain` adentro, así que no recortaba, pero un banner vertical o cuadrado se veía diminuto y "aplastado" dentro de una caja ancha).
- Ambos archivos pasan de `ratio-21x9` a `ratio-1x1` (marco cuadrado, neutro — no favorece ninguna proporción de imagen sobre otra).
- Frontend: 428/428 tests (sin cambios de comportamiento que rompan aserciones), lint sin errores nuevos, build exitoso.

## [24/08/2026] — Footer reestructurado

### Implementado

- **Pedido explícito del usuario**, sobre una referencia visual: rediseñar
  `PublicFooter`. Antes de tocar código se auditó `08_UI_SYSTEM.md`,
  `09_COMPONENTES.md` y los campos reales de `store_settings`, y se presentó
  el plan (estructura, qué es dinámico y qué es placeholder) para
  aprobación antes de implementar — encontré una contradicción entre el
  contexto de negocio (que daba el footer nuevo por ya implementado) y el
  código real (seguía en 4 columnas viejas); quedó señalada y resuelta con
  esta confirmación.
- **[`PublicFooter.jsx`](../frontend/src/shared/layouts/PublicFooter.jsx)**:
  se retiran las columnas "Explorar" (atajos por sexo) y "La empresa"
  (Nosotros/Contacto/Catálogo sueltos) — no forman parte de la estructura
  pedida. Quedan: Marca, **Soporte** (Política de Envío y Reembolso,
  Preguntas Frecuentes, Términos del Servicio, Política de Privacidad,
  Contacto), **Formas de pago** (Tarjeta de Crédito/Débito, Pago Contra
  Entrega, Transferencia Bancaria — texto fijo, tal como los escribió el
  usuario, no hay campo administrable para esto), **Redes sociales**
  (dinámico, de `store_settings.social_links`, columna ausente si no hay
  ninguna cargada — se mantiene el criterio "no inventa datos"). El pie
  inferior suma dirección/horarios/WhatsApp/correo si existen, movidos ahí
  desde la columna "Contacto" que se retiró.
- **Enlaces "Soporte" sin contenido legal todavía**: el usuario pidió
  explícitamente no redactar Política de Envío, FAQ, Términos ni Privacidad
  todavía. En vez de `href="#"` o texto no clicable, se creó
  [`LegalPlaceholderPage.jsx`](../frontend/src/features/store/pages/LegalPlaceholderPage.jsx)
  (una sola pantalla parametrizada por título, reutilizando el componente
  `Page` que ya usa `AboutPage`) y 4 rutas reales en
  [`PublicRoutes.jsx`](../frontend/src/routes/PublicRoutes.jsx):
  `/politica-envios`, `/preguntas-frecuentes`, `/terminos`,
  `/politica-privacidad`. Cada una muestra solo el título y un aviso
  "Estamos preparando este contenido" — sin texto legal.
- Se limpiaron del CSS las reglas `.data`/`.dataLabel`/`.dataRow` que
  quedaron sin uso al retirar la columna "Contacto" vieja.
- **Documentación**: `09_COMPONENTES.md` v2.9.2 (§9.8 `PublicFooter`,
  contrato y estructura reescritos — de paso se corrigió una descripción
  desactualizada de "acordeón en móvil" que el componente real nunca tuvo).
- **Verificado en vivo** (Docker, `http://localhost:8080`): el pie muestra
  Marca, Soporte, Formas de pago y Redes sociales (Instagram real desde
  `social_links`) más el pie inferior con copyright y los datos
  institucionales cargados; los 4 enlaces "Soporte" navegan a páginas reales
  con el aviso de contenido en preparación; en mobile (375px) las columnas
  se apilan en una sola (`grid-template-columns: 1fr`, confirmado por
  cómputo del DOM).
- Frontend: 411/411 tests, lint sin errores nuevos, build exitoso.

## [24/08/2026] — Normalización de nombre y formulario único de producto

### Implementado

- **Pedido explícito del usuario**, dos ajustes al módulo de productos del panel admin:

**1. Normalización automática del nombre.** El campo "Nombre" pasa a formato
título tanto al crear como al editar: "nike air" → "Nike Air", "NIKE AIR
MAX" → "Nike Air Max", "adidas predator elite" → "Adidas Predator Elite". Se
buscó primero si ya existía una función de este tipo en el proyecto (no
había ninguna, solo `slugify` en `classificationForm.js`, que es otra cosa) y
se escribió `toTitleCase` en [`productForm.js`](../frontend/src/features/admin/products/utils/productForm.js).
Se aplica en el campo (al perder el foco, no en cada tecla) y de nuevo en
`toPayload` como red de seguridad — el mismo lugar por el que pasan alta y
edición, así que no hay lógica duplicada entre los dos flujos. El slug lo
sigue generando el backend, ahora a partir del nombre ya normalizado.

**2. Formulario único para Crear y Editar.** Hasta ahora eran dos
componentes distintos: `QuickAddProductForm` (alta, campos reducidos, sin
navegar al guardar — carga en serie, pedido del administrador de
2026-08-16) y `ProductForm` (edición, campos completos, pero sin imágenes ni
cantidad por talle — eso vivía aparte, en la ficha de solo lectura). Se
auditó el código real de los dos antes de tocar nada y se confirmaron con el
usuario dos decisiones de diseño no derivables del código: (a) el alta sigue
sin navegar al guardar, se mantiene la carga en serie; (b) la ficha de
detalle conserva su propia gestión completa de imágenes y variantes
(reordenar, marcar principal, registrar venta, eliminar variante) además de
lo que ahora carga el formulario.

`QuickAddProductForm.jsx` se retira (fusionado). `ProductForm.jsx` pasa a
cubrir los dos modos — mismos campos, mismo orden, mismas validaciones — con
dos secciones nuevas: **Talles y stock** (cantidad por talle, junto a cada
casilla marcada) e **Imágenes** (cola local + subida diferida al crear,
galería real embebida al editar, reutilizando `ImagesSection` sin
duplicarla). El backend ya soportaba esto sin cambios: `POST`/`PUT` devuelve
las variantes con `id` recién generado, así que el formulario guarda
primero los datos del producto y después reconcilia cantidades
(`PATCH .../variants/{id}`) y sube imágenes pendientes, mismo patrón de dos
pasos que ya usaba el alta rápida. El SKU pasa a ser opcional en los dos
modos (antes solo en el alta rápida): si se deja en blanco, se autogenera a
partir del nombre normalizado.

`ProductFormPage.jsx` se simplifica: ya no elige entre dos componentes,
siempre renderiza `ProductForm`, pasándole `product` (o `null`) y un
`onSaved` que decide si navega (edición) o no (alta).

- **Documentación**: `07_PANEL_ADMIN.md` v1.12.0 (§14.3, reescrita).
- Frontend: 411/411 tests (43 en `productForm.test.js`, con casos nuevos de
  `toTitleCase`, SKU autogenerado y precarga de cantidad por talle), lint
  sin errores nuevos (una advertencia preexistente de Fast Refresh por
  exportar varias piezas del mismo archivo, igual que ya tenía el
  `ProductForm` anterior), build exitoso (319 módulos, uno menos: se retiró
  `QuickAddProductForm.jsx`).
- Backend: sin cambios de contrato ni migraciones — se corrió de todos
  modos la suite de `test_admin_products.py` (63 tests) para confirmar que
  la forma de la respuesta de `POST`/`PUT` (incluye `variants` con `id`) es
  la que el formulario nuevo necesita.
- **Pendiente de verificación manual**: igual que en tandas anteriores, no
  se hizo clic real en el panel admin — no se ingresan credenciales por
  política. Falta confirmar en vivo: crear un producto con "nike air" y
  verificar que se guarda como "Nike Air" con slug `nike-air`; que Crear y
  Editar muestran el mismo formulario; que la carga de imágenes y cantidad
  por talle funciona en los dos modos; y que la ficha de detalle sigue
  gestionando venta/eliminación de variantes sin cambios.

## [24/08/2026] — La categoría "Deportes" no se anida en Hombres/Mujeres/Infantil

### Implementado

- **Pedido explícito del usuario**: el panel administra una categoría de producto real con slug `deportes` (distinta de la entidad `Sport` que alimenta el eje `DEPORTES` del navbar). Al no estar excluida como `accesorios`, aparecía duplicada como subcategoría dentro de los paneles de `HOMBRES`, `MUJERES` e `INFANTIL`. Verificado contra `GET /api/v1/categories` real: la categoría `Deportes` existe sin hijas, junto a Calzado, Clubes e Indumentaria.
- **[`navAxes.js`](../frontend/src/features/store/utils/navAxes.js)**: nueva constante `SPORTS_CATEGORY_SLUG = 'deportes'`; `wearable` excluye ese slug con el mismo criterio que `ACCESSORIES_SLUG`. La categoría no se borra ni deja de administrarse — solo deja de listarse dentro de esos tres ejes.
- **Documentación**: `09_COMPONENTES.md` v2.9.1.
- **Verificado en vivo** (Docker, `http://localhost:8080`): el panel de "Hombres" ahora lista Calzado, Clubes e Indumentaria (sin "Deportes"); el eje independiente "Deportes" del navbar sigue mostrando los deportes reales (Fútbol, Básquet, etc.) sin cambios.
- Frontend: 398/398 tests (31 en `navAxes.test.js`, incluyendo 3 casos nuevos para este caso), lint sin errores nuevos.

## [24/08/2026] — Etiqueta "Infantil" en el navbar

### Implementado

- **Pedido explícito del usuario**: el eje `NIÑOS` del navbar pasa a mostrarse como `INFANTIL`. Solo cambia la etiqueta comercial en [`navAxes.js`](../frontend/src/features/store/utils/navAxes.js) (`GENDER_AXES`); la clave interna (`ninos`), el filtro `gender=boys,girls` y el resto del contrato no cambian. Se alinea con `useCatalogFilters.js`, que ya agrupaba Niños/Niñas bajo la etiqueta `Infantil` en el filtro de sexo del catálogo.
- **Documentación**: `09_COMPONENTES.md` v2.9.0 (tabla de ejes, `COMPP-06`).
- Frontend: 395/395 tests en verde (sin cambios de comportamiento que rompan aserciones existentes), lint sin errores nuevos, build exitoso.

## [24/08/2026] — Eje "Deportes" en el navbar

### Implementado

- **Pedido explícito del usuario**: agregar un eje `DEPORTES` al navbar público, entre `NIÑOS` y `ACCESORIOS`, reutilizando la entidad `Sport` ya existente — sin backend nuevo. Auditado primero contra el código real (`GET /api/v1/sports` ya existía, `catalogService.getSports()` ya existía, `useCatalogFilters.js` ya leía `?sport=` de la URL); solo faltaban el hook `useSports` y la composición del eje.
- **[`useSports.js`](../frontend/src/features/catalog/hooks/useSports.js)** (nuevo): hook `useQuery` calcado de `useBrands.js`.
- **[`navAxes.js`](../frontend/src/features/store/utils/navAxes.js)**: `catalogHref` suma `sport`; `buildNavAxes(categories, brands, sports)` arma el eje `deportes` listando los deportes reales como enlaces planos (`groups` sin `items`, sin bloque "Marcas") — a diferencia de los ejes de sexo, no combina con categorías porque `Sport` no tiene jerarquía propia.
- **[`PublicNavbar.jsx`](../frontend/src/features/store/components/PublicNavbar.jsx)**: agrega `useSports()` y lo pasa a `buildNavAxes`.
- **Documentación**: `09_COMPONENTES.md` v2.8.0 (§9.8 `PublicNavbar`, `MegaMenu`, tabla de ejes).
- **Verificado en vivo** (Docker, `http://localhost:8080`): el eje "Deportes" aparece en el navbar; su `MegaMenu` lista los 5 deportes reales (Basketball, Fútbol, Natación, Running, Tenis); clic en "Fútbol" navega a `/catalogo?sport=futbol` y filtra correctamente (2 productos, chip "Deporte: futbol" en filtros activos).
- Frontend: 395/395 tests (28 en `navAxes.test.js`, incluyendo los nuevos casos del eje Deportes), lint sin errores nuevos, build exitoso.

## [24/08/2026] — Hero afinado, filtro y sexo múltiple, correcciones de hover y paginación

### Implementado

- **Pedido explícito del usuario**: ronda de ajustes visuales puntuales sobre el trabajo del mismo día (Hero, filtros del catálogo, `ProductCard`) más un cambio funcional mayor (sexo múltiple por producto), cada uno auditado antes de tocar código.
- **Hero, ajustes de composición**: botones "Contacto"/"Promociones" pasan de admin-configurables (`banner.link_url`/`button_label`) a fijos, en la esquina inferior izquierda — "Contacto" usa `#3B6CFF` (único color puntual fuera de tokens, aprobado explícitamente) y enlaza a `/contacto` (ruta pública ya existente, no se inventó una). Indicadores del carrusel: se quitan las flechas (compiten con el contenido fijo del Hero), quedan centrados en una franja propia reservada con `padding-block-end` en `Hero.module.css`, y su tamaño real pasa de 8px a 44px (por la regla global de área táctil de `base.css`) a 12px — el botón sigue siendo 44px para el tacto, el punto visible es un `::after` aparte.
- **Imagen del Hero sin recorte**: `objectFit` pasa de `cover` a `contain` — un banner panorámico en el recuadro vertical de mobile (`--aspect-hero: 4/5`) con `cover` dejaba ver solo el tercio central del ancho, cortando el texto de los bordes.
- **Filtros del catálogo, ajuste visual**: "Limpiar todo" ([`ActiveFilters.jsx`](../frontend/src/features/catalog/components/ActiveFilters.jsx)) y el campo de búsqueda ([`SearchInput.jsx`](../frontend/src/features/catalog/components/SearchInput.jsx)) pasan de estilos casi invisibles (`btn-link`, borde gris claro de Bootstrap) a borde y foco en negro (`--color-ink-900`), con el mismo patrón de `outline` en foco que ya usa `base.css` para no pelear con el `box-shadow` azul de Bootstrap.
- **Bug de hover corregido**: la segunda foto de `ProductCard` (`object-fit: contain`) dejaba ver la imagen principal por debajo en sus franjas vacías, sin fondo propio — se le agrega `background-color: var(--color-surface)`. De paso, el hover deja de estar atado solo al recuadro de la imagen y pasa a toda la tarjeta.
- **Filtro "Sexo" en el catálogo público**: todo el soporte de backend/URL ya existía (`ProductQuery.gender_ids`, `?gender=`); solo faltaba el `<select>`. Nueva constante `GENDER_FILTER_OPTIONS` en [`useCatalogFilters.js`](../frontend/src/features/catalog/hooks/useCatalogFilters.js) con las 5 etiquetas exactas pedidas (Hombre/Mujer/Niños/Niñas/Unisex), sin tocar `shared/config/labels.js` porque ese archivo lo comparte el panel admin. Verificado con la API real: `?gender=men` devuelve 5 productos contra 8 sin filtrar, combina con `category`, y "Limpiar filtros" lo vacía.
- **Bug de paginación corregido** (hallado al verificar el filtro de Sexo, no relacionado con él): `updateFilter` construía `{ ...filters, [key]: value, page: 1 }` — el `page: 1` del final siempre ganaba, así que cambiar de página volvía siempre a la 1. Se extrae `nextFiltersAfterChange` (testeada aparte) que solo fuerza `page: 1` cuando el campo que cambia no es la propia página.
- **Sexo pasa de N:1 a N:M** (`RN-09` revisada, pedido explícito del usuario, confirmado tras advertir que no era un cambio de solo frontend): un producto puede pertenecer a varios sexos. Se retira `products.gender_id` y se agrega `product_genders`, mismo patrón sin columna propia que `product_sports`/`product_categories`/`product_sizes`. Tres migraciones en orden — `cdc83d47fa5e` (crea la tabla), `5208210560cf` (backfill de `gender_id` a la tabla nueva; usa `insert().from_select(...)` de SQLAlchemy Core, no `INSERT INTO` literal, para no aparecer como dato comercial sembrado ante `test_commercial_data_is_not_seeded_by_any_migration`), `b99b11955f25` (retira columna, FK e índice). Backend: `ProductRepository._apply_filters` pasa de `Product.gender_id.in_(...)` a un `exists()` sobre `product_genders` (mismo patrón que `category_ids`/`sport_ids`); `FACET_SPECS["gender"]` pasa de `"direct"` a `"association"`; `AdminProductService` valida "al menos un sexo" por código, ya no hay FK `NOT NULL` que lo haga. Frontend: `ProductForm.jsx` cambia el `<Selector>` de Sexo por `GrupoCasillas` (mismo componente que categorías adicionales y deportes); el alta rápida no cambia su UI (sigue siendo un solo selector) pero envuelve el valor en una lista de uno al guardar. `ProductDetailDTO.gender`/`ProductAdminDTO.gender` pasan a `genders` (lista); de paso se corrige un bug latente en la ficha pública que traducía `product.gender.name` en vez de `.slug`.
- **Documentación**: `09_COMPONENTES.md` (Hero, `HeroCarousel`), `04_BASE_DATOS.md` v1.6.0 (§6, §8.1, §9.2.1, §9.2.16, §9.6), `05_API.md` v1.8.0 (§10.4, §10.5, §9.4), `07_PANEL_ADMIN.md` v1.11.0 (§7.1, §14.3).
- Backend: suite completa de `pytest` en verde (todas las tablas de limpieza de tests que insertaban `products` a mano — `test_admin_dashboard.py`, `test_admin_promotions.py`, `test_admin_trails.py`, `test_image_pipeline.py`, `test_price_history.py`, `test_schema_constraints.py` — actualizadas para el nuevo esquema). Frontend: 388/388 tests, lint sin errores nuevos, build exitoso.
- **Pendiente de verificación manual**: igual que en la tanda anterior, no se pudo hacer clic real en el panel admin (no se ingresan credenciales por política). El alta/edición de producto con varios sexos se verificó con tests de integración de backend contra el mismo servicio que usa el formulario, y la ficha pública se confirmó en vivo vía la API real. Falta el clic real en "Sexo" del formulario de edición.

## [24/08/2026] — Hover de imagen, Hero rotativo, Novedades editorial, talles en la tarjeta

### Implementado

- **Pedido explícito del usuario**: tanda de ajustes funcionales y visuales del frontend, auditada primero (Fase A) contra el código real antes de tocar nada — ver el diagnóstico entregado en la conversación.
- **Hover de imagen (`ProductCard`)**: ya estaba implementado de punta a punta (backend, DTO y crossfade). El único hallazgo real de la auditoría fue que no había ninguna guarda para dispositivos táctiles. Se agrega `@media (hover: hover) and (pointer: fine)` en [`ProductCard.module.css`](../frontend/src/features/catalog/components/ProductCard.module.css) para que el zoom y el cruce a la segunda foto no queden "pegados" tras un tap.
- **Hero rotativo**: revierte una decisión de negocio documentada y corregida en `09_COMPONENTES.md` v2.2.0 ("no es un carrusel y no debe volver a serlo") — el usuario confirmó explícitamente la reversión al presentársele el conflicto encontrado en la auditoría. Nuevo [`HeroCarousel.jsx`](../frontend/src/features/store/components/HeroCarousel.jsx): autoplay cada 4,5s (se reinicia en cada cambio manual o automático), flechas, indicadores, pausa en hover/foco y respeto de `prefers-reduced-motion` (el temporizador no arranca si está activo, no solo la transición). Lógica pura extraída y testeada aparte en [`heroCarouselMetrics.js`](../frontend/src/features/store/utils/heroCarouselMetrics.js) (`wrapIndex`, `shouldAutoplay`). El backend no tenía ningún límite de cantidad de banners — el límite percibido era que `HomePage` solo leía `banners[0]`; ahora usa la zona `hero` completa.
- **Novedades pasa de banners a productos**: hasta ahora "Novedades" era `BannerRail placement="news"` (imágenes administradas, no productos). Auditado explícitamente si `is_featured` o `is_new` servían para esto — ninguno: `is_featured` ya es "Destacados" y `is_new` es un autotoggle sin curaduría ni orden propio, reutilizarlo habría sido exactamente el hijack semántico que se quería evitar. Se sigue el patrón ya existente de `brands.home_position`:
  - **Migración** [`f4d4c1fe2de3_product_home_new_position.py`](../backend/migrations/versions/f4d4c1fe2de3_product_home_new_position.py): columna `products.home_new_position` (nullable, `CHECK >= 0`), aplicada y verificada sin deriva de esquema (`flask db check`).
  - **Backend**: `ProductRepository.list_home_new_showcases`/`available_sizes_for`, `AdminProductRepository.next_home_new_position`, `AdminProductService.set_home_new`, endpoint público `GET /products/home-new` y admin `POST /admin/products/{id}/set-home-new`.
  - **Panel admin**: acción "Agregar a novedades" / "Quitar de novedades" por fila en [`ProductsTable.jsx`](../frontend/src/features/admin/products/components/ProductsTable.jsx), junto a Ver/Editar/Activar/Eliminar, con badge de estado; reversible e inmediata, sin modal de confirmación.
  - **Frontend público**: nuevo [`NewArrivalsCarousel.jsx`](../frontend/src/features/store/components/NewArrivalsCarousel.jsx) reemplaza al `BannerRail` de esa zona en `HomePage`; tarjetas grandes (`Carousel metric="categories"`), desenfoque de bordes reforzado respecto del de `BannerRail`. `Banner.placement="news"` no se retira del modelo ni del panel, solo deja de tener consumidor público.
- **Talles disponibles en la tarjeta**: el endpoint de listado (`GET /products`) no exponía talles, solo el `DETAIL` los tenía. Se agrega `available_sizes` a `ProductListItemDTO`, con una consulta en lote nueva (`ProductRepository.available_sizes_for`, sin N+1) que solo trae talles con `quantity > 0` — reutiliza `derive_availability` existente, ningún cambio a la lógica de stock. `ProductCard.jsx` los pinta como chips compactos, en varias filas si hace falta, con tope de 6 más un "+N". Se actualiza deliberadamente el contrato congelado `test_product_list_item_matches_the_contract` y se agregan tests nuevos (talles ocultos sin stock, producto sin ningún talle comprable, talles alfabéticos de indumentaria vs. numéricos de calzado).
- **Fixture de pruebas** ([`tests/fixtures/catalog.py`](../backend/tests/fixtures/catalog.py)): las variantes pasan a declarar una cantidad explícita por talle (antes nacían todas en 0 por default), necesario para poder probar qué talles se ocultan. Se preserva a propósito que `zapatilla-puma-run` quede en 0 real, porque `test_cart_revalidate.py::test_out_of_stock_product_stays_in_the_cart` depende de eso.
- **Documentación**: `09_COMPONENTES.md` v2.7.0 (`Hero`, `HeroCarousel` nuevo, `NewArrivalsCarousel` nuevo, `ProductCard`, decisiones `COMPP-07`/`COMPP-08`), `04_BASE_DATOS.md` v1.5.0 (§9.2.1), `05_API.md` v1.7.0 (§7.3b, §9.3, §10.4, §10.5), `07_PANEL_ADMIN.md` v1.10.0 (§7.1, §8.1, §13.3, §14.2).
- Backend: suite completa de `pytest` en verde (orden por defecto; se verificó que un orden de invocación distinto entre `test_admin_products.py` y `test_public_catalog.py` ya era sensible al orden *antes* de este cambio, por la fixture de sesión `catalog_client` — no es una regresión introducida acá). Frontend: 383/383 tests (`heroCarouselMetrics.test.js` nuevo), lint sin errores nuevos, build exitoso.
- **Pendiente de verificación manual**: el flujo de "Agregar/Quitar de Novedades" y el Hero con 2+ banners no se pudieron probar haciendo clic en el panel admin real — no se ingresaron credenciales en el formulario de login por política (no se manejan contraseñas en nombre del usuario, ni siquiera las del propio panel). Verificados en su lugar con tests de integración de backend contra el mismo servicio/endpoint que usa el botón, y con inspección de red/DOM en el home público (que no requiere sesión). El usuario debería confirmar visualmente el clic real al menos una vez.

## [19/08/2026] — Eliminación completa de "color" del catálogo

### Implementado

- **Pedido explícito del administrador**: retirar "color" como clasificación del catálogo. No era un campo suelto — era una entidad completa (tabla propia, relación N:M con productos, FK en variantes) con reglas de negocio aprobadas (`RN-13`, `RN-14`, `RN-16`), enganchada en backend, panel admin, tienda pública, carrito y plantilla de WhatsApp.
- **Base de datos:** dos migraciones nuevas, en orden. [`add2a263a249_merge_variant_color_duplicates.py`](../backend/migrations/versions/add2a263a249_merge_variant_color_duplicates.py) (datos, **no reversible**): fusiona variantes que solo se diferenciaban por color — 13 grupos detectados en la base de desarrollo — sumando su `quantity` en la de menor `id` y borrando el resto. [`d20b530ad8a6_remove_colors.py`](../backend/migrations/versions/d20b530ad8a6_remove_colors.py) (esquema): elimina las tablas `colors` y `product_colors`, la columna `variants.color_id`, y reemplaza el índice único `uq_variants_product_color_size` por `uq_variants_product_size` sobre `(product_id, size_id)`.
- **Backend:** modelo `Color` y tabla `product_colors` eliminados; `Variant.color_id`/`Variant.color` eliminados. `_sync_variants` en [`admin_product_service.py`](../backend/app/services/admin_product_service.py) deja de generar el producto cartesiano `colores × talles` y pasa a un solo `for size in product.sizes`. `ColorDTO`, `ColorCreateDTO`/`ColorUpdateDTO` y sus rutas (`GET /colors` público, CRUD `/admin/colors`) eliminados. Plantilla de WhatsApp por defecto (`whatsapp_defaults.py`) pierde `Color: {{color}}`.
- **Frontend:** [`VariantSelector.jsx`](../frontend/src/features/products/components/VariantSelector.jsx) pasa de cruzar color y talle bidireccionalmente a un selector de un solo eje (talle). Formularios de producto (`ProductForm.jsx`, `QuickAddProductForm.jsx`) pierden el bloque "Colores"; `expectedVariantCount` pasa de `colores × talles` a solo talles. Filtros del catálogo, carrito y plantilla de WhatsApp del lado del cliente actualizados en conjunto para no desincronizarse con el backend.
- **Documentación:** `01_ANALISIS_NEGOCIO.md` 2.7.0 (`RN-13` reformulada a Producto + Talle, `RN-14`/`RN-16` pierden su mención a color, `CU-A-19` retirado, entidad "Color" fuera del glosario de negocio); `00.2_GLOSARIO.md` 1.8.0 y `00.3_NOMENCLATURA.md` 1.5.0 (entidad y diccionario); `04_BASE_DATOS.md` 1.4.0 (§6 y §9.2 renumeradas, de 18 a 17 entidades); `05_API.md` 1.6.0 y `05.1_API_DATABASE_CROSS_REVIEW.md` (DTOs y endpoints retirados); `06_FRONTEND.md`, `07_PANEL_ADMIN.md` 1.9.0 (de paso, corrige el drift ya existente entre la ruta `/admin/colores` y el permiso `manage_colors` documentados, que nunca existieron en el código) y `09_COMPONENTES.md` 2.6.0.
- Backend: suite completa de `pytest` en verde. Frontend: 374/374 tests, lint sin errores, build exitoso.

## [19/08/2026] — Imágenes en el alta rápida de productos

### Implementado

- **Pedido explícito del administrador**: revertir la decisión del 16/08/2026 que mantenía el alta rápida sin imágenes — ahora se cargan en el mismo paso que el producto.
- Nuevo [`PendingImagesField.jsx`](../frontend/src/features/admin/products/components/PendingImagesField.jsx): selector de archivos con vista previa local, sin recorte (las imágenes de producto usan derivados 1:1 del servidor) y sin galería de reordenamiento (no aplica antes de que el producto exista).
- [`QuickAddProductForm.jsx`](../frontend/src/features/admin/products/components/QuickAddProductForm.jsx): al crear el producto, sube los archivos pendientes contra `POST /admin/products/{id}/images` **de a uno, no en paralelo** — una subida concurrente contra un producto sin imágenes hacía que dos archivos compitieran por ser "el principal" y disparaba un `UniqueViolation` real en `uq_images_primary_per_product` (confirmado en vivo antes del arreglo). Con `Promise` secuencial, un archivo fallido no arrastra a los demás ni pone en duda el producto ya creado; si algo falla, el archivo queda disponible para reintentar sin re-subir los que sí funcionaron. Guarda contra un caso de mezcla: si el administrador pasa a cargar un producto nuevo con imágenes fallidas de uno previo sin resolverlas, el envío se bloquea en vez de subírselas al producto equivocado.
- El mismo problema de concurrencia existe en la galería de imágenes de la ficha de producto (`ImagesSection.jsx`, sin tocar en esta tanda) — señalado aparte para una corrección independiente.

## [19/08/2026] — Hover de la tarjeta de producto cambia a la segunda foto

### Implementado

- **Pedido explícito del administrador.** [`ProductRepository.thumbnail_and_secondary_paths_for`](../backend/app/repositories/product_repository.py) reutiliza la consulta por lote que `thumbnail_paths_for` ya hacía para la imagen principal — la segunda fila por producto se descartaba, ahora se captura en la misma pasada, sin query nueva. Nuevo campo `secondary_thumbnail_url` en `ProductListItemDTO`.
- [`ProductCard.jsx`](../frontend/src/features/catalog/components/ProductCard.jsx): al pasar el mouse, si el producto tiene segunda foto, se superpone con una transición de opacidad (crossfade) sobre la principal; sin segunda foto no se renderiza nada extra. `Image.module.css` suma `position: relative` al contenedor para soportar la superposición.

## [18/08/2026] — Migas de pan como píldoras

### Implementado

- [`Breadcrumbs.jsx`](../frontend/src/shared/components/Breadcrumbs.jsx) deja las clases Bootstrap (`breadcrumb`, `breadcrumb-item`, separador `/`) y pasa a un [`Breadcrumbs.module.css`](../frontend/src/shared/components/Breadcrumbs.module.css) propio: cada tramo es una píldora (`radius-pill`) independiente, sin separador — el espacio entre píldoras ya ordena. El tramo actual usa un fondo un poco más marcado y texto en negrita; los enlaces se resaltan igual al pasar el mouse o enfocarse por teclado. Pedido explícito del usuario, a partir de una captura de "Inicio / Catálogo". Solo afecta las páginas públicas (`Page.jsx`): el panel admin arma sus propias migas con Bootstrap directo, sin tocar este componente.
- Verificado en vivo: colores, radio y peso de fuente confirmados por estilo computado en `/catalogo`. Frontend: 379/379 tests, lint sin errores nuevos, build exitoso.

## [18/08/2026] — Diseño visual: más tinta, menos blanco en la Home

### Implementado

- **Redistribución de tonos en la Home** (`08_UI_SYSTEM.md` v2.3.0, `UDS-12`; `09_COMPONENTES.md` v2.5.0), a pedido explícito del usuario tras revisar varios mockups de ideas de fondo: Novedades y Ofertas destacadas (`BannerRail`) y Promociones (`ProductRail`) pasan de tono claro a `tone="inverse"` en [`HomePage.jsx`](../frontend/src/features/store/pages/HomePage.jsx). La Home pasa de 2 bloques oscuros (Hero, Marca destacada) a 5, con Destacados como único respiro claro entre ellos; Confianza e Historia se mantienen claras al cierre, antes del footer oscuro.
- [`Section.module.css`](../frontend/src/shared/components/Section.module.css): nuevas variables `--section-text-muted`, `--section-text-link`, `--section-text-link-hover` y `--section-header-accent-*`, declaradas solo en `.toneInverse`. [`SectionHeader.module.css`](../frontend/src/shared/components/SectionHeader.module.css) las consume con `var(--x, valor-claro)` — hereda el tono sin necesitar saber cuál es. Esto evita que el eyebrow y el enlace "Ver todo" queden con tinta oscura sobre fondo oscuro al cambiar de tono, y agrega un filete de acento junto al título solo en tono inverso.
- [`Hero.module.css`](../frontend/src/features/store/components/Hero.module.css): fondo con halo radial (`ink-800` al centro, `ink-900` en los bordes) en vez de tinta plana, visible en el estado sin imagen y en la carga.
- [`BannerRail.module.css`](../frontend/src/features/store/components/BannerRail.module.css): diagonales sutiles (`ink-800`/`ink-900`) en el marco del carrusel, visibles en los márgenes y huecos entre piezas.
- [`BrandShowcase.module.css`](../frontend/src/features/store/components/BrandShowcase.module.css): filete de acento de 3px en el borde superior, para distinguirlo de los demás bloques oscuros que no tienen marca propia.
- `Section.module.css` `.toneDefault`: trama de puntos casi imperceptible (`ink-200` sobre blanco), acotada porque hoy este tono lo usa exclusivamente Destacados.
- Verificado en vivo: tonos, colores de texto heredados y filete de acento confirmados por estilo computado en cada sección renderizada (Hero, Novedades, Destacados, Promociones); Ofertas destacadas, Marca destacada e Historia comparten el mismo código pero no tienen datos de ejemplo cargados hoy (sin banners `promo`, sin marca con `home_position`, sin `about_title`), así que no se verificaron visualmente en esta pasada.
- Frontend: 379/379 tests, lint sin errores nuevos, build exitoso.

## [18/08/2026] — Logos de marca ilegibles en el menú de navegación

### Corregido

- **El bloque "Marcas" del menú de navegación (`MegaMenu` de escritorio y cajón móvil de `PublicNavbar`) usaba `tone="inverse"` en `MediaTile`**, un tile con fondo `--color-ink-800` (casi negro) pensado para verse "sobre un bloque de tinta". Los logotipos reales subidos por el usuario están dibujados en tinta negra sobre transparente (como la mayoría de los logos de marca) — sobre un fondo casi negro, el logo se volvía invisible y el tile se veía como un rectángulo negro liso. No era un bug del pipeline de imágenes (la transparencia de los archivos es correcta, confirmado en la entrada anterior de este changelog): era un tile oscuro que no funciona con contenido oscuro. Reportado por el usuario como *"al subir estos aparecen con fondo negro"*, en la franja de marcas del menú público.
- Corregido quitando `tone="inverse"` en [`MegaMenu.jsx`](../frontend/src/features/store/components/MegaMenu.jsx) y [`PublicNavbar.jsx`](../frontend/src/features/store/components/PublicNavbar.jsx) (cajón móvil): el bloque "Marcas" pasa al tile claro por defecto de `MediaTile`, el mismo que ya usa `BrandStrip` en la home y que sí funciona con logos de tinta oscura. Verificado en vivo, escritorio y móvil: los tiles ahora quedan en blanco (`rgb(255, 255, 255)`) sobre el panel oscuro del menú.
- **Con el tile ya corregido, el usuario seguía viendo dos logos (Nike, Under Armour) en negro sólido — un segundo problema, real y distinto.** Se descartó el pipeline por cuarta vez de forma independiente: lectura de píxeles con Pillow, decodificación en `canvas` dentro del navegador, comparación de hash disco↔nginx byte a byte, y composición manual sobre blanco exportada a PNG — las cuatro muestran los logos correctos. El problema resultó ser el **canal alfa de WebP renderizado mal en una franja real de navegadores** (confirmado en vivo por el usuario con Brave, aceleración por GPU): el archivo es válido, pero el decodificador del cliente lo pinta como negro sólido en vez de transparente. Se probó primero cambiar el WebP de *lossy* a *lossless* (hipótesis descartada: el usuario confirmó que seguía en negro) y luego servir el respaldo JPEG de ese mismo logo (confirmado: se veía bien). Como acababa de sacarse el único lugar oscuro donde se mostraban marcas (el punto anterior de esta misma entrada), hoy todos los logotipos de marca se muestran sobre fondo claro — el JPEG compuesto sobre blanco se ve idéntico al WebP ahí, así que no hay costado visual por el cambio.
- Corregido en [`local_storage.py`](../backend/app/infrastructure/storage/local_storage.py): nuevo `JPEG_CANONICAL_NAMESPACES`, que hace que `brands` (logotipo y collage) publique el respaldo JPEG como derivado canónico en vez de WebP — el WebP con alfa se sigue generando, solo deja de ser el que se sirve. Los 7 logotipos de marca existentes se regeneraron in-place (`AD-38`, mismo patrón que la entrada de transparencia anterior) y sus filas en `brands.image_path` se actualizaron de `.webp` a `.jpg`. Ver `99_AI_DEVELOPMENT_GUIDE.md` v1.4.0 §17.1.6 para el detalle completo y la excepción documentada.

## [18/08/2026] — Registro de ventas con descuento automático de stock

### Implementado

- **Registrar venta (`RN-82`).** El administrador puede registrar una venta sobre una variante desde su ficha de producto; el sistema descuenta la cantidad vendida de `variants.quantity` y recalcula la disponibilidad del producto (`RN-39`) en la misma transacción. No se puede vender más de lo que hay cargado (`409` si se intenta). Pedido explícito del usuario: *"agregar opcion de registrar ventas para que de esta manera reduzca en el stock desded el panel admin"*, confirmado como funcionalidad nueva (no como alias de "cargar cantidad").
- **Backend:** nueva tabla `sales` (migración `230ed82d06ed`), inmutable, mismo patrón que `price_history` (`RN-70`) — solo inserción y consulta, sin `updated_at` ni `deleted_at`. Modelo `Sale` (`administration.py`), `SaleRepository.record()`, `AdminProductService.register_sale()` (`@transactional`, valida stock, descuenta, recalcula disponibilidad, registra en auditoría) y endpoint `POST /api/v1/admin/products/{id}/variants/{variant_id}/sales`.
- **Frontend:** botón "Registrar venta" por variante en `VariantsSection.jsx`, con formulario inline (cantidad + confirmar), chequeo de cantidad del lado del cliente antes de llamar al servidor, y traducción de errores (`409` → stock insuficiente, `422` → cantidad inválida, `404` → variante inexistente) siguiendo `ERR-04`.
- **Documentación:** `01_ANALISIS_NEGOCIO.md` v2.6.0 (nueva regla `RN-82`; corrección de `RN-38`/`RN-39`, que seguían describiendo el modelo de 4 estados sin stock numérico anterior a v1.4.0), `04_BASE_DATOS.md` v1.3.0 (tabla `sales`, §9.2.18), `05_API.md` v1.5.0 (nuevo endpoint, §9.4), `07_PANEL_ADMIN.md` v1.8.0 (UI de "Registrar venta", §13.3/§14.3), `IMPLEMENTATION_ROADMAP.md` v1.1.0 (corrección de alcance: v1 sí maneja stock numérico y descuento por venta).

### Verificado

- Backend: 57/57 tests de `test_admin_products.py` (incluye 7 nuevos: descuento correcto, recálculo de disponibilidad, rechazo `409` por sobreventa, rechazo `422` por cantidad no positiva, registro inmutable en el ledger, auditoría). `ruff` y `black` limpios en todos los archivos tocados.
- Frontend: 379/379 tests, lint sin errores, build exitoso.
- Verificación manual en navegador: venta registrada descuenta stock en pantalla en tiempo real, botón se deshabilita en variantes sin stock, intento de sobreventa rechazado con el mensaje correcto en español.

---

## [18/08/2026] — Bug de transparencia en el pipeline de imágenes

### Corregido

- **`_generate_derivatives` (`local_storage.py`) descartaba la transparencia real de logos PNG en vez de componerla**, exponiendo un color arbitrario e inconsistente en su lugar. `Image.convert("RGB")` sobre una fuente con canal alfa no compone nada: borra el canal y deja ver el color que hubiera debajo de cada píxel transparente, que depende de cómo se exportó cada archivo y es invisible hasta que algo lo revela así. Encontrado al cargar logos de marca reales: Adidas y New Balance quedaron por casualidad sobre blanco, Nike, Puma y Under Armour sobre negro — mismo bug, distinta suerte. Corregido preservando RGBA en el derivado WebP (que si admite alfa) y componiendo explícitamente sobre blanco, con la máscara de alfa, solo en el respaldo JPEG (que no admite alfa por limitación real del formato). El bug alcanzaba a cualquier imagen con transparencia subida al sistema, no solo marcas.
- Los 5 logos de marca activos (Adidas, Nike, Puma, New Balance, Under Armour) tenían derivados generados con el bug ya en disco. Se regeneraron in-place desde los originales que el sistema preserva sin alterar (`AD-38`) — sin necesidad de volver a subir los archivos, algunos de los cuales el usuario ya había borrado de su carpeta local.

### Agregado

- `backend/tests/integration/api/test_image_pipeline.py`: dos regresiones. Una confirma que el derivado WebP conserva alfa real; la otra confirma que el respaldo JPEG compone sobre blanco en vez de exponer lo que hubiera debajo. Ambas probadas fallando contra el código anterior al fix (reproducen el `(0, 0, 0)` real que se veía en producción) antes de confirmarlas en verde.

### Implementado

- Contenido real cargado por API en marcas del catálogo: logos de Adidas, Nike, Puma, New Balance, Under Armour (`Brand.image_path`). Fila quedó sin logo a pedido del usuario, tras revisar que el archivo de origen no correspondía.

---

## [17/08/2026] — QA funcional: cierre de hallazgos y reincorporación de Plantilla WhatsApp

### Corregido

- **Enlace muerto "Editar plantilla" en Configuración**: apuntaba a `/admin/whatsapp-template`, ruta que no existía (`AdminRoutes.jsx` no la declaraba) y caía en el catch-all al Dashboard sin ningún error visible. Causa: v1.4.0 de `07_PANEL_ADMIN.md` había retirado el módulo el mismo día a pedido del usuario, pero el barrido de QA posterior llevó a reincorporarlo en vez de quitar el enlace (`07_PANEL_ADMIN.md` v1.5.0, §7.1, §13.12, §14.8). El backend (`GET`/`PUT /admin/store/whatsapp-template`, `POST .../reset`, `05_API.md` §9.13) nunca dejó de existir.
- **`key` de React duplicada en `BannerRail`**: dos banners con el mismo `placement` y `position` (`news`/`0`) generaban la misma `key` (`${placement}-${position}`), sin restricción de unicidad en `banners` que lo impida. Se agrega `title` como desempate en `features/store/components/BannerRail.jsx`; no se agrega restricción de base de datos (decisión explícita del usuario, para no bloquear al administrador antes de definir cómo se quiere gobernar el orden de banners).
- Reafirmado tras la sesión previa: el fix de CSRF de `cart/revalidate` y su test de regresión (`test_cart_csrf_hardening.py`) permanecen sin tocar.

### Agregado

- Feature `frontend/src/features/admin/whatsapp/`: pantalla de edición de la plantilla de WhatsApp con listado de variables disponibles, vista previa (mismo motor de sustitución que el mensaje real, `features/cart/whatsapp/template.js`) y restauración a la plantilla por defecto con confirmación (`RF-41`).
  - `api/whatsappTemplateApi.js`, `hooks/useWhatsappTemplate.js`, `hooks/useSaveWhatsappTemplate.js`, `hooks/useResetWhatsappTemplate.js`, `utils/whatsappTemplateForm.js` (con tests), `components/WhatsappTemplateForm.jsx`, `pages/WhatsappTemplatePage.jsx`.
  - Ruta `/admin/whatsapp-template` en `AdminRoutes.jsx` y entrada de sidebar en `AdminSidebar.jsx`.
  - `useSaveStoreSettings` y las mutaciones nuevas se invalidan mutuamente (comparten `message_template`/`item_template` con `StoreSettingsAdminDTO`), para que guardar en una pantalla no deje a la otra mostrando un valor pisado.
- `eslint-disable-next-line react/no-unknown-property` documentado en `shared/components/Image.jsx`: la regla asume el casing de props reconocidas de React 19; react-dom 18.3.1 (la versión fijada del proyecto) no tiene `fetchPriority` en su registro de propiedades DOM y descarta en silencio cualquier prop camelCase no reconocida, así que el atributo HTML en minúscula es imprescindible para que llegue al `<img>`, no solo cosmético.

### Corregido (durante la implementación de lo anterior)

- La propia pantalla nueva: tras "Restaurar plantilla por defecto", el formulario quedaba mostrando el texto editado en vez de la plantilla restaurada — `useState(initialValues)` solo toma su valor en el montaje inicial, y un `useMemo` que recalcula `initialValues` no vuelve a sincronizar `values`. Corregido leyendo la respuesta de `mutateAsync` y pisando el formulario a mano tras un restablecimiento exitoso.

---

## [17/08/2026] — Fase visual (en curso): traducciones pendientes y CSRF del carrito

### Corregido

- **Ficha pública de producto mostraba el slug crudo de `gender`** (`men` en vez de "Hombre"): a diferencia del panel admin, `features/products/pages/ProductDetailPage.jsx` no pasaba el valor por `translateGender`.
- **`img` con `fetchPriority` sin reconocer por React 18.3**: el atributo nativo debe ir en minúscula (`fetchpriority`) para llegar al DOM; `shared/components/Image.jsx` lo pasaba en camelCase y React lo descartaba con advertencia.
- **`POST /api/v1/cart/revalidate` devolvía `403 csrf_token_invalid` para cualquier cliente anónimo**, rompiendo el flujo de carrito → WhatsApp por completo. Causa: `csrf.exempt(public_bp)` (`app/api/__init__.py` §8.3) no alcanza a los blueprints anidados dentro de `public_bp` — Flask-WTF resuelve `request.blueprint` al nombre punteado del hijo (`"public.cart"`) y compara contra el objeto exacto pasado a `exempt()`, que era el padre. Como el resto de la API pública es solo lectura, el bug era invisible: `cart/revalidate` es la única escritura pública y por tanto el único punto donde CSRF llega a evaluarse. Corregido exentando cada blueprint anidado individualmente en `app/api/v1/public/__init__.py`.
- Comillas sin escapar en `VariantsSection.jsx` (`react/no-unescaped-entities`), bloqueaban `npm run lint`.

### Agregado

- `backend/tests/integration/api/test_cart_csrf_hardening.py`: regresión dedicada que enciende `WTF_CSRF_ENABLED` y confirma que `cart/revalidate` no exige token. Sin el fix, falla con `403`.

---

## [09/08/2026] — Fase 6 (en curso): corrección de seguridad y design tokens

### Corregido

Auditoría del código de panel heredado. Los siguientes defectos contradecían documentos aprobados y se corrigieron antes de continuar:

- **Hash de contraseñas**: se reemplazó SHA-256 sin sal por **bcrypt con coste 12** (`03_SEGURIDAD.md` §5.5). Nuevo módulo `core/security/password.py` con `hash_password`, `verify_password` en tiempo constante y validación de política mínima.
- **Sesión**: se reemplazó la cookie firmada de Flask —un testigo autocontenido, justo lo que `AD-37` rechaza— por **Flask-Session con backend SQLAlchemy** (`10_BACKEND.md` §12). Se añadieron expiración por inactividad de 30 minutos y expiración absoluta de 12 horas (`SEG-01`).
- **Códigos HTTP de autorización**: un Administrador que accede a un endpoint de Superadministrador recibía `401`; ahora recibe **`403`** con `rule: RN-67` (`03_SEGURIDAD.md` §6.3).
- **`RN-68` devolvía `400`**: las eliminaciones bloqueadas por entidades asociadas ahora devuelven **`409`** con el `RN-xx` violado (`05_API.md` §11, `05.1` CE-23, `ERR-03`).
- **Detalles de error en español**: traducidos a inglés técnico conforme a `AD-13`/`AD-16` (`errors[].detail` es descripción técnica; el español lo compone el frontend).
- **`login()` no confirmaba la transacción** al actualizar `last_login_at`.
- **Slug duplicado** pasó de `400` genérico a `409` con `rule: RN-79` (`AD-19`).
- **`FACET_SPECS` quedó indentada dentro de `ProductRepository`** al agregarle métodos; era constante de módulo y el `ImportError` impedía arrancar la aplicación entera.
- **`restore` era código muerto**: `find_by_id` filtraba `deleted_at IS NULL`, así que nunca podía encontrar la entidad a restaurar. Se añadió `include_deleted`.
- **CSRF bloqueaba el propio login**, que por §8.2 es donde se entrega el token. Se eximió ese endpoint y se añadió un manejador propio de `CSRFError` que devuelve `403 csrf_token_invalid` en vez de confundirse con "JSON malformado".
- **Flask-Session redefinía la tabla `sessions`** en cada `create_app()`, rompiendo toda la suite.

### Agregado

- CSRF en las escrituras del panel (`03_SEGURIDAD.md` §8); la API pública queda exenta por ser anónima y de solo lectura (§8.3).
- Rate limiting: 5 intentos cada 15 minutos en el login y 100 peticiones por minuto en la API pública (§14.1).
- `core/audit/service.py`: registro inmutable de escrituras del panel en la misma transacción que la operación (`AD-20`, `CONS-05`), con saneamiento de campos sensibles (§14.3 regla 2).
- `core/decorators/requires_role.py`: guards `requires_admin` y `requires_super_admin` (`PA-06`).
- Migración `b3e05f8c41d7_seed_initial_super_administrator`: semilla obligatoria de `04_BASE_DATOS.md` §11.3. La contraseña se inyecta por variable de entorno; la migración falla si falta, en lugar de sembrar una credencial conocida (`03_SEGURIDAD.md` §18.2).
- **Design tokens**: `shared/styles/tokens.css` transcribe los tokens de `08_UI_SYSTEM.md` §6, §7 y §11 como variables CSS en `:root` (`UDS-01`, `UDS-04`); `shared/styles/base.css` impone esos tokens a Bootstrap (`UDS-05`), fija el foco visible de 2 px (§9), el área táctil mínima de 44 px (§10) y respeta `prefers-reduced-motion`.

### Cambiado

- Los CSS Modules existentes pasaron de valores literales a tokens (`UDS-01`).
- Se eliminó el estilo inline estático de `CartItemRow` (`UDS-03`, `VIS-03`); el de `VariantSelector` se conserva por ser un valor calculado en runtime a partir de datos de negocio, excepción que `UDS-03` permite.

---

## [09/08/2026] — Fase 5: Frontend público

### Implementado

- `PublicLayout` con navegación responsive, acceso al carrito y footer (`06_FRONTEND.md` §7, §8).
- Home con banners (`GET /banners`) y productos destacados (`GET /products?is_featured=true`).
- Página de catálogo (`/catalogo`) con listado paginado, filtros en URL (`ES-05`), búsqueda con debounce y facetas (`05_API.md` §7.3).
- Ficha de producto (`/producto/:slug`) con galería, selector de variantes y agregado al carrito (`05_API.md` §7.4).
- Componentes reutilizables: `Image`, `PriceBadge`, `AvailabilityBadge`, `LoadingState`, `ErrorState`, `EmptyState`.
- Páginas institucionales `/nosotros` y `/contacto`.
- Integración del carrito existente dentro del layout público mediante `/carrito`.
- Rutas en español (`NM-01`) y SEO básico con títulos descriptivos.
- Estados de carga, error y vacío en todas las pantallas.
- Lazy loading de imágenes (`RNF-03`) y reserva de espacio mediante relación de aspecto.
- Navegación por teclado, foco visible y etiquetas ARIA en componentes interactivos.

### Cambiado

- `App.jsx` pasa a usar `BrowserRouter`, `QueryProvider` y `PublicRoutes`; se elimina el banco de pruebas temporal.
- `CartPage` usa `<section>` en lugar de `<main>` para evitar anidación semántica dentro del layout público.

### Corregido

- Ninguno.

---

## [09/08/2026] — Fase 4: Carrito y WhatsApp

### Implementado

- `POST /api/v1/cart/revalidate` con la envoltura `AD-16`, eco de `cart_content_version` (`AD-22`) y un ítem por variante en el orden recibido (`05_API.md` §8).
- Estados `ok`, `product_hidden`, `product_deleted` y `variant_removed`; nunca devuelve `409` ante condiciones de negocio (§8.6).
- Límites de `05_API.md` §8.6: más de 26 ítems → `422` (`RN-75`, `DN-17`), `variant_id` duplicado → `422`, cuerpo malformado → `400`, cantidad fuera de 1–99 → `422` (`RN-54`).
- Store Zustand del carrito con persistencia en LocalStorage y la estructura de `06_FRONTEND.md` §11.1 (`AD-06`, `RN-52`).
- Versión de contenido incrementada en cada mutación (`AD-22`), expiración a 30 días (`RN-57`) y descarte por versión de formato desconocida (`ES-04`).
- Revalidación en los dos momentos de `RN-56`: al abrir el carrito y antes de generar el mensaje.
- Descarte de respuestas obsoletas cuando la versión de contenido cambió en vuelo (`AD-22`).
- Resolución de discrepancias según `AD-25`, gobernada por `AD-28`: los estados de comparación se derivan en el cliente contra su snapshot.
- Bloqueo del envío mientras exista una discrepancia sin confirmar (`RN-77`, `RN-78`) y confirmación que no vuelve a revalidar.
- Camino de revalidación no completada con Reintentar / Cancelar / Enviar igualmente (`RN-81`, `AD-30`), distinguido de "verificado sin cambios".
- Sincronización entre pestañas por el evento `storage` (§11.3).
- Módulo único de WhatsApp (`R-04`, §13.11): motor de plantillas por sustitución (`PR-06`), omisión de etiqueta y valor juntos (§13.9), código de consulta `PS-XXXXX` (`RN-64`) y enlace `wa.me` (`RN-62`).
- Validación de longitud real del cuerpo antes de generar el enlace, con techo de trabajo de 4 000 caracteres (`RN-76`, `DN-17`, §13.10).
- 20 tests de contrato del endpoint y 45 tests de frontend.

### Cambiado

- Vitest ejecuta en entorno `jsdom` para poder verificar la persistencia real en LocalStorage.

### Corregido

- El mensaje de WhatsApp perdía nombre, marca, talle y color: `resolveRevalidation` no propagaba el snapshot local y el nombre del servidor viaja anidado en `product`.

---

## [09/08/2026] — Fase 3: API pública

### Implementado

- 11 endpoints públicos de `05_API.md` §7, todos bajo `/api/v1/` (`AD-17`) y con envoltura `AD-16`.
- DTOs públicos de §10.2 a §10.7 como estructuras puras sin dependencia del ORM (`AD-12`).
- Mappers modelo → DTO sin lógica de negocio (§8.8).
- Repositorios por agregado (`BK-01`) y servicios `CatalogService`, `ProductService`, `BannerService`, `StoreSettingService` (`BK-02`, `BK-05`).
- Un blueprint por agregado anidado bajo `public_bp` (`BK-03`).
- Filtros por slug con multivalor `OR` y combinación `AND` (§4.5, `RN-46`); categoría padre incluye descendientes (`AD-29`).
- Precio efectivo en SQL: oferta del producto vigente (`RN-32`, `RN-33`) y promoción de mayor descuento (`RN-36`, `RN-37`), con porcentaje redondeado hacia abajo (`RN-35`).
- Facetas sobre los seis criterios de `RN-46`, contadas sobre la selección actual (`RN-47`).
- Paginación por desplazamiento con acotado silencioso de `per_page` (`AD-31`, §4.4).
- Ordenamiento con conjunto cerrado de valores; `sort` no reconocido cae al valor por omisión (§4.6).
- Parámetros desconocidos ignorados (`AD-26`); parámetros conocidos malformados devuelven `422`.
- Búsqueda insensible a acentos sobre nombre, marca, categoría y deporte (`RN-48`, `AD-21`).
- 37 tests de contrato de la API pública (`11_TESTING.md` §7.2).
- `scripts/seed_dev_data.py` y `tests/fixtures/catalog.py` con el mismo conjunto de datos reproducible.

### Cambiado

- `docker-compose.yml` monta `./scripts` en el contenedor de backend.
- Los tests de restricciones de esquema usan slugs con espacio de nombres propio para ser independientes del orden de ejecución.

### Corregido

- Ninguno.

---

## [09/08/2026] — Fase 2: Modelo de datos

### Implementado

- 16 modelos SQLAlchemy y 4 tablas de relación N:M según `04_BASE_DATOS.md` §6 y §9.2.
- Relaciones y cardinalidades de §8.1, con todas las claves foráneas en `ON DELETE RESTRICT` / `ON UPDATE CASCADE` (§9.8).
- Soft delete `deleted_at` e `is_active` en las entidades de catálogo y panel (`AD-18`, `RN-69`); `price_history` y `audit_logs` quedan inmutables.
- 14 restricciones `CHECK` de §9.5 y unicidad de §9.7, incluyendo la no reutilización de slugs tras el borrado lógico (`AD-19`, `RN-79`).
- Índices únicos parciales `uq_variants_product_color_size` (`AD-15`) y `uq_images_primary_per_product` (`RN-20`).
- 22 índices obligatorios de §9.6.1 y el índice de búsqueda `idx_products_search` sobre `lower(immutable_unaccent(name))` (§9.6.2, `AD-21`).
- Extensión `unaccent` y función `immutable_unaccent`, requisito técnico del índice de búsqueda.
- Migración `85f7b1aa1535_create_initial_schema` (esquema) y `9a1c4e77b2d0_seed_genders_and_size_types` (datos), separadas según §11.2 regla 3.
- Semillas de `genders` y `size_types` de §11.3; no se siembran datos comerciales (`PA-10`).
- 37 tests de integración que violan cada restricción contra PostgreSQL real (`11_TESTING.md` §12.1).

### Cambiado

- `db.metadata` adopta una convención de nombres de restricciones para que `downgrade()` pueda eliminarlas de forma determinista.
- `migrations/env.py` deja de usar `get_engine()` obsoleto de Flask-SQLAlchemy.

### Corregido

- Ninguno.

---

## [09/08/2026] — Fase 1: Fundación backend

### Implementado

- Bootstrap de Flask con el orden de arranque de `10_BACKEND.md` §6: configuración → logging → SQLAlchemy → Migrate → blueprints → manejadores de error → middleware.
- Configuración por entorno `development`, `testing` y `production` con validación de arranque (`CFG-01`, `CFG-02`, `CFG-04`) y atributos de cookie de sesión de `SEG-01`.
- Logging estructurado JSON con identificador de correlación por petición (`OA-09`, `02_ARQUITECTURA.md` §9.13); nivel `ERROR` para `5xx` e `INFO` para `4xx` (`ERR-05`).
- Jerarquía de excepciones `AppException` completa (`ERR-01` a `ERR-06`) y manejadores globales que traducen toda respuesta a la envoltura `AD-16` con los códigos de `05_API.md` §11.1.
- Blueprints principales registrados vacíos: `public` (`/api/v1`), `admin` (`/api/v1/admin`), `seo` (`/_seo`) y `health` (`/health`).
- Middleware `RequestIdMiddleware`, `SecurityHeadersMiddleware`, `RequestLoggingMiddleware` y `ErrorWrapperMiddleware` (`10_BACKEND.md` §11, órdenes 1, 2, 3 y 7).
- Health checks `/health/live` y `/health/ready` delegando las sondas a `infrastructure/`.
- Capa `infrastructure/` con `database.py` y `storage/` (`StorageInterface` + `LocalStorage`), según `PA-12`.
- Estructura completa de capas de `10_BACKEND.md` §9 con paquetes declarados.
- Tests unitarios de configuración por entorno y de la envoltura `AD-16` (`11_TESTING.md` §12).
- CI ampliada con ejecución de `pytest` contra un servicio PostgreSQL.

### Cambiado

- El registro de acceso de Gunicorn se reemplaza por `RequestLoggingMiddleware`, que emite el registro estructurado con `request_id`.

### Corregido

- Ninguno.

---

## [09/08/2026] — Fase 0: Preparación del repositorio

### Implementado

- Estructura de carpetas `backend/`, `frontend/`, `docs/`, `scripts/`, `tests/` según `10_BACKEND.md` §9 y `06_FRONTEND.md` §7.1.
- `docker-compose.yml` con Nginx, backend (Gunicorn + Flask), frontend (Vite/React) y PostgreSQL 16 (`DPL-05`, `12_DEPLOY.md` §6).
- Volumen persistente `postgres_data` para la base de datos y `uploads_data` para imágenes (`DPL-04`, `AD-05`).
- Factory de Flask con configuración por entorno y validación de arranque (`CFG-01`, `CFG-02`, `10_BACKEND.md` §6 y §12).
- Health checks `GET /health/live` y `GET /health/ready` con verificación de base de datos, migraciones y storage (`12_DEPLOY.md` §10).
- Alembic inicializado en `backend/migrations/` mediante Flask-Migrate (`04_BASE_DATOS.md` §11).
- `.env.example` con las variables obligatorias y opcionales de `12_DEPLOY.md` §14.
- Configuración de lint y formato: Ruff y Black en el backend, ESLint y Prettier en el frontend (`11_TESTING.md` §20.1).
- CI mínima en `.github/workflows/ci.yml`: lint de backend y frontend, build de Vite y build de la imagen del backend.
- `README.md` operativo con arranque, verificación, migraciones y lint.
- Scripts de desarrollo `dev_up.sh`, `dev_down.sh` y `health_check.sh`.

### Agregado

- Base de datos `pablito_test` creada automáticamente para `TEST_DATABASE_URL`.

### Corregido

- Ninguno.

---

## [09/08/2026] — Cierre de la fase documental

### Aprobado
- `00_VISION_PROYECTO.md` v1.0.0 — Visión y alcance del proyecto.
- `00.2_GLOSARIO.md` v1.0.0 — Lenguaje común del negocio.
- `00.3_NOMENCLATURA.md` v1.0.0 — Convenciones de nombres.
- `01_ANALISIS_NEGOCIO.md` v1.0.0 — Reglas de negocio y flujos.
- `02_ARQUITECTURA.md` v1.0.0 — Arquitectura del sistema (Architecture Freeze).
- `02.1_DECISIONES_ARQUITECTONICAS.md` v1.0.0 — Decisiones arquitectónicas razonadas.
- `03_SEGURIDAD.md` v1.0.0 — Controles de seguridad.
- `04_BASE_DATOS.md` v1.0.0 — Modelo de datos y migraciones.
- `05_API.md` v1.0.0 — Contratos de API.
- `05.1_API_DATABASE_CROSS_REVIEW.md` v1.0.0 — Revisión cruzada API/base de datos.
- `06_FRONTEND.md` v1.0.0 — Estructura del frontend público.
- `07_PANEL_ADMIN.md` v1.0.0 — Panel administrativo.
- `08_UI_SYSTEM.md` v1.0.0 — Sistema de diseño.
- `09_COMPONENTES.md` v1.0.0 — Componentes reutilizables.
- `10_BACKEND.md` v1.0.0 — Estructura y convenciones del backend.
- `11_TESTING.md` v1.0.0 — Estrategia de testing.
- `12_DEPLOY.md` v1.0.0 — Guía de despliegue y operación.
- `99_AI_DEVELOPMENT_GUIDE.md` v1.0.0 — Manual de desarrollo con IA.
- `IMPLEMENTATION_ROADMAP.md` v1.0.0 — Hoja de ruta de implementación.

### Agregado
- `13_CHANGELOG.md` v1.0.0 — Este documento.

### Cambiado
- Ninguno en esta fase.

### Corregido
- Ninguno en esta fase.

### Implementado
- Ningún código en esta fase; el proyecto permanece en etapa de especificación aprobada.

---

## [09/08/2026] — Proyecto listo para iniciar implementación

### Aprobado
- Fase documental completada.
- Architecture Freeze vigente.
- `IMPLEMENTATION_ROADMAP.md` aprobado como plan de ejecución.

### Agregado
- Entregables verificables por fase definidos en `IMPLEMENTATION_ROADMAP.md`.
- Reglas de gobernanza para agentes de IA en `99_AI_DEVELOPMENT_GUIDE.md`.

### Implementado
- Pendiente. La siguiente entrada de este changelog registrará el inicio de la Fase 0 — Preparación del repositorio.

---

# 5. Estado del proyecto

| Área | Estado |
|---|---|
| Negocio | ✅ Congelado |
| Arquitectura | ✅ Congelada |
| Diseño técnico | ✅ Aprobado |
| Seguridad | ✅ Aprobada |
| Backend | ✅ Aprobado |
| Testing | ✅ Aprobado |
| Despliegue | ✅ Aprobado |
| Guía de IA | ✅ Aprobada |
| Roadmap | ✅ Aprobado |
| Implementación | 🚧 Fase 4 completada |

---

# 6. Próximos hitos esperados

| Fase | Hitos |
|---|---|
| Fase 0 — Preparación del repositorio | Estructura de carpetas, Docker Compose, Alembic, CI, README. |
| Fase 1 — Fundación backend | API responde + health checks OK. |
| Fase 2 — Modelo de datos | Migraciones aplican y revierten correctamente. |
| Fase 3 — API pública | Catálogo navegable por API. |
| Fase 4 — Carrito y WhatsApp | Carrito revalida correctamente. |
| Fase 5 — Frontend público | Tienda usable en móvil y escritorio. |
| Fase 6 — Panel administrativo | CRUD completo de productos. |
| Fase 7 — Seguridad y endurecimiento | Controles de seguridad activos. |
| Fase 8 — Testing | Suite crítica en verde. |
| Fase 9 — Staging | Staging validado. |
| Fase 10 — Producción | Producción aceptada. |

---

# 7. Reglas para futuras entradas

1. **Una entrada por fase o release significativo.** No se registra cada commit individual.
2. **Toda entrada debe mencionar el documento o decisión afectada.**
3. **Los cambios a documentos aprobados requieren una nueva versión y aprobación.**
4. **Los cambios de código se registran bajo `Implementado`.**
5. **Las correcciones urgentes se registran bajo `Corregido` con referencia al bug.**
6. **No se borran entradas antiguas; se corrige en una entrada posterior si es necesario.**

---

# 8. Historial de cambios del changelog

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 09/08/2026 | ✅ APROBADO | Creación del changelog con registro del cierre de la fase documental y estado listo para iniciar implementación. |
