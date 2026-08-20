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
