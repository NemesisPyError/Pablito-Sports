# 05_API.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Contrato de la API |
| **Código** | 05 |
| **Versión** | 1.5.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 18/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ |
| **Documentos dependientes** | `06_FRONTEND.md`, `07_PANEL_ADMIN.md`, `11_TESTING.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Definir el **contrato de la API** de Pablito Sports: rutas, métodos, DTOs de entrada y salida, filtros, ordenamientos, paginación, códigos de error y trazabilidad con las decisiones y reglas aprobadas.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Endpoints, métodos y rutas | — |
| Esquemas de entrada y DTOs de salida | — |
| Filtros, ordenamiento, paginación y facetas | — |
| Códigos HTTP y formato de error | — |
| Autenticación y autorización del panel | `03_SEGURIDAD.md` |
| Modelo físico de datos | `04_BASE_DATOS.md` |
| Diseño de pantallas del panel | `07_PANEL_ADMIN.md` |
| Lógica de presentación del frontend | `06_FRONTEND.md` |

**Regla del Freeze:** ningún contrato puede contradecir una decisión `AD-xx` o una regla `RN-xx` aprobada. Si al redactar apareciera un vacío que requiera una decisión arquitectónica nueva, se registra como pendiente.

---

# 3. Alcance

## 3.1 Incluye

- API pública de catálogo, anónima y de solo lectura.
- Endpoint de revalidación del carrito (`AD-32`).
- API privada del panel administrativo.
- Endpoints HTML para rastreadores (`AD-09`), documentados fuera de la API JSON.
- DTOs de entrada y salida, con tipo y obligatoriedad de cada campo.
- Paginación, filtrado, ordenamiento y facetas.
- Cierre de `ADP-09` (versión de contenido del carrito en el contrato).

## 3.2 No incluye

- Lógica de negocio interna → servicios del backend, gobernados por `AD-03`.
- Detalles de seguridad → `03_SEGURIDAD.md`.
- Esquema físico de la base de datos → `04_BASE_DATOS.md`.
- Diseño visual del panel → `07_PANEL_ADMIN.md` y `08_UI_SYSTEM.md`.

## 3.3 Relación con el Architecture Freeze

`02_ARQUITECTURA.md` v0.9.1 está en estado **Architecture Freeze Candidate**. Este documento no altera ninguna decisión arquitectónica: solo las materializa en contratos. El pendiente que debe cerrarse aquí es:

| Pendiente | Cierre en este documento |
|---|---|
| `ADP-09` — Versión de contenido del carrito en el contrato | §7.12 y §11 |

---

# 4. Convenciones y formatos comunes

## 4.1 Idioma

- Las rutas, los nombres de campo y los códigos de error están en **inglés** (`GL-10`).
- Los datos de negocio (nombres de productos, categorías, etc.) se sirven tal cual fueron cargados.

## 4.2 Versionado en la ruta

Toda la API JSON vive bajo `/api/v1/` (`AD-17`). Los endpoints HTML para rastreadores usan un prefijo distinto (`/_seo/`) y no forman parte de la API JSON.

## 4.3 Envoltura uniforme de respuesta

Toda respuesta JSON usa la envoltura de `AD-16`:

```json
{
  "success": true,
  "data": {},
  "errors": [],
  "meta": {}
}
```

En caso de error:

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "business_rule_violation",
      "rule": "RN-68",
      "detail": "brand has associated products",
      "field": null
    }
  ],
  "meta": { "request_id": "a3f9c1e2" }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `success` | `boolean` | `true` en 2xx/3xx; `false` en 4xx/5xx. |
| `data` | `any` | Carga útil en caso de éxito; `null` en error. |
| `errors` | `array` | Lista vacía en éxito; lista de objetos en error. |
| `meta` | `object` | Siempre contiene `request_id`; en listados incluye paginación y facetas. |

## 4.4 Paginación

- Paginación por desplazamiento (`AD-31`).
- Parámetros: `page` (entero ≥ 1, default 1), `per_page` (entero, default 20, máximo 100).
- Un `per_page` mayor al máximo se acota en silencio.
- La paginación viaja en `meta`:

```json
{
  "page": 1,
  "per_page": 20,
  "total": 156,
  "total_pages": 8
}
```

## 4.5 Filtrado

- Los criterios distintos se combinan con **Y**.
- Los valores múltiples del mismo criterio se combinan con **O**, separados por comas.
- Los valores son **slugs** (`AD-23`).
- Los parámetros desconocidos se ignoran (`AD-26`).
- El orden canónico de emisión es: `brand → category → gender → sport → size → min_price → max_price → sort → page` (`AD-27`).
- Filtrar por categoría padre incluye a sus descendientes (`AD-29`).

## 4.6 Ordenamiento

- El parámetro `sort` acepta un conjunto cerrado de valores por recurso.
- Valores no reconocidos se ignoran; se aplica el orden por omisión.

## 4.7 Facetas

- En respuestas de catálogo, `meta.facets` indica qué opciones de filtro aún tienen resultados (`RN-47`).

## 4.8 Identificadores internos

- La API pública **no expone identificadores internos** (`AD-12`), salvo `variant_id`, que es la excepción justificada en `AD-15`.
- La API privada expone identificadores internos para permitir operaciones de escritura.

## 4.9 Imágenes

- Las rutas almacenadas (`file_path`) se transforman en URLs públicas completas en todos los DTOs.
- En listados se usa `thumbnail_url` (imagen principal optimizada).
- En el detalle de producto se devuelve la colección completa `images`.

---

# 5. Autenticación y autorización

## 5.1 Panel administrativo

- El panel usa **sesión de servidor** transportada en cookie `HttpOnly` y exclusiva de HTTPS (`AD-37`).
- La cookie se crea en `POST /api/v1/admin/auth/login` y se destruye en `POST /api/v1/admin/auth/logout`.
- Todas las rutas bajo `/api/v1/admin/*` requieren autenticación.
- `POST /api/v1/admin/users` y `DELETE /api/v1/admin/users/{id}` requieren rol `super_administrator` (`RN-67`).

## 5.2 API pública

- Anónima y de solo lectura, salvo `POST /api/v1/cart/revalidate` (`AD-32`).

---

# 6. Endpoints HTML para rastreadores

## 6.1 Alcance

Estos endpoints **no son parte de la API JSON**. Devuelven documentos HTML mínimos exclusivamente para rastreadores (`AD-09`), mientras que las personas reciben la aplicación React. Nginx las deriva según el agente de usuario.

No usan la envoltura `success/data/errors/meta` ni autenticación.

## 6.2 Rutas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/_seo/products/{slug}` | Metadatos de ficha de producto. |
| `GET` | `/_seo/categories/{slug}` | Metadatos de categoría. |
| `GET` | `/_seo/catalog` | Metadatos del catálogo limpio (sin filtros). |

## 6.3 Contenido del HTML

Cada respuesta es un documento HTML mínimo con:

- `<title>` con nombre del recurso.
- Meta `description`.
- Meta Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
- URL canónica.
- Sin interfaz, sin estado de sesión, sin JavaScript.

## 6.4 Comportamiento

- `200` si el recurso existe y es visible.
- `404` si no existe o no es visible (producto oculto/eliminado).
- No se aplica límite de tasa (`AD-09`).

## 6.5 Documentos de rastreo en la raíz

Los buscadores esperan estos dos en la raíz del sitio, no bajo `/_seo/`. Los sirve el mismo backend, por la misma razón que §6.1: sólo él conoce qué productos, categorías, marcas y deportes están activos.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/robots.txt` | Reglas de rastreo y declaración del sitemap. `text/plain`. |
| `GET` | `/sitemap.xml` | URLs indexables del sitio. `application/xml`. |

No usan la envoltura `success/data/errors/meta` ni autenticación, y tampoco llevan límite de tasa (`AD-09`).

El sitemap enumera únicamente lo que `06_FRONTEND.md` §17.3 declara indexable, con localizaciones **absolutas**, y excluye los productos no visibles. `robots.txt` declara el sitemap en absoluto y bloquea `/carrito`, `/admin` y `/_seo/`.

**Códigos:** `200`

---

## 6.6 Trazabilidad

| Decisión / Regla | Aplicación |
|---|---|
| `AD-09` | Existencia y propósito de los endpoints. |
| `AD-01` (supersesión parcial) | Única excepción al renderizado del lado del cliente. |
| `RN-20` | Imagen principal como `og:image`. |

---

# 7. API pública

## 7.1 Configuración pública de la tienda

### `GET /api/v1/store/settings`

Devuelve la configuración pública de la tienda.

**Respuesta:** `StoreSettingsPublicDTO`

| DTO | Origen |
|---|---|
| `StoreSettingsPublicDTO` | `PA-10`, `RN-58` a `RN-61` |

**Códigos:** `200`, `404` si aún no se inicializó la configuración.

### `GET /api/v1/store/whatsapp-template`

Devuelve la plantilla vigente del mensaje de WhatsApp.

`RN-59` exige que el mensaje del cliente se componga con la plantilla que el administrador edita. Se expone como **recurso propio** y no como campos de `StoreSettingsPublicDTO`: §10.2 fija ese DTO con cinco campos exactos y `AD-12` gobierna qué sale al contrato público. Es el mismo `WhatsAppTemplateDTO` que §9.13 sirve al panel, de modo que cliente y administrador no pueden ver plantillas distintas.

El resto de la configuración de panel —contador de destacados incluido— no entra aquí.

**Respuesta:** `WhatsAppTemplateDTO`

**Códigos:** `200`, `404` si aún no se inicializó la configuración.

---

## 7.2 Banners

### `GET /api/v1/banners`

Devuelve los banners activos y vigentes, ordenados por `position` ascendente.

**Parámetros de consulta (v1.1.0)**

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `placement` | `string` | No | Filtra por zona de la portada: `hero`, `news` o `promo`. Un valor no reconocido se ignora y se devuelven todos, conforme a `AD-26` y §4.6. |

Sin `placement` el endpoint devuelve **todos** los banners vigentes, exactamente como antes de la v1.1.0: el parámetro es aditivo y ningún cliente existente cambia de comportamiento.

**Respuesta:** array de `BannerDTO`

| DTO | Origen |
|---|---|
| `BannerDTO` | `RN-73`, `RN-74` |

**Códigos:** `200`

---

## 7.2b Contenido institucional (v1.1.0)

### `GET /api/v1/store/about`

Historia de la tienda y correo de contacto.

Se expone como **recurso propio y no dentro de `StoreSettingsPublicDTO`** por la misma razón que la plantilla de WhatsApp (§7.1, §10.2): `AD-12` congela ese DTO en cinco campos exactos, y ampliarlo cambiaría un contrato ya publicado. Un recurso aparte lo deja intacto.

**Respuesta:** `StoreAboutDTO`

**Códigos:** `200` · `404` mientras la configuración no esté inicializada, igual que §7.1.

> Los cuatro campos son opcionales. Un `200` con todos los campos en `null` es una respuesta válida y significa que el administrador todavía no cargó la sección; el catálogo simplemente no la muestra.

---

## 7.2c Marcas destacadas de la portada (v1.1.0)

### `GET /api/v1/store/brand-showcases`

Marcas con bloque propio en la portada: las que tienen `home_position` no nulo, ordenadas por ese valor ascendente.

**Respuesta:** array de `BrandShowcaseDTO`

**Códigos:** `200`

> No se paginan: es un conjunto curado por el administrador, no un listado del catálogo. Una marca sin `home_position` no aparece acá aunque tenga logotipo, y el listado general de marcas (§7.6) sigue devolviéndolas todas.

---

## 7.3 Productos

### `GET /api/v1/products`

Lista paginada de productos activos y no eliminados.

**Parámetros de consulta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `q` | `string` | Búsqueda de texto sobre nombre, marca, categoría y deporte (`RN-48`, `AD-21`). |
| `brand` | `slug` o lista | Filtra por slug de marca. |
| `category` | `slug` o lista | Filtra por slug de categoría; incluye descendientes (`AD-29`). |
| `gender` | `slug` o lista | Filtra por slug de sexo. |
| `sport` | `slug` o lista | Filtra por slug de deporte. |
| `size` | `slug` o lista | Filtra por slug de talle. |
| `min_price` | `integer` | Precio mínimo en guaraníes. |
| `max_price` | `integer` | Precio máximo en guaraníes. |
| `on_sale` | `boolean` | `true` solo productos con precio efectivo menor al de lista (oferta del producto o promoción vigente). |
| `is_new` | `boolean` | `true` solo productos marcados como nuevos. |
| `is_featured` | `boolean` | `true` solo productos destacados. |
| `sort` | `string` | Ver valores permitidos. |
| `page` | `integer` | Página solicitada. |
| `per_page` | `integer` | Tamaño de página. |

**Valores permitidos para `sort`:**

| Valor | Significado |
|---|---|
| `name_asc` | Nombre ascendente (default). |
| `name_desc` | Nombre descendente. |
| `price_asc` | Precio efectivo ascendente. |
| `price_desc` | Precio efectivo descendente. |
| `newest` | Más recientes primero (`created_at` descendente). |
| `featured` | Destacados primero, luego nombre ascendente. |

**Respuesta:** array de `ProductListItemDTO` + meta con paginación y facetas.

| DTO | Origen |
|---|---|
| `ProductListItemDTO` | `RF-01` a `RF-15`, `RN-20` |

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "slug": "botin-nike-mercurial",
      "name": "Botín Nike Mercurial",
      "brand": { "slug": "nike", "name": "Nike" },
      "primary_category": { "slug": "botines", "name": "Botines" },
      "list_price": 650000,
      "sale_price": 585000,
      "discount_percentage": 10,
      "availability": "available",
      "is_new": false,
      "is_featured": true,
      "thumbnail_url": "https://.../thumb.jpg"
    }
  ],
  "errors": [],
  "meta": {
    "request_id": "a3f9c1e2",
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8,
    "facets": {
      "brand": [
        { "slug": "nike", "name": "Nike", "count": 42 },
        { "slug": "adidas", "name": "Adidas", "count": 31 }
      ],
      "size": [
        { "slug": "42", "name": "42", "count": 18 }
      ]
    }
  }
}
```

**Rendimiento:** la respuesta debe resolverse en < 300 ms (p95) conforme a `RNF-02`, incluyendo el cálculo de facetas.

**Códigos:** `200`

---

## 7.4 Detalle de producto

### `GET /api/v1/products/{slug}`

Devuelve la ficha completa de un producto activo.

**Respuesta:** `ProductDetailDTO`

| DTO | Origen |
|---|---|
| `ProductDetailDTO` | `RF-08` a `RF-12`, `RN-13` a `RN-22` |

**Códigos:** `200`, `404` si no existe o no es visible.

---

## 7.5 Categorías

### `GET /api/v1/categories`

Devuelve el árbol de categorías activas de hasta dos niveles (`AD-24`).

**Respuesta:** array de `CategoryTreeDTO`

| DTO | Origen |
|---|---|
| `CategoryTreeDTO` | `RN-03`, `RN-04`, `AD-24` |

**Códigos:** `200`

---

## 7.6 Marcas

### `GET /api/v1/brands`

Devuelve marcas activas ordenadas alfabéticamente.

**Parámetros:** `page`, `per_page`.

**Respuesta:** array de `BrandDTO`

| DTO | Origen |
|---|---|
| `BrandDTO` | `RN-05`, `RN-06` |

**Códigos:** `200`

---

## 7.7 Deportes

### `GET /api/v1/sports`

Devuelve deportes activos ordenados alfabéticamente.

**Parámetros:** `page`, `per_page`.

**Respuesta:** array de `SportDTO`

| DTO | Origen |
|---|---|
| `SportDTO` | `RN-08` |

**Códigos:** `200`

---

## 7.8 Colores

*Sección retirada el 19/08/2026 (`01_ANALISIS_NEGOCIO.md` 2.7.0, pedido del administrador): ya no existe la clasificación "color", y con ella desaparece `GET /api/v1/colors`. El número de sección se conserva sin contenido para no correr la numeración de §7.9 en adelante, citada desde otros documentos.*

---

## 7.9 Talles

### `GET /api/v1/sizes`

Devuelve talles activos ordenados por tipo de talle y nombre.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `size_type` | `slug` | Filtra por tipo de talle. |
| `page` | `integer` | Paginación. |
| `per_page` | `integer` | Paginación. |

**Respuesta:** array de `SizeDTO`

| DTO | Origen |
|---|---|
| `SizeDTO` | `RN-14`, `RN-15`, `RN-16` |

**Códigos:** `200`

---

## 7.10 Sexos

### `GET /api/v1/genders`

Devuelve los sexos del catálogo. Son **datos semilla no administrables**: solo lectura (`S-06`, v2.5.0 de `01_ANALISIS_NEGOCIO.md`).

**Parámetros:** `page`, `per_page`.

**Respuesta:** array de `GenderDTO`

| DTO | Origen |
|---|---|
| `GenderDTO` | `RN-09`, `S-06` |

**Códigos:** `200`

---

## 7.11 Tipos de talle

### `GET /api/v1/size-types`

Devuelve los tipos de talle. Son **datos semilla no administrables**: solo lectura (`S-07`, v2.5.0 de `01_ANALISIS_NEGOCIO.md`).

**Parámetros:** `page`, `per_page`.

**Respuesta:** array de `SizeTypeDTO`

| DTO | Origen |
|---|---|
| `SizeTypeDTO` | `RN-15`, `S-07` |

**Códigos:** `200`

---

# 8. Revalidación del carrito

## 8.1 Endpoint

### `POST /api/v1/cart/revalidate`

Es el único endpoint público que acepta `POST` sin crear un recurso (`AD-32`). Recibe una lista de variantes y devuelve el estado autoritativo actual de cada una.

## 8.2 Esquema de entrada

```json
{
  "cart_content_version": 12,
  "items": [
    { "variant_id": 842, "quantity": 2 },
    { "variant_id": 1203, "quantity": 1 }
  ]
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `cart_content_version` | `integer` | Sí | Versión de contenido del carrito (`AD-22`, cierre de `ADP-09`). |
| `items` | `array` | Sí | Lista de ítems a revalidar. Máximo 26 elementos (`RN-75`). |
| `items[].variant_id` | `integer` | Sí | Identificador estable de la variante (`AD-15`). |
| `items[].quantity` | `integer` | Sí | Cantidad solicitada (≥ 1). |

## 8.3 Esquema de salida

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "variant_id": 842,
        "status": "ok",
        "product": { "slug": "botin-nike-mercurial", "name": "Botín Nike Mercurial", "thumbnail_url": "https://.../thumb.jpg" },
        "list_price": 650000,
        "sale_price": 585000,
        "discount_percentage": 10,
        "availability": "available",
        "quantity": 2
      },
      {
        "variant_id": 1203,
        "status": "price_changed",
        "product": { "slug": "short-adidas", "name": "Short Adidas", "thumbnail_url": "https://.../short-thumb.jpg" },
        "list_price": 180000,
        "sale_price": null,
        "discount_percentage": null,
        "availability": "available",
        "quantity": 1
      },
      {
        "variant_id": 415,
        "status": "availability_changed",
        "product": { "slug": "camiseta-selecta", "name": "Camiseta Selecta", "thumbnail_url": "https://.../selecta-thumb.jpg" },
        "list_price": 220000,
        "sale_price": null,
        "discount_percentage": null,
        "availability": "out_of_stock",
        "quantity": 1
      },
      {
        "variant_id": 9999,
        "status": "variant_removed",
        "product": null,
        "list_price": null,
        "sale_price": null,
        "discount_percentage": null,
        "availability": null,
        "quantity": null
      },
      {
        "variant_id": 77,
        "status": "product_hidden",
        "product": null,
        "list_price": null,
        "sale_price": null,
        "discount_percentage": null,
        "availability": null,
        "quantity": null
      }
    ]
  },
  "errors": [],
  "meta": {
    "request_id": "a3f9c1e2",
    "cart_content_version": 12
  }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `items` | `array` | Un elemento por `variant_id` enviado, en el mismo orden. |
| `items[].variant_id` | `integer` | Mismo identificador enviado. |
| `items[].status` | `string` | Estado tras la revalidación. Ver tabla. |
| `items[].product` | `object \| null` | `{ slug, name, thumbnail_url }` del producto; `null` si la variante no existe. |
| `items[].list_price` | `integer \| null` | Precio de lista vigente. |
| `items[].sale_price` | `integer \| null` | Precio de oferta vigente. |
| `items[].discount_percentage` | `integer \| null` | Porcentaje de descuento vigente. |
| `items[].availability` | `string \| null` | Estado de disponibilidad actual (`RN-38`). |
| `items[].quantity` | `integer \| null` | Cantidad conservada; `null` si el producto no es visible o la variante desapareció. |

## 8.4 Estados posibles

| Estado | Cuándo | Acción sugerida (frontend) |
|---|---|---|
| `ok` | La variante existe y el producto es visible. | Mantener en el carrito. |
| `product_hidden` | El producto fue desactivado (`is_active = false`). | Eliminar del carrito e informar. |
| `product_deleted` | El producto fue eliminado lógicamente. | Eliminar del carrito e informar. |
| `variant_removed` | La variante fue eliminada lógicamente. | Eliminar la variante y solicitar nueva selección. |
| `availability_changed` | La disponibilidad cambió. | Mostrar nuevo estado; permitir mantener (`RN-40`). |
| `price_changed` | El precio efectivo cambió. | Actualizar precio e informar. |
| `sale_ended` | La oferta venció. | Recalcular precio e informar. |

La matriz de resolución completa está en `AD-25`.

## 8.5 Comportamiento ante discrepancias

- El servidor nunca modifica el carrito del cliente; solo informa el estado autoritativo.
- El cliente compara el estado recibido con el local y aplica `AD-25` y `AD-28`.
- Si `cart_content_version` de la respuesta no coincide con la versión actual del carrito, el cliente descarta la respuesta y vuelve a solicitar (`AD-22`).

## 8.6 Límites y errores

- Lista mayor a 26 ítems → `422`.
- `variant_id` duplicado → `422`.
- Cuerpo JSON malformado → `400`.
- Límite de tasa estricto → `429` (`02_ARQUITECTURA.md` §11.10).

**Ejemplo de error 422 (lista excede el límite):**

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "validation_error",
      "rule": null,
      "detail": "items must contain at most 26 elements",
      "field": "items"
    }
  ],
  "meta": { "request_id": "b4d2e8f1" }
}
```

> **Nota sobre `409`:** este endpoint no devuelve `409` ante variantes eliminadas, productos ocultos o reglas de negocio. Esas condiciones son resultados esperados y se informan en `data.items[].status` (`AD-25`).

## 8.7 Trazabilidad

| Decisión / Regla | Aplicación |
|---|---|
| `AD-32` | Uso de `POST` para revalidación. |
| `AD-22` | Campo `cart_content_version`. |
| `AD-25` | Matriz de resolución. |
| `AD-28` | El servidor nunca modifica el carrito en silencio. |
| `AD-36` | El cliente envía identidades, no precios. |
| `RN-75` | Máximo de 26 ítems. |

---

# 9. API privada (panel administrativo)

Todas las rutas bajo `/api/v1/admin/*` requieren sesión de administrador.

## 9.1 Autenticación

### `POST /api/v1/admin/auth/login`

**Entrada:**

```json
{
  "username": "admin",
  "password": "..."
}
```

**Salida:** `AdministratorProfileDTO` (sin `password_hash`).

**Códigos:** `200`, `401` si las credenciales son inválidas, `422` si falta algún campo.

### `POST /api/v1/admin/auth/logout`

**Salida:** `204` sin cuerpo.

**Códigos:** `204`, `401` si no hay sesión.

### `GET /api/v1/admin/auth/me`

Devuelve el perfil del administrador autenticado.

**Salida:** `AdministratorProfileDTO`

**Códigos:** `200`, `401`.

---

## 9.2 Dashboard

### `GET /api/v1/admin/dashboard`

Devuelve un DTO agregado para el dashboard del panel. **No representa una entidad persistente**; se computa a partir de `products`, `price_history` y otras tablas.

**Salida:** `DashboardDTO`

| DTO | Origen |
|---|---|
| `DashboardDTO` | `RF-38`, `RF-39`, `CU-A-03` |

**Códigos:** `200`

---

## 9.3 Productos

### `GET /api/v1/admin/products`

Listado paginado de productos. Incluye activos, inactivos y eliminados lógicamente (distinguidos por campos de estado).

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `q` | `string` | Búsqueda por nombre, SKU, slug. |
| `brand` | `slug` o lista | Filtra por marca. |
| `category` | `slug` o lista | Filtra por categoría. |
| `availability` | `string` o lista | Filtra por estado de disponibilidad. |
| `is_active` | `boolean` | Filtra por activo/inactivo. |
| `deleted` | `boolean` | `true` solo eliminados; `false` solo no eliminados. |
| `sort` | `string` | `name_asc`, `name_desc`, `created_desc`, `updated_desc`, `price_asc`, `price_desc`. |
| `page`, `per_page` | `integer` | Paginación. |

**Salida:** array de `ProductAdminListItemDTO`

### `GET /api/v1/admin/products/{id}`

**Salida:** `ProductAdminDTO`

### `POST /api/v1/admin/products`

**Entrada:** `ProductCreateDTO`

**Salida:** `ProductAdminDTO` (201)

### `PUT /api/v1/admin/products/{id}`

**Entrada:** `ProductUpdateDTO`

**Salida:** `ProductAdminDTO`

### `DELETE /api/v1/admin/products/{id}`

Soft delete (`AD-18`).

**Códigos:** `204`

### `POST /api/v1/admin/products/{id}/restore`

Restaura un producto eliminado lógicamente.

**Salida:** `ProductAdminDTO`

**Códigos:** `200`

### `POST /api/v1/admin/products/{id}/set-active`

Activa o desactiva un producto.

**Entrada:** `{ "is_active": true }`

**Salida:** `ProductAdminDTO`

### Imágenes del producto

Las imágenes se gestionan como sub-recurso de producto (`CU-A-13`, `CU-A-14`).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/products/{id}/images` | Listar imágenes del producto. |
| `POST` | `/api/v1/admin/products/{id}/images` | Subir nueva imagen (`multipart/form-data`; campo `file`, opcional `alt_text`). |
| `PUT` | `/api/v1/admin/products/{id}/images/{image_id}` | Actualizar `alt_text` o metadatos. |
| `DELETE` | `/api/v1/admin/products/{id}/images/{image_id}` | Soft delete de la fila (`AD-18`); el archivo físico se mantiene hasta una limpieza posterior (`AD-39`). |
| `POST` | `/api/v1/admin/products/{id}/images/reorder` | Reordenar galería. Entrada: `{ "image_ids": [1, 2, 3] }`. |
| `POST` | `/api/v1/admin/products/{id}/images/{image_id}/set-primary` | Define la imagen principal (`RN-20`). |

---

## 9.4 Variantes

Las variantes se generan y reconcilian automáticamente al modificar los talles de un producto. El panel puede consultarlas para diagnóstico, cargar la cantidad real de stock y eliminar variantes específicas si el negocio lo requiere.

### `GET /api/v1/admin/products/{id}/variants`

**Salida:** array de `VariantAdminDTO` — igual que `VariantDTO` (§10.5) más
`quantity` (`integer`, la cantidad real cargada). `quantity` es un dato
administrativo: no se expone en `VariantDTO` público, que solo entrega el
estado derivado (`availability`).

### `PUT /api/v1/admin/products/{id}/variants/{variant_id}` (v1.4.0)

Actualiza la cantidad de una variante. Recalcula `products.availability`
como la suma de `quantity` de todas las variantes vivas del producto
(`RN-38b`, `04_BASE_DATOS.md` §9.2.2).

**Entrada:**

```json
{ "quantity": 8 }
```

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `quantity` | `integer` | Sí | `>= 0` |

**Salida:** `VariantAdminDTO`

**Errores:** `422` si `quantity` falta, no es entero o es negativo.

### `DELETE /api/v1/admin/products/{id}/variants/{variant_id}`

Soft delete de una variante específica.

**Códigos:** `204`

### `POST /api/v1/admin/products/{id}/variants/{variant_id}/sales` (v1.5.0)

Registra una venta y descuenta `quantity` de la variante en la misma
transacción (`RN-82`, `04_BASE_DATOS.md` §9.2.18). A diferencia del `PUT`
de arriba —que reemplaza el número a mano y acepta cualquier valor
`>= 0`— esta operación es de dominio: no se puede vender más de lo que
hay cargado. Recalcula `products.availability` igual que el `PUT`
(`RN-39`). El registro queda en `sales`, un ledger inmutable igual que
`price_history` (`RN-70`): no se edita ni se borra.

**Entrada:**

```json
{ "quantity": 2 }
```

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `quantity` | `integer` | Sí | `> 0` |

**Salida:** `VariantAdminDTO`

**Errores:**

- `422` si `quantity` falta, no es entero o no es positivo.
- `404` si la variante no existe.
- `409` (`RN-82`) si `quantity` supera la cantidad actualmente cargada en la variante.

---

## 9.5 Categorías

### `GET /api/v1/admin/categories`

**Salida:** array de `CategoryAdminDTO` (plano, con `parent_id`)

### `GET /api/v1/admin/categories/{id}`

**Salida:** `CategoryAdminDTO`

### `POST /api/v1/admin/categories`

**Entrada:** `CategoryCreateDTO`

**Salida:** `CategoryAdminDTO` (201)

### `PUT /api/v1/admin/categories/{id}`

**Entrada:** `CategoryUpdateDTO`

**Salida:** `CategoryAdminDTO`

### `DELETE /api/v1/admin/categories/{id}`

Soft delete. No se permite si tiene productos asignados o subcategorías activas (`RN-04`, `AD-24`).

**Códigos:** `204`, `409` con `RN-68` o regla equivalente.

### `POST /api/v1/admin/categories/{id}/restore`

Revierte el borrado lógico de una categoría (`AD-18`).

**Salida:** `CategoryAdminDTO`

**Códigos:** `200`, `404`

---

## 9.6 Marcas

CRUD completo bajo `/api/v1/admin/brands`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/brands` | Listado paginado; admite `page`, `per_page`. |
| `GET` | `/api/v1/admin/brands/{id}` | Detalle. |
| `POST` | `/api/v1/admin/brands` | Crear. |
| `PUT` | `/api/v1/admin/brands/{id}` | Editar. |
| `DELETE` | `/api/v1/admin/brands/{id}` | Soft delete; `409` si tiene productos asociados. |
| `POST` | `/api/v1/admin/brands/{id}/restore` | Revierte el borrado lógico de un marca (`AD-18`). |

### Presencia en portada (v1.1.0)

`POST` y `PUT` **siguen siendo JSON** y suman dos campos:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tagline` | texto | No | Frase del bloque de portada. Máximo 255. |
| `home_position` | entero | No | Orden en la portada. Vacío o nulo = la marca no tiene bloque propio, que **no** es lo mismo que la posición `0`. |

`BrandAdminDTO` suma en consecuencia `image_url`, `tagline` y `home_position`. Ninguna otra clasificación los lleva: son etiquetas del catálogo, no piezas de la portada.

### Logotipo (v1.1.0)

El logotipo es un **recurso propio en `multipart/form-data`**, no un campo del `PUT` de la marca.

| Método | Ruta | Descripción | Entrada |
|---|---|---|---|
| `PUT` | `/api/v1/admin/brands/{id}/image` | Reemplaza el logotipo. | `multipart/form-data` con `image` |
| `DELETE` | `/api/v1/admin/brands/{id}/image` | Quita el logotipo sin borrar la marca. | — |

> **Por qué no es un campo del `PUT`.** Las marcas comparten el CRUD genérico de §9.5 a §9.9 con categorías, deportes y talles (§9.8, "Colores", retirada el 19/08/2026), que es JSON. Volverlo `multipart` para una sola de ellas rompería el patrón común y obligaría a **reenviar el archivo cada vez que se corrige el nombre**. Es el mismo criterio con el que §9.12 resuelve la foto de «Nuestra historia».

### Collage de marca (v1.1.0)

Sub-recurso bajo la marca, con la misma forma que las imágenes de producto (§9.3), porque el problema es el mismo: varias imágenes ordenadas que se suben, reordenan y borran de a una.

| Método | Ruta | Descripción | Entrada | Salida |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/brands/{id}/images` | Listado ordenado. | — | array de `BrandImageAdminDTO` |
| `POST` | `/api/v1/admin/brands/{id}/images` | Agrega una imagen. | `multipart/form-data` | `BrandImageAdminDTO` (201) |
| `PUT` | `/api/v1/admin/brands/{id}/images/order` | Reordena el collage. | array de identificadores | array de `BrandImageAdminDTO` |
| `DELETE` | `/api/v1/admin/brands/{id}/images/{image_id}` | Soft delete de una pieza. | — | `204` |

**Validación de negocio:** el servicio rechaza con `422` la carga que dejaría más de **4** imágenes activas en una marca. El mínimo de 2 **no se exige**: una marca a medio cargar es un estado de trabajo legítimo del administrador, y el catálogo simplemente no publica el bloque hasta que tenga piezas suficientes.

---

## 9.7 Deportes

CRUD completo bajo `/api/v1/admin/sports`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/sports` | Listado paginado; admite `page`, `per_page`. |
| `GET` | `/api/v1/admin/sports/{id}` | Detalle. |
| `POST` | `/api/v1/admin/sports` | Crear. |
| `PUT` | `/api/v1/admin/sports/{id}` | Editar. |
| `DELETE` | `/api/v1/admin/sports/{id}` | Soft delete; `409` si tiene productos asociados. |
| `POST` | `/api/v1/admin/sports/{id}/restore` | Revierte el borrado lógico de un deporte (`AD-18`). |

---

## 9.8 Colores

*Sección retirada el 19/08/2026 (`01_ANALISIS_NEGOCIO.md` 2.7.0, pedido del administrador): ya no existe la clasificación "color", y con ella desaparece el CRUD bajo `/api/v1/admin/colors`. El número de sección se conserva sin contenido para no correr la numeración de §9.9 en adelante, citada desde otros documentos.*

---

## 9.9 Talles

CRUD completo bajo `/api/v1/admin/sizes`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/sizes` | Listado paginado; admite `page`, `per_page` y filtro `size_type`. |
| `GET` | `/api/v1/admin/sizes/{id}` | Detalle. |
| `POST` | `/api/v1/admin/sizes` | Crear. |
| `PUT` | `/api/v1/admin/sizes/{id}` | Editar. |
| `DELETE` | `/api/v1/admin/sizes/{id}` | Soft delete; `409` si tiene productos o variantes asociados. |
| `POST` | `/api/v1/admin/sizes/{id}/restore` | Revierte el borrado lógico de un talle (`AD-18`). |

---

## 9.10 Promociones

CRUD completo bajo `/api/v1/admin/promotions`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/promotions` | Listado paginado. |
| `GET` | `/api/v1/admin/promotions/{id}` | Detalle. |
| `POST` | `/api/v1/admin/promotions` | Crear. |
| `PUT` | `/api/v1/admin/promotions/{id}` | Editar. |
| `DELETE` | `/api/v1/admin/promotions/{id}` | Soft delete. |

La promoción aplica a exactamente uno de `product`, `category` o `brand` (`RN-36`).

---

## 9.11 Banners

CRUD completo bajo `/api/v1/admin/banners`.

| Método | Ruta | Descripción | Entrada | Salida |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/banners` | Listado paginado. | — | array de `BannerAdminDTO` |
| `GET` | `/api/v1/admin/banners/{id}` | Detalle. | — | `BannerAdminDTO` |
| `POST` | `/api/v1/admin/banners` | Crear. | `BannerCreateDTO` (`multipart/form-data`) | `BannerAdminDTO` (201) |
| `PUT` | `/api/v1/admin/banners/{id}` | Editar. | `BannerUpdateDTO` (`multipart/form-data`) | `BannerAdminDTO` |
| `DELETE` | `/api/v1/admin/banners/{id}` | Soft delete. | — | `BannerAdminDTO` |

La entrada viaja como `multipart/form-data` porque `image` es un archivo
(§10.13). El almacenamiento de esa imagen sigue la convención de
`99_AI_DEVELOPMENT_GUIDE.md` §17.1, espacio de nombres `banners`.

`BannerDTO` (§10.3) suma `button_label` y `placement` en la v1.1.0, pero sigue
sin `id`, sin fechas y sin estado, conforme a `AD-12`.

### Zona y botón (v1.1.0)

`BannerCreateDTO` y `BannerUpdateDTO` (§10.13) suman dos campos de formulario:

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `placement` | texto | No | Uno de `hero`, `news`, `promo`. Ausente o vacío = `hero`. Un valor fuera del conjunto es `422`, **no** se ignora: acá el dato se guarda, y guardar en una zona equivocada es peor que rechazar. |
| `button_label` | texto | No | Máximo 50 caracteres. |

> El contraste con §4.6 es deliberado. En un filtro de lectura un valor desconocido se ignora y se aplica el defecto, porque el peor caso es un listado más amplio. En una escritura, aceptar un valor inválido dejaría la pieza publicada donde el administrador no quiso.

**El listado del panel admite `?placement=` para filtrar**, de modo que las tres zonas se pueden administrar por separado sin crear tres pantallas distintas.

---

## 9.12 Configuración de la tienda (admin)

### `GET /api/v1/admin/store/settings`

**Salida:** `StoreSettingsAdminDTO`

### `PUT /api/v1/admin/store/settings`

**Entrada:** `StoreSettingsAdminUpdateDTO`

**Salida:** `StoreSettingsAdminDTO`

### Contenido institucional (v1.1.0)

`StoreSettingsAdminDTO` y `StoreSettingsAdminUpdateDTO` suman `email`, `about_title` y `about_text`. Los tres son opcionales y siguen la semántica de `PUT` ya establecida en §10.13: **el `PUT` reemplaza el recurso completo**, así que un campo ausente se guarda como `NULL`, no conserva el valor anterior.

La imagen viaja aparte, porque el resto de la configuración es JSON y no conviene volverlo `multipart` entero:

| Método | Ruta | Descripción | Entrada |
|---|---|---|---|
| `PUT` | `/api/v1/admin/store/about-image` | Reemplaza la foto de «Nuestra historia». | `multipart/form-data` con `image` |
| `DELETE` | `/api/v1/admin/store/about-image` | Quita la foto sin borrar el texto. | — |

---

## 9.13 Plantilla de WhatsApp

La plantilla se almacena en `store_settings.message_template` e `item_template`. Se expone como recurso separado por claridad del contrato.

### `GET /api/v1/admin/store/whatsapp-template`

**Salida:** `WhatsAppTemplateDTO`

### `PUT /api/v1/admin/store/whatsapp-template`

**Entrada:** `WhatsAppTemplateDTO`

**Salida:** `WhatsAppTemplateDTO`

**Validación:** variables requeridas (`RF-41`).

### `POST /api/v1/admin/store/whatsapp-template/reset`

Restaura la plantilla por defecto.

**Salida:** `WhatsAppTemplateDTO`

---

## 9.14 Administradores

### `GET /api/v1/admin/users`

Requiere `super_administrator`.

**Salida:** array de `AdministratorDTO`

### `GET /api/v1/admin/users/{id}`

Requiere `super_administrator`.

**Salida:** `AdministratorDTO`

### `POST /api/v1/admin/users`

Requiere `super_administrator`.

**Entrada:** `AdministratorCreateDTO`

**Salida:** `AdministratorDTO` (201)

### `PUT /api/v1/admin/users/{id}`

Requiere `super_administrator`.

**Entrada:** `AdministratorUpdateDTO`

**Salida:** `AdministratorDTO`

### `DELETE /api/v1/admin/users/{id}`

Requiere `super_administrator`. No se permite eliminar al último superadministrador.

**Códigos:** `204`, `409`.

### `POST /api/v1/admin/users/{id}/change-password`

Cambio de contraseña propia o, para superadministrador, de otro usuario.

**Entrada:**

```json
{
  "current_password": "...",
  "new_password": "..."
}
```

- `current_password` es obligatorio cuando el administrador autenticado cambia su propia contraseña.
- `current_password` se ignora cuando un `super_administrator` cambia la contraseña de otro usuario.

**Códigos:** `204`, `401`, `403`, `422`.

---

## 9.15 Registros de auditoría

### `GET /api/v1/admin/audit-logs`

Listado inmutable de auditoría (`AD-20`).

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `entity_type` | `string` | Ej: `product`, `category`. |
| `entity_id` | `integer` | Identificador de la entidad. |
| `administrator_id` | `integer` | Autor de la acción. |
| `action` | `string` o lista | `create`, `update`, `delete`, `activate`, `deactivate`. |
| `from`, `to` | `ISO 8601` | Rango de fechas. |
| `page`, `per_page` | `integer` | Paginación. |

**Salida:** array de `AuditLogDTO`

**Códigos:** `200`

---

## 9.16 Historial de precios

### `GET /api/v1/admin/price-history`

Listado inmutable de cambios de precio.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `product_id` | `integer` | Filtra por producto. |
| `administrator_id` | `integer` | Filtra por autor. |
| `from`, `to` | `ISO 8601` | Rango de fechas. |
| `page`, `per_page` | `integer` | Paginación. |

**Salida:** array de `PriceHistoryDTO`

**Códigos:** `200`

---

## 9.17 Sexos (admin)

**Solo lectura.** `S-06` los declara datos semilla **no administrables**: no existe alta, edición ni baja, ni la habrá.

Existe como recurso administrativo por una razón concreta: `ProductCreateDTO` exige `gender_id`, y §7.10 publica los sexos sin identificador porque `AD-12` prohíbe exponer identificadores internos en la API pública. Sin este endpoint el panel no tiene forma de construir el payload de alta de producto. §4.8 admite identificadores en la API privada, que es donde vive este recurso.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/genders` | Listado paginado; admite `page`, `per_page`. |

**Salida:** array de `GenderAdminDTO`

**Códigos:** `200`, `401`

---

## 9.18 Tipos de talle (admin)

**Solo lectura**, por el mismo motivo: `S-07` los declara datos semilla no administrables.

Lo necesitan dos altas: `ProductCreateDTO` exige `size_type_id`, y §9.9 exige `size_type_id` para crear un talle. §7.11 los publica sin identificador (`AD-12`).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/admin/size-types` | Listado paginado; admite `page`, `per_page`. |

**Salida:** array de `SizeTypeAdminDTO`

**Códigos:** `200`, `401`

---

# 10. DTOs

## 10.1 Tipos base

### `ResponseWrapper<T>`

```json
{
  "success": "boolean",
  "data": "T",
  "errors": ["ErrorItem"],
  "meta": "object"
}
```

### `ErrorItem`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `code` | `string` | Sí | Código de error interno. |
| `rule` | `string \| null` | Sí | `RN-xx` violado, si aplica. |
| `detail` | `string` | Sí | Descripción técnica breve en inglés. |
| `field` | `string \| null` | Sí | Campo relacionado, si aplica. |

### `PaginationMeta`

| Campo | Tipo | Descripción |
|---|---|---|
| `request_id` | `string` | Identificador de correlación (`OA-09`). |
| `page` | `integer` | Página actual. |
| `per_page` | `integer` | Tamaño de página. |
| `total` | `integer` | Total de elementos. |
| `total_pages` | `integer` | Total de páginas. |

### `FacetMeta`

| Campo | Tipo | Descripción |
|---|---|---|
| `facets` | `object` | Mapa de criterio a lista de `{ slug, name, count }`. |

## 10.2 Configuración de la tienda

### `StoreSettingsPublicDTO`

Configuración visible para cualquier visitante.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `store_name` | `string` | Sí | `store_settings.store_name` |
| `whatsapp_number` | `string` | Sí | `store_settings.whatsapp_number` |
| `address` | `string \| null` | No | `store_settings.address` |
| `business_hours` | `string \| null` | No | `store_settings.business_hours` |
| `social_links` | `object \| null` | No | `store_settings.social_links` |

### `StoreSettingsAdminDTO`

Configuración completa visible solo en el panel.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `store_name` | `string` | Sí | `store_settings.store_name` |
| `whatsapp_number` | `string` | Sí | `store_settings.whatsapp_number` |
| `address` | `string \| null` | No | `store_settings.address` |
| `business_hours` | `string \| null` | No | `store_settings.business_hours` |
| `social_links` | `object \| null` | No | `store_settings.social_links` |
| `message_template` | `string` | Sí | `store_settings.message_template` |
| `item_template` | `string` | Sí | `store_settings.item_template` |
| `featured_products_count` | `integer` | Sí | `store_settings.featured_products_count` |

## 10.3 Banners

### `BannerDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `title` | `string` | Sí | `banners.title` |
| `subtitle` | `string \| null` | No | `banners.subtitle` |
| `image_url` | `string \| null` | No | URL pública de `banners.image_path` |
| `link_url` | `string \| null` | No | `banners.link_url` |
| `button_label` | `string \| null` | No | `banners.button_label` (v1.1.0) |
| `placement` | `string` | Sí | `banners.placement` (v1.1.0) |
| `position` | `integer` | Sí | `banners.position` |

> **Nota:** no expone `id` en la API pública, conforme a `AD-12`. El frontend puede usar `position` como clave estable dentro del listado de banners activos. Desde la v1.1.0 la clave estable es el par `placement` + `position`, porque `position` se numera por zona.

### `BannerAdminDTO`

DTO **exclusivo del panel administrativo**. `AD-12` prohíbe exponer
identificadores internos en la API **pública**; §4.8 los admite en la privada,
que los necesita para direccionar las operaciones de escritura de §9.11.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `banners.id` |
| `title` | `string` | Sí | `banners.title` |
| `subtitle` | `string \| null` | No | `banners.subtitle` |
| `image_url` | `string \| null` | No | URL pública de `banners.image_path` |
| `link_url` | `string \| null` | No | `banners.link_url` |
| `button_label` | `string \| null` | No | `banners.button_label` (v1.1.0) |
| `placement` | `string` | Sí | `banners.placement` (v1.1.0) |
| `position` | `integer` | Sí | `banners.position` |
| `starts_at` | `string \| null` | No | `banners.starts_at` |
| `ends_at` | `string \| null` | No | `banners.ends_at` |
| `is_active` | `boolean` | Sí | `banners.is_active` |

> **Nota:** no expone `created_at`, `updated_at` ni `deleted_at`, en línea con
> `PromotionDTO` (§10.9) y `AdministratorProfileDTO` (§10.10). El panel opera
> sobre el estado del recurso, no sobre su historia. `CategoryAdminDTO` sí los
> lleva, pero es la excepción, no el patrón.

## 10.4 Productos

### `ProductListItemDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `products.slug` |
| `name` | `string` | Sí | `products.name` |
| `brand` | `NamedEntityDTO` | Sí | `brands` |
| `primary_category` | `NamedEntityDTO` | Sí | `categories` |
| `list_price` | `integer` | Sí | `products.list_price` |
| `sale_price` | `integer \| null` | No | Precio efectivo si hay oferta vigente |
| `discount_percentage` | `integer \| null` | No | `promotions.discount_percentage` o cálculo |
| `availability` | `string` | Sí | `products.availability` |
| `is_new` | `boolean` | Sí | `products.is_new` |
| `is_featured` | `boolean` | Sí | `products.is_featured` |
| `thumbnail_url` | `string \| null` | No | Imagen principal del producto |

### `ProductDetailDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `products.slug` |
| `name` | `string` | Sí | `products.name` |
| `description` | `string \| null` | No | `products.description` |
| `brand` | `NamedEntityDTO` | Sí | `brands` |
| `primary_category` | `NamedEntityDTO` | Sí | `categories` |
| `categories` | `NamedEntityDTO[]` | Sí | `product_categories` |
| `sports` | `NamedEntityDTO[]` | Sí | `product_sports` |
| `gender` | `NamedEntityDTO` | Sí | `genders` |
| `size_type` | `NamedEntityDTO` | Sí | `size_types` |
| `sizes` | `SizeDTO[]` | Sí | `product_sizes` |
| `list_price` | `integer` | Sí | `products.list_price` |
| `sale_price` | `integer \| null` | No | Precio efectivo si hay oferta vigente |
| `discount_percentage` | `integer \| null` | No | Promoción vigente |
| `availability` | `string` | Sí | `products.availability` |
| `is_new` | `boolean` | Sí | `products.is_new` |
| `is_featured` | `boolean` | Sí | `products.is_featured` |
| `images` | `ImageDTO[]` | Sí | `images`, ordenadas por `position` |
| `variants` | `VariantDTO[]` | Sí | `variants` no eliminadas |

### `ProductAdminListItemDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `products.id` |
| `slug` | `string` | Sí | `products.slug` |
| `name` | `string` | Sí | `products.name` |
| `sku` | `string` | Sí | `products.sku` |
| `brand` | `NamedEntityDTO` | Sí | `brands` |
| `primary_category` | `NamedEntityDTO` | Sí | `categories` |
| `list_price` | `integer` | Sí | `products.list_price` |
| `availability` | `string` | Sí | `products.availability` |
| `is_active` | `boolean` | Sí | `products.is_active` |
| `is_featured` | `boolean` | Sí | `products.is_featured` |
| `is_new` | `boolean` | Sí | `products.is_new` |
| `has_image` | `boolean` | Sí | Derivado de `images` |
| `deleted_at` | `string \| null` | No | `products.deleted_at` |

### `ProductAdminDTO`

DTO completo para administración de productos. Incluye todos los campos públicos más campos administrativos e internos.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `products.id` |
| `slug` | `string` | Sí | `products.slug` |
| `name` | `string` | Sí | `products.name` |
| `description` | `string \| null` | No | `products.description` |
| `sku` | `string` | Sí | `products.sku` |
| `brand` | `NamedEntityDTO` | Sí | `brands` |
| `primary_category` | `NamedEntityDTO` | Sí | `categories` |
| `categories` | `NamedEntityDTO[]` | Sí | `product_categories` |
| `sports` | `NamedEntityDTO[]` | Sí | `product_sports` |
| `gender` | `NamedEntityDTO` + `slug` (v1.4.0) | Sí | `genders` |
| `size_type` | `NamedEntityDTO` + `slug` (v1.4.0) | Sí | `size_types` |
| `sizes` | `SizeDTO[]` | Sí | `product_sizes` |
| `list_price` | `integer` | Sí | `products.list_price` |
| `sale_price` | `integer \| null` | No | Precio efectivo si hay oferta vigente |
| `discount_percentage` | `integer \| null` | No | Promoción vigente |
| `sale_starts_at` | `string \| null` | No | `products.sale_starts_at` |
| `sale_ends_at` | `string \| null` | No | `products.sale_ends_at` |
| `availability` | `string` | Sí | `products.availability` |
| `is_active` | `boolean` | Sí | `products.is_active` |
| `is_new` | `boolean` | Sí | `products.is_new` |
| `is_featured` | `boolean` | Sí | `products.is_featured` |
| `images` | `ImageDTO[]` | Sí | `images` |
| `variants` | `VariantDTO[]` | Sí | `variants` |
| `created_at` | `string` | Sí | `products.created_at` |
| `updated_at` | `string` | Sí | `products.updated_at` |
| `deleted_at` | `string \| null` | No | `products.deleted_at` |

> **Nota (v1.4.0):** `gender.slug` y `size_type.slug` se agregan solo a
> `ProductAdminDTO` (no al `ProductDetailDTO` público) para que el panel
> traduzca la presentación (`Hombre`/`Mujer`/…, `Calzado`/`Indumentaria`/…)
> sin adivinar a partir de `name`, que en estos dos casos es el mismo valor
> que el slug (`S-06`, `S-07`). Cambio aditivo, no rompe el contrato.

### `ProductCreateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 255 caracteres |
| `description` | `string \| null` | No | — |
| `sku` | `string` | Sí | Único |
| `list_price` | `integer` | Sí | > 0 |
| `sale_price` | `integer \| null` | No | < `list_price` si existe |
| `sale_starts_at` | `string \| null` | No | ISO 8601 |
| `sale_ends_at` | `string \| null` | No | Posterior a `sale_starts_at` |
| `is_featured` | `boolean` | No | default `false` |
| `is_new` | `boolean` | No | default `false` |
| `primary_category_id` | `integer` | Sí | FK a `categories` |
| `category_ids` | `integer[]` | Sí | Incluye a `primary_category_id` |
| `sport_ids` | `integer[]` | No | — |
| `size_type_id` | `integer` | Sí | FK a `size_types` |
| `brand_id` | `integer` | Sí | FK a `brands` |
| `gender_id` | `integer` | Sí | FK a `genders` |
| `size_ids` | `integer[]` | No | — |

### `ProductUpdateDTO`

Igual que `ProductCreateDTO`, pero todos los campos obligatorios son requeridos para reemplazo completo (`PUT`).

> **Nota (v1.2.0):** `slug` no es un campo de entrada de ninguno de los dos DTO
> — nunca lo fue, aunque una versión anterior del servicio leía un `slug`
> suelto del cuerpo si venía. El backend lo genera siempre a partir de `name`
> (minúsculas, sin tildes ni «ñ», espacios y símbolos a `-`) y, si ya existe,
> le suma `-2`, `-3`... hasta encontrar uno libre; la comprobación corre
> contra la tabla completa, incluidos los productos borrados lógicamente
> (mismo criterio que `RN-79` en marcas), y es segura ante altas concurrentes
> con el mismo nombre porque el propio `INSERT` es quien decide, no una
> lectura previa. Se fija **solo al crear**: un `PUT` que cambia `name` nunca
> regenera `slug`, para no romper URLs ya compartidas ni referencias SEO.
> Cualquier `slug` que viaje en el cuerpo de la petición se ignora.

> **Nota (v1.4.0):** `availability` deja de ser un campo de entrada de
> `ProductCreateDTO`/`ProductUpdateDTO`. Un producto nace sin variantes con
> cantidad cargada, así que su `availability` derivada es `out_of_stock`
> hasta que el administrador carga cantidades desde §9.4. Cualquier
> `availability` que viaje en el cuerpo de la petición se ignora, mismo
> criterio que `slug`.

## 10.5 Variantes

### `VariantDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `variants.id` (excepción `AD-15`) |
| `size` | `SizeDTO \| null` | No | `sizes` |
| `availability` | `string` | Sí | Derivado de `variants.quantity` (`RN-38b`) |

> **Nota (v1.4.0):** hasta la v1.3.2, `availability` en `VariantDTO` reflejaba
> la disponibilidad del producto padre. Desde que `variants.quantity` existe
> (`04_BASE_DATOS.md` §9.2.2 v1.2.0), cada variante deriva su propio estado a
> partir de su propia cantidad — dos talles del mismo producto pueden mostrar
> estados distintos.

## 10.6 Imágenes

### `ImageDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `images.id` |
| `image_url` | `string` | Sí | URL pública de `images.file_path` |
| `is_primary` | `boolean` | Sí | `images.is_primary` |
| `position` | `integer` | Sí | `images.position` |
| `alt_text` | `string \| null` | No | `images.alt_text` |

## 10.7 Clasificaciones

### `NamedEntityDTO`

| Campo | Tipo | Obligatorio |
|---|---|---|
| `slug` | `string` | Sí |
| `name` | `string` | Sí |

### `CategoryTreeDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `categories.slug` |
| `name` | `string` | Sí | `categories.name` |
| `children` | `NamedEntityDTO[]` | Sí | Subcategorías (`AD-24`) |

### `CategoryAdminDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `categories.id` |
| `slug` | `string` | Sí | `categories.slug` |
| `name` | `string` | Sí | `categories.name` |
| `parent_id` | `integer \| null` | No | `categories.parent_id` |
| `is_active` | `boolean` | Sí | `categories.is_active` |
| `created_at` | `string` | Sí | `categories.created_at` |
| `updated_at` | `string` | Sí | `categories.updated_at` |
| `deleted_at` | `string \| null` | No | `categories.deleted_at` |

### `SportDTO` / `GenderDTO` / `SizeTypeDTO`

| Campo | Tipo | Obligatorio |
|---|---|---|
| `slug` | `string` | Sí |
| `name` | `string` | Sí |

### `BrandDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `brands.slug` |
| `name` | `string` | Sí | `brands.name` |
| `image_url` | `string \| null` | No | URL pública de `brands.image_path` (v1.1.0) |

> `image_url` es **opcional y con `null` como estado normal**, no como error. Una marca sin logotipo cargado es una marca perfectamente válida; el catálogo la presenta con su nombre compuesto tipográficamente (`UDS-09`).

### `BrandShowcaseDTO` (v1.1.0)

Salida de §7.2c. Es la marca **como pieza de portada**, no como filtro del catálogo: por eso lleva el collage y la frase, que no tienen sentido en el listado de marcas.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `brands.slug` |
| `name` | `string` | Sí | `brands.name` |
| `image_url` | `string \| null` | No | URL pública de `brands.image_path` |
| `tagline` | `string \| null` | No | `brands.tagline` |
| `position` | `integer` | Sí | `brands.home_position` |
| `images` | `BrandImageDTO[]` | Sí | `brand_images` activas, ordenadas por `position` |

### `BrandImageDTO` (v1.1.0)

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `image_url` | `string` | Sí | URL pública de `brand_images.file_path` |
| `alt_text` | `string \| null` | No | `brand_images.alt_text` |
| `position` | `integer` | Sí | `brand_images.position` |

> No expone `id`, conforme a `AD-12`. La clave estable dentro del collage es `position`.

### `StoreAboutDTO` (v1.1.0)

Salida de §7.2b.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `about_title` | `string \| null` | No | `store_settings.about_title` |
| `about_text` | `string \| null` | No | `store_settings.about_text` |
| `about_image_url` | `string \| null` | No | URL pública de `store_settings.about_image_path` |
| `email` | `string \| null` | No | `store_settings.email` |

### `SizeDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `slug` | `string` | Sí | `sizes.slug` |
| `name` | `string` | Sí | `sizes.name` |
| `size_type` | `NamedEntityDTO` | Sí | `size_types` |

### `GenderAdminDTO`

Salida de §9.17. Idéntico a `GenderDTO` más el identificador que la API privada sí admite (§4.8) y que `ProductCreateDTO` necesita.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `genders.id` |
| `slug` | `string` | Sí | `genders.slug` |
| `name` | `string` | Sí | `genders.name` |

### `SizeTypeAdminDTO`

Salida de §9.18. Mismo criterio.

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `size_types.id` |
| `slug` | `string` | Sí | `size_types.slug` |
| `name` | `string` | Sí | `size_types.name` |

## 10.8 Dashboard

### `DashboardDTO`

**DTO agregado; no representa una entidad persistente.** Se computa a partir de `products`, `price_history`, `images` y `product_categories`.

| Campo | Tipo | Descripción |
|---|---|---|
| `totals` | `object` | Totales por estado. |
| `totals.total` | `integer` | Productos no eliminados. |
| `totals.active` | `integer` | `is_active = true` y no eliminados. |
| `totals.hidden` | `integer` | `is_active = false` y no eliminados. |
| `totals.available` | `integer` | `availability = available`. |
| `totals.low_stock` | `integer` | `availability = low_stock`. |
| `totals.out_of_stock` | `integer` | `availability = out_of_stock`. |
| `totals.on_sale` | `integer` | Con oferta o promoción vigente. |
| `incomplete_products` | `array` | Productos incompletos (`RF-39`). |
| `incomplete_products[].id` | `integer` | `products.id` |
| `incomplete_products[].slug` | `string` | `products.slug` |
| `incomplete_products[].name` | `string` | `products.name` |
| `incomplete_products[].missing` | `string[]` | `image`, `price` o `category`. |
| `recent_price_changes` | `array` | Últimos cambios de precio (opcional, limitado). |

## 10.9 Promociones

### `PromotionDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `promotions.id` |
| `name` | `string` | Sí | `promotions.name` |
| `description` | `string \| null` | No | `promotions.description` |
| `discount_percentage` | `integer` | Sí | `promotions.discount_percentage` |
| `starts_at` | `string` | Sí | `promotions.starts_at` |
| `ends_at` | `string \| null` | No | `promotions.ends_at` |
| `is_active` | `boolean` | Sí | `promotions.is_active` |
| `scope` | `object` | Sí | Exactamente uno de `product`, `category` o `brand`. |
| `scope.type` | `string` | Sí | `product`, `category` o `brand`. |
| `scope.entity` | `NamedEntityDTO` | Sí | Entidad a la que aplica. |

### `PromotionCreateDTO` / `PromotionUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 255 |
| `description` | `string \| null` | No | — |
| `discount_percentage` | `integer` | Sí | 1–99 |
| `starts_at` | `string` | Sí | ISO 8601 |
| `ends_at` | `string \| null` | No | Posterior a `starts_at` |
| `is_active` | `boolean` | No | default `true` |
| `product_id` | `integer \| null` | No | Mutuamente exclusivo con `category_id` y `brand_id` |
| `category_id` | `integer \| null` | No | Mutuamente exclusivo |
| `brand_id` | `integer \| null` | No | Mutuamente exclusivo |

## 10.10 Administradores

### `AdministratorProfileDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `administrators.id` |
| `username` | `string` | Sí | `administrators.username` |
| `email` | `string` | Sí | `administrators.email` |
| `role` | `string` | Sí | `administrators.role` |
| `last_login_at` | `string \| null` | No | `administrators.last_login_at` |

### `AdministratorDTO`

Extiende `AdministratorProfileDTO` con:

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `is_active` | `boolean` | Sí | `administrators.is_active` |
| `created_at` | `string` | Sí | `administrators.created_at` |
| `updated_at` | `string` | Sí | `administrators.updated_at` |
| `deleted_at` | `string \| null` | No | `administrators.deleted_at` |

### `AdministratorCreateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `username` | `string` | Sí | Único |
| `email` | `string` | Sí | Único, formato email |
| `password` | `string` | Sí | Política de contraseñas (`03_SEGURIDAD.md`) |
| `role` | `string` | Sí | `administrator` o `super_administrator` |

### `AdministratorUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `username` | `string` | Sí | Único |
| `email` | `string` | Sí | Único |
| `role` | `string` | Sí | — |
| `is_active` | `boolean` | Sí | — |

## 10.11 Auditoría

### `AuditLogDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `audit_logs.id` |
| `administrator` | `AdministratorMinimalDTO` | Sí | `administrators` |
| `action` | `string` | Sí | `audit_logs.action` |
| `entity_type` | `string` | Sí | `audit_logs.entity_type` |
| `entity_id` | `integer` | Sí | `audit_logs.entity_id` |
| `old_values` | `object \| null` | No | `audit_logs.old_values` |
| `new_values` | `object \| null` | No | `audit_logs.new_values` |
| `ip_address` | `string \| null` | No | `audit_logs.ip_address` |
| `created_at` | `string` | Sí | `audit_logs.created_at` |

### `AdministratorMinimalDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `administrators.id` |
| `username` | `string` | Sí | `administrators.username` |

## 10.12 Historial de precios

### `PriceHistoryDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `integer` | Sí | `price_history.id` |
| `product` | `NamedEntityDTO` | Sí | `products` |
| `old_price` | `integer` | Sí | `price_history.old_price` |
| `new_price` | `integer` | Sí | `price_history.new_price` |
| `administrator` | `AdministratorMinimalDTO` | Sí | `administrators` |
| `created_at` | `string` | Sí | `price_history.created_at` |

## 10.13 DTOs de entrada para recursos administrativos

DTOs reutilizables para operaciones de escritura del panel.

### `StoreSettingsAdminUpdateDTO`

Igual que `StoreSettingsAdminDTO` sin campos de solo lectura (`updated_at` no aplica; no existe en el modelo).

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `store_name` | `string` | Sí | ≤ 255 |
| `whatsapp_number` | `string` | Sí | — |
| `address` | `string \| null` | No | — |
| `business_hours` | `string \| null` | No | — |
| `social_links` | `object \| null` | No | — |
| `message_template` | `string` | Sí | Variables requeridas (`RF-41`) |
| `item_template` | `string` | Sí | Variables requeridas |
| `featured_products_count` | `integer` | Sí | > 0 |

### `WhatsAppTemplateDTO`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `message_template` | `string` | Sí | `store_settings.message_template` |
| `item_template` | `string` | Sí | `store_settings.item_template` |

### `CategoryCreateDTO` / `CategoryUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 100 |
| `slug` | `string` | Sí | Único, ≤ 100 |
| `parent_id` | `integer \| null` | No | FK a `categories`; máx. 2 niveles |
| `is_active` | `boolean` | No | default `true` |

### `BrandCreateDTO` / `BrandUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 100 |
| `slug` | `string` | Sí | Único, ≤ 100 |
| `is_active` | `boolean` | No | default `true` |

### `SportCreateDTO` / `SportUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 100 |
| `slug` | `string` | Sí | Único, ≤ 100 |
| `is_active` | `boolean` | No | default `true` |

### `SizeCreateDTO` / `SizeUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `name` | `string` | Sí | ≤ 20 |
| `slug` | `string` | Sí | Único, ≤ 20 |
| `size_type_id` | `integer` | Sí | FK a `size_types` |
| `is_active` | `boolean` | No | default `true` |

### `BannerCreateDTO` / `BannerUpdateDTO`

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `title` | `string` | Sí | ≤ 255 |
| `subtitle` | `string \| null` | No | ≤ 255 |
| `image` | `file` | Sí* | Archivo de imagen; en `PUT` puede omitirse si no se reemplaza |
| `link_url` | `string \| null` | No | URL válida |
| `position` | `integer` | Sí | ≥ 0 |
| `starts_at` | `string \| null` | No | ISO 8601 |
| `ends_at` | `string \| null` | No | Posterior a `starts_at` |
| `is_active` | `boolean` | No | default `true` |

---

# 11. Códigos de estado HTTP

| Código | Cuándo | Origen |
|---|---|---|
| `200` | Lectura o modificación correcta. | — |
| `201` | Recurso creado. | — |
| `204` | Operación correcta sin contenido. | — |
| `400` | Petición malformada. | — |
| `401` | Sin identidad (panel). | `AuthenticationError` |
| `403` | Identidad sin permiso. | `AuthorizationError` |
| `404` | Recurso inexistente o no visible. | `NotFoundError` |
| `409` | Regla de negocio violada. | `BusinessRuleError` |
| `422` | Validación de formato o esquema. | `ValidationError` |
| `429` | Límite de tasa superado. | `02_ARQUITECTURA.md` §11.10 |
| `500` | Fallo técnico. | — |
| `502` | Fallo de servicio externo. | `IntegrationError` |

**Distinción `422` vs `409`:**

- `422`: la petición no tiene forma válida (ej: `quantity` no es entero).
- `409`: la petición es válida pero el dominio la rechaza (ej: precio de oferta no menor al de lista, `RN-31`).
- `409` siempre lleva el `RN-xx` violado en `errors[].rule`.

## 11.1 Ejemplos de respuestas de error

Todos los errores usan la envoltura unificada de `AD-16`.

### `400` — Petición malformada

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "malformed_request",
      "rule": null,
      "detail": "request body is not valid JSON",
      "field": null
    }
  ],
  "meta": { "request_id": "c7a1b3d9" }
}
```

### `401` — Sin identidad

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "authentication_required",
      "rule": "RN-66",
      "detail": "session not found or expired",
      "field": null
    }
  ],
  "meta": { "request_id": "e2f5a8c4" }
}
```

### `403` — Sin permiso

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "insufficient_privileges",
      "rule": "RN-67",
      "detail": "operation requires super_administrator role",
      "field": null
    }
  ],
  "meta": { "request_id": "d8b4e1a7" }
}
```

### `404` — Recurso no visible

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "resource_not_found",
      "rule": null,
      "detail": "product not found or not visible",
      "field": null
    }
  ],
  "meta": { "request_id": "f9c2d6b5" }
}
```

### `409` — Regla de negocio violada

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "business_rule_violation",
      "rule": "RN-31",
      "detail": "sale_price must be lower than list_price",
      "field": "sale_price"
    }
  ],
  "meta": { "request_id": "a3f9c1e2" }
}
```

### `422` — Validación de esquema

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "validation_error",
      "rule": null,
      "detail": "list_price must be a positive integer",
      "field": "list_price"
    },
    {
      "code": "validation_error",
      "rule": null,
      "detail": "availability must be one of available, low_stock, out_of_stock",
      "field": "availability"
    }
  ],
  "meta": { "request_id": "g1h4i7j0" }
}
```

### `500` — Fallo técnico

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "internal_server_error",
      "rule": null,
      "detail": "unexpected error occurred",
      "field": null
    }
  ],
  "meta": { "request_id": "k5l8m1n4" }
}
```

---

# 12. Decisiones abiertas

## 12.1 Cierre de `ADP-09`

`ADP-09` queda cerrado con la siguiente decisión de contrato:

> El campo `cart_content_version` viaja en el cuerpo de `POST /api/v1/cart/revalidate` y se devuelve en `meta.cart_content_version`. El servidor lo refleja sin utilizarlo para lógica de negocio; permite al cliente descartar respuestas obsoletas cuando el carrito mutó concurrentemente (`AD-22`).

Esto se implementa en §8.2 y §8.3.

## 12.2 Pendientes no bloqueantes

| ID | Descripción | Documento futuro |
|---|---|---|
| `ADP-13` | Fragilidad de la lista de agentes de rastreadores de `AD-09` | `12_DEPLOY.md` |
| `ADP-14` | Formato enriquecido en `products.description` | `01_ANALISIS_NEGOCIO.md` o `07_PANEL_ADMIN.md` |
| `ADP-16` | Tamaño y formato exacto de imágenes | ✅ **Cerrado** en `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (`AI-06`) |

> **Renumerado.** Este pendiente se registró como `ADP-15`, identificador que
> `02.1_DECISIONES_ARQUITECTONICAS.md` §pendientes ya asignaba al lector del
> registro de auditoría de `AD-20`. Se conserva aquel significado y este pasa a
> `ADP-16`, el siguiente libre. El significado y el historial de `ADP-15` no
> cambian.

---

# 13. Trazabilidad

## 13.1 Decisiones arquitectónicas aplicadas

| Decisión | Sección de aplicación |
|---|---|
| `AD-09` | §6 (endpoints HTML para rastreadores) |
| `AD-12` | §4.8 (DTOs, no modelos; identificadores internos) |
| `AD-13` | §4.3 y §11 (errores como parte del contrato) |
| `AD-15` | §8 y §10.5 (`variant_id` como identificador estable) |
| `AD-16` | §4.3 (envoltura uniforme) |
| `AD-17` | §4.2 (versionado `/api/v1/`) |
| `AD-22` | §8 (versión de contenido del carrito) |
| `AD-23` | §4.5 y §7.3 (filtros por slug) |
| `AD-25` | §8.4 (matriz de resolución del carrito) |
| `AD-26` | §4.5 (parámetros desconocidos ignorados) |
| `AD-27` | §4.5 (orden canónico de parámetros) |
| `AD-28` | §8.5 (el servidor no modifica el carrito en silencio) |
| `AD-29` | §4.5 y §7.3 (categoría padre incluye descendientes) |
| `AD-31` | §4.4 (paginación por desplazamiento) |
| `AD-32` | §8 (revalidación por `POST`) |
| `AD-36` | §8.2 (el cliente envía identidades, no precios) |
| `AD-37` | §5.1 (sesión de servidor con cookie) |

## 13.2 Reglas de negocio aplicadas

| Regla | Sección de aplicación |
|---|---|
| `RN-01`, `RN-02` | §7.3 (productos activos en catálogo público) |
| `RN-04` | §9.3 (categoría principal) |
| `RN-05`, `RN-06` | §7.6, §9.6 (marcas) |
| `RN-08` | §7.7 (deportes) |
| `RN-09` | §7.10 (sexos) |
| `RN-14`, `RN-16` | §7.9, §10.5 (talles, variantes) |
| `RN-15` | §7.11 (tipos de talle) |
| `RN-20` | §6.3, §10.4 (imagen principal) |
| `RN-30` a `RN-38b` | §9.10, §10.9 (promociones) |
| `RN-38` | §10.5 (`availability`) |
| `RN-40` | §8.4 (variante sin disponibilidad se mantiene) |
| `RN-47` | §4.7 y §7.3 (facetas) |
| `RN-48` | §7.3 (búsqueda de texto) |
| `RN-56` | §8 (revalidación) |
| `RN-58` a `RN-61` | §7.1, §10.2 (configuración de tienda) |
| `RN-63` | §5.2 (API pública anónima) |
| `RN-66`, `RN-67` | §5.1, §9.14 (autenticación y roles) |
| `RN-70` | §9.16, §10.12 (historial de precios) |
| `RN-73`, `RN-74` | §7.2, §9.11 (banners) |
| `RN-75` | §8.2 (máximo 26 ítems) |
| `RN-76` | §9.13 (validación de longitud de plantilla) |
| `RN-77`, `RN-78` | §8.5 (confirmación ante discrepancias) |

---

# 14. Historial de Cambios

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| **1.6.0** | 19/08/2026 | 🟡 EN REVISIÓN | **Eliminación de "color" del catálogo** (`01_ANALISIS_NEGOCIO.md` 2.7.0, `04_BASE_DATOS.md` v1.4.0, pedido del administrador). Se retiran `GET /api/v1/colors` (§7.8) y el CRUD `/api/v1/admin/colors` (§9.8) — ambos números de sección quedan vacíos, sin contenido, para no correr la numeración de las secciones siguientes. `ColorDTO`, `ColorCreateDTO`/`ColorUpdateDTO` (§10.3) eliminados. `ProductDetailDTO.colors`, `ProductAdminDTO.colors`, `ProductCreateDTO.color_ids` y `VariantDTO.color` (§10.4, §10.5) eliminados de sus DTOs. |
| **1.5.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Registro de ventas (`RN-82`, `04_BASE_DATOS.md` v1.3.0).** Nuevo `POST /api/v1/admin/products/{id}/variants/{variant_id}/sales` (§9.4): registra una venta, descuenta `quantity` de la variante y recalcula `products.availability` (`RN-39`) en la misma transacción; `409` si la cantidad supera el stock cargado. Devuelve `VariantAdminDTO`, mismo DTO que el `PUT` existente. Pedido explícito del usuario: *"agregar opcion de registrar ventas para que de esta manera reduzca en el stock desded el panel admin"* (18/08/2026). |
| **1.4.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Stock real por variante (`RN-38b`, `04_BASE_DATOS.md` v1.2.0).** Nuevo `PUT /api/v1/admin/products/{id}/variants/{variant_id}` (§9.4) para cargar `quantity`; el `GET` de variantes del panel pasa a `VariantAdminDTO` (`VariantDTO` + `quantity`). `availability` sale de `ProductCreateDTO`/`ProductUpdateDTO` (§10.4): ya no es un campo que el administrador escriba, se deriva de `variants.quantity`. `VariantDTO.availability` (§10.5) deja de reflejar al producto padre y pasa a derivarse de la cantidad propia de cada variante. `DashboardDTO.totals` (§10.8) pierde `coming_soon` (estado retirado, sin datos que lo usaran). Pedido explícito del usuario en la tanda funcional del 17/08/2026. |
| **1.3.2** | 16/08/2026 | ✅ APROBADO | **Corrección de implementación (v1.2.0).** `ProductCreateDTO`/`ProductUpdateDTO` (§10.4) nunca documentaron `slug` como campo de entrada, pero el servicio leía uno del cuerpo si venía. Se aclara explícitamente: el backend siempre genera `slug` a partir de `name` (normalizado, único, con sufijo `-2`, `-3`... si hace falta) y lo fija solo al crear — un `PUT` que cambia `name` no lo regenera. Ningún DTO cambia de forma; es una precisión de un comportamiento que ya estaba fuera de contrato. |
| **1.0.0** | 07/08/2026 | ✅ **APROBADO** | Contrato completo de la API. API pública, endpoint dedicado de revalidación del carrito (§8), API privada del panel, DTOs, paginación/facetas/errores, endpoints HTML para rastreadores fuera de `/api/v1` (§6), división de `StoreSettingsPublicDTO` y `StoreSettingsAdminDTO` (§10.2), `thumbnail_url` en listados e `images` en detalle (§10.4), `availability` en `VariantDTO` (§10.5), `DashboardDTO` explícito como DTO agregado (§10.8), sexos y tipos de talle como datos semilla no administrables (§7.10, §7.11). Cierre de `ADP-09` (§12.1). |
| **1.1.0** | 10/08/2026 | ✅ APROBADO | **Resolución de colisión de identificador.** El pendiente de tamaño y formato de imágenes de §12.2, registrado como `ADP-15`, colisionaba con el `ADP-15` de `02.1_DECISIONES_ARQUITECTONICAS.md` (lector del registro de auditoría de `AD-20`). Se conserva aquel significado y este pasa a **`ADP-16`**, primer identificador libre. `ADP-16` queda **cerrado** en `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (`AI-06`). **Ningún contrato cambia**: `ImageDTO` (§10.6) mantiene su campo único `image_url`, ahora definido como la URL pública del derivado canónico de 800 px. |
| **1.3.1** | 13/08/2026 | ✅ APROBADO | Corrección surgida al implementar el panel. §9.6: el `POST` y el `PUT` de marcas **siguen siendo JSON**; el logotipo pasa a recurso propio en `multipart/form-data`, como ya hacía §9.12 con la foto de historia. Volver multipart el CRUD genérico que las marcas comparten con categorías, deportes, colores y talles habría roto el patrón común y obligado a reenviar el archivo en cada renombrado. |
| **1.3.0** | 13/08/2026 | ✅ APROBADO | **Portada administrable.** Público: §7.2 acepta `?placement=`; nuevos §7.2b `GET /store/about` y §7.2c `GET /store/brand-showcases`. Nuevos DTOs `BrandShowcaseDTO`, `BrandImageDTO` y `StoreAboutDTO`; `BrandDTO` suma `image_url`; `BannerDTO` y `BannerAdminDTO` suman `button_label` y `placement`. Panel: §9.6 pasa a `multipart/form-data` y suma logotipo, `tagline`, `home_position` y el sub-recurso de collage con reordenamiento; §9.11 suma `placement` y `button_label` de entrada y filtro por zona; §9.12 suma `email`, `about_title`, `about_text` y los endpoints de imagen de historia. **La historia y el correo se exponen como recurso propio y no dentro de `StoreSettingsPublicDTO`**, que `AD-12` congela en cinco campos: es el mismo criterio con el que se resolvió la plantilla de WhatsApp. Todos los cambios son aditivos: ningún endpoint existente cambia de forma ni de comportamiento por defecto. |
| **1.2.0** | 11/08/2026 | ✅ APROBADO | **`BannerAdminDTO` (§10.3) y §9.11 completada.** El panel necesita `id`, fechas y estado para direccionar y cargar el formulario de §14.6 de `07_PANEL_ADMIN.md`, y el único DTO de salida definido era el público, que `AD-12` deja sin `id`. Se añade un DTO exclusivo del panel, conforme a §4.8 (*"la API privada expone identificadores internos"*), sin marcas de tiempo administrativas, en línea con `PromotionDTO` y `AdministratorProfileDTO`. §9.11 declara ahora entrada y salida por endpoint, y que la entrada viaja como `multipart/form-data` porque `image` es un archivo (§10.13). **`BannerDTO` (§10.3) no cambia.** |

---
