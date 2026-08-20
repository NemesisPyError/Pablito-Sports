# 06_FRONTEND.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Frontend |
| **Código** | 06 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 07/08/2026 |
| **Documentos previos** | [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [05.1_API_DATABASE_CROSS_REVIEW.md](05.1_API_DATABASE_CROSS_REVIEW.md) ✅ · [06.0_FRONTEND_ANALISIS_PREVIO.md](06.0_FRONTEND_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `07_PANEL_ADMIN.md`, `08_UI_SYSTEM.md`, `09_COMPONENTES.md`, `11_TESTING.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Definir la **implementación del frontend** de Pablito Sports: filosofía, organización, routing, gestión de estado, comunicación con la API, componentes, accesibilidad, rendimiento, SEO y testing.

Este documento **materializa** las decisiones arquitectónicas aprobadas en `02_ARQUITECTURA.md` y los contratos de `05_API.md`. No crea arquitectura nueva.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Stack y bibliotecas del frontend | — |
| Estructura de carpetas y features | — |
| Rutas de la aplicación | — |
| Gestión de estado (resolución de `AD-07` / `ADP-01`) | — |
| Cliente HTTP, interceptores y manejo de errores | — |
| Ciclo de vida del carrito | — |
| Componentes reutilizables iniciales | `09_COMPONENTES.md` |
| Accesibilidad, rendimiento, SEO, responsive | — |
| Error Boundaries y Suspense | — |
| Diseño visual del panel | `07_PANEL_ADMIN.md`, `08_UI_SYSTEM.md` |
| Inventario detallado de componentes | `09_COMPONENTES.md` |
| Estrategia de pruebas | `11_TESTING.md` |
| Guía de implementación para IA | `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 3. Alcance

## 3.1 Incluye

- Filosofía y stack tecnológico del frontend.
- Listado definitivo de features y organización del proyecto.
- Routing completo de la aplicación (público y panel).
- Gestión de estado: server state, client state, estado derivado y persistente.
- Comunicación con la API: cliente HTTP, interceptores, errores, retries, timeouts.
- Carrito de consulta: LocalStorage, versionado, sincronización, revalidación, WhatsApp.
- Componentes reutilizables iniciales.
- Accesibilidad, rendimiento, Error Boundaries, Suspense, SEO, responsive.
- Relación con documentos de testing y panel.

## 3.2 No incluye

- Lógica de negocio del backend.
- Diseño visual detallado ni sistema de diseño completo.
- Especificación de cada componente (esto va en `09_COMPONENTES.md`).
- Casos de prueba detallados (van en `11_TESTING.md`).

---

# 4. Filosofía del frontend

## 4.1 Principios

| # | Principio | Origen |
|---|---|---|
| 1 | **El frontend no decide reglas de negocio.** Las anticipa por experiencia de usuario, pero la fuente de verdad es el backend. | `AD-03` |
| 2 | **El frontend no conoce la base de datos.** Habla con DTOs, nunca con modelos. | `AD-12` |
| 3 | **La organización sigue al dominio, no al tipo de archivo.** | `AD-08`, `OA-01` |
| 4 | **Todo lo que el cliente ve está en español.** La traducción ocurre en presentación. | `GL-10`, `NM-01` |
| 5 | **Se optimiza la primera pantalla del catálogo.** Es la que decide si el cliente sigue o se va. | `RNF-01`, `PA-07` |
| 6 | **Ningún componente depende directamente de una biblioteca de estado global.** El acceso es siempre a través de hooks propios. | `AD-07`, `DEP-11` |
| 7 | **Mobile First.** La mayoría del tráfico público es móvil. | `RNF-06`, `02_ARQUITECTURA.md` §8.4 |
| 8 | **Componentes desacoplados.** Presentación separada de obtención de datos y reglas. | `02_ARQUITECTURA.md` §8.3 |

## 4.2 Naturaleza de la aplicación

- **SPA React desacoplada** (`AD-01`).
- **Una sola aplicación**, con carga diferida del panel administrativo (`02_ARQUITECTURA.md` §8.4).
- **Catálogo público indexable** mediante metadatos servidos por el backend (`AD-09`).
- **Panel administrativo no indexable** (`RNF-13`).

---

# 5. Stack tecnológico

## 5.1 Base

| Tecnología | Uso | Origen |
|---|---|---|
| **React 18+** | Biblioteca de interfaz | `00_VISION_PROYECTO.md` §9, `AD-01` |
| **Vite** | Build y servidor de desarrollo | `00_VISION_PROYECTO.md` §9, `02_ARQUITECTURA.md` §8.13 |
| **Bootstrap 5.3** | Sistema de grid, utilidades y componentes base | `00_VISION_PROYECTO.md` §9 |
| **Axios** | Cliente HTTP subyacente | `00_VISION_PROYECTO.md` §9 |

## 5.2 Gestión de estado

| Tecnología | Uso | Origen |
|---|---|---|
| **TanStack Query (React Query)** | Server state: catálogo, producto, configuración, listados del panel | Resolución de `AD-07` / `ADP-01` |
| **Zustand** | Client state persistente/compartido: carrito, tema, notificaciones | Resolución de `AD-07` / `ADP-01` |
| **React Context** | Estado simple compartido: sesión del administrador | Resolución de `AD-07` / `ADP-01` |

## 5.3 Routing, formularios y utilidades

| Tecnología | Uso | Origen |
|---|---|---|
| **React Router v6** | Enrutamiento del SPA | Decisión de implementación |
| **React Hook Form + Zod Resolver** | Formularios del panel (solución única) | Ajuste aprobado en `06.0_FRONTEND_ANALISIS_PREVIO.md` |
| **date-fns** | Manejo de fechas y conversiones de zona horaria | Decisión de implementación |

## 5.4 Regla de acceso a bibliotecas

> **Ningún componente importa directamente `useQuery`, `useMutation`, `useStore`, `useShallow` ni similares.** Cada feature expone hooks propios que envuelven estas bibliotecas (`DEP-11`). Esto permite cambiar la implementación subyacente sin tocar los componentes.

---

# 6. Listado definitivo de features

El frontend se organiza por features de dominio (`AD-08`). A continuación se cierra el listado definitivo para v1.

## 6.1 Features del catálogo público

| Feature | Dominio | Responsabilidad | APIs principales |
|---|---|---|---|
| `store` | Tienda | Home, banners, información institucional, footer, contacto. | `GET /store/settings`, `GET /banners`, `GET /products` |
| `catalog` | Catálogo | Listado de productos, búsqueda, filtros, ordenamiento, facetas. | `GET /products` |
| `products` | Producto | Ficha de producto, galería, selección de variantes. | `GET /products/{slug}` |
| `cart` | Carrito | Carrito de consulta, revalidación, mensaje de WhatsApp. | `POST /cart/revalidate` |

## 6.2 Features del panel administrativo

| Feature | Dominio | Responsabilidad | APIs principales |
|---|---|---|---|
| `auth` | Autenticación | Login, logout, sesión del administrador. | `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me` |
| `admin` | Administración | Dashboard, productos, variantes, imágenes, categorías, marcas, deportes, talles, promociones, banners, configuración, usuarios, auditoría, historial de precios. | Endpoints bajo `/admin/*` |

## 6.3 Justificación del listado

- El panel se agrupa en un único feature `admin` porque comparte layout, navegación, sistema de tablas, formularios y permisos. Dentro de `admin` se organiza por subcarpetas por dominio.
- `auth` es un feature separado porque es transversal: tanto el panel como futuras áreas protegidas pueden depender de él.
- No se crean features separados para cada entidad administrable (marcas, categorías, etc.) porque comparten patrones de UI y no representan productos distintos para el usuario administrador.

---

# 7. Organización del proyecto

## 7.1 Estructura de carpetas

```
src/
├── app/                    # Arranque, proveedores globales, límites de error raíz
│   ├── App.jsx
│   ├── providers/          # composición de proveedores (QueryClient, Router, Auth)
│   └── ErrorBoundary.jsx   # límite de error raíz
│
├── routes/                 # composición de rutas públicas y privadas
│   ├── PublicRoutes.jsx
│   └── AdminRoutes.jsx
│
├── features/               # dominios de negocio
│   ├── store/
│   ├── catalog/
│   ├── products/
│   ├── cart/
│   ├── auth/
│   └── admin/
│
├── shared/                 # zona común explícita
│   ├── components/         # sistema de diseño, elementos sin dominio
│   ├── layouts/            # layouts público y de panel
│   ├── hooks/              # hooks transversales
│   ├── services/           # cliente HTTP base y utilidades de API
│   ├── formatters/         # guaraníes, fechas, traducción de estados
│   ├── stores/             # stores Zustand transversales (tema, notificaciones)
│   ├── types/              # tipos compartidos
│   ├── utils/              # funciones puras sin dominio
│   └── config/             # constantes y configuración del cliente
│
└── main.jsx                # punto de entrada
```

## 7.2 Anatomía interna de un feature

Cada feature sigue la misma estructura interna:

```
features/catalog/
├── components/        # ProductGrid, ProductCard, FiltersPanel, Pagination
├── hooks/             # useProducts, useFilters, useCategoriesForFilter
├── services/          # catalogService
├── stores/            # (si aplica) stores específicos del feature
├── pages/             # CatalogPage
├── types/             # DTOs y tipos del dominio
├── utils/             # funciones puras del feature
└── index.js           # única superficie pública del feature
```

## 7.3 Reglas de dependencia

| Regla | Enunciado | Origen |
|---|---|---|
| **DEP-08** | Un feature no importa desde el interior de otro feature. Solo desde su `index.js`. | `02_ARQUITECTURA.md` §8.2 |
| **DEP-09** | `shared/` nunca importa desde `features/`. La dependencia es unidireccional. | `02_ARQUITECTURA.md` §8.2 |
| **DEP-10** | Ningún componente llama a la API directamente. Pasa por la capa de servicios de su feature. | `02_ARQUITECTURA.md` §8.2 |
| **DEP-11** | Ningún componente importa una biblioteca de estado global de forma directa. Accede mediante hooks propios. | `AD-07` |
| **DEP-12** | Un elemento se promueve a `shared/` solo cuando lo usan dos o más features. | `AD-08` |

## 7.4 Responsabilidad por nivel

| Nivel | Responsabilidad | Puede | No puede |
|---|---|---|---|
| `app/` | Arranque, proveedores globales, límites de error | Componer el árbol de proveedores | Contener lógica de dominio |
| `routes/` | Composición de rutas y protección | Decidir qué se renderiza y con qué guards | Contener interfaz |
| Páginas | Orquestar la pantalla | Pedir datos, componer componentes | Formatear, calcular reglas de negocio |
| Componentes de presentación | Mostrar y capturar interacción | Recibir datos ya listos | Llamar a la API, calcular precios |
| Hooks del feature | Datos, estado y efectos del dominio | Hablar con los servicios del feature | Renderizar |
| Servicios del feature | Comunicación con la API | Construir peticiones y mapear DTOs | Decidir reglas de negocio |

---

# 8. Routing

## 8.1 Rutas públicas

| Ruta | Pantalla | Indexable | Notas |
|---|---|---|---|
| `/` | Home | Sí | Banners, destacados, novedades, ofertas. |
| `/catalogo` | Catálogo | Sí | Listado base. |
| `/catalogo?...` | Catálogo filtrado | No | Canónica hacia `/catalogo`. |
| `/producto/:slug` | Ficha de producto | Sí | `slug` de `RN-10`. |
| `/carrito` | Carrito de consulta | No | No indexable por naturaleza. |
| `/nosotros` | Información de la tienda | Sí | Dirección, horarios, contacto, redes. |
| `/contacto` | Contacto | Sí | Puede redundar con `/nosotros`. |

## 8.2 Rutas del panel administrativo

Todas las rutas bajo `/admin/*` requieren autenticación (`RN-66`). Las rutas de gestión de usuarios requieren rol `super_administrator` (`RN-67`).

| Ruta | Pantalla | Rol mínimo |
|---|---|---|
| `/admin/login` | Login del panel | Anónimo |
| `/admin` | Dashboard | Administrador |
| `/admin/productos` | Listado de productos | Administrador |
| `/admin/productos/nuevo` | Crear producto | Administrador |
| `/admin/productos/:id` | Editar producto | Administrador |
| `/admin/categorias` | Categorías | Administrador |
| `/admin/marcas` | Marcas | Administrador |
| `/admin/deportes` | Deportes | Administrador |
| `/admin/talles` | Talles | Administrador |
| `/admin/promociones` | Promociones | Administrador |
| `/admin/banners` | Banners | Administrador |
| `/admin/configuracion` | Configuración de la tienda | Administrador |
| `/admin/plantilla-whatsapp` | Plantilla de WhatsApp | Administrador |
| `/admin/usuarios` | Usuarios administradores | Superadministrador |
| `/admin/auditoria` | Registros de auditoría | Administrador |
| `/admin/historial-precios` | Historial de precios | Administrador |

## 8.3 Reglas de routing

1. Las rutas públicas se escriben en **español** (`NM-01`).
2. Los parámetros de consulta van en **inglés**; los valores son slugs (`AD-23`, `00.3_NOMENCLATURA.md` §16.5).
3. Toda ruta privada carga de forma diferida (`02_ARQUITECTURA.md` §8.5).
4. La guarda de ruta es una conveniencia de interfaz; la autorización real la impone el backend en cada endpoint (`PA-06`, `AD-03`).
5. La búsqueda no es una ruta aparte; es un filtro más de `/catalogo` (`02_ARQUITECTURA.md` §11.6).

---

# 9. Gestión del estado

## 9.1 Resolución de AD-07 / ADP-01

| Tipo de estado | Herramienta | Dónde vive | Acceso |
|---|---|---|---|
| **Server state** (catálogo, producto, configuración, listados del panel) | **TanStack Query** | Caché gestionada por la biblioteca | Hooks propios del feature (`useProducts`, `useProduct`, `useStoreSettings`, etc.) |
| **Client state persistente/compartido** (carrito, tema, notificaciones) | **Zustand** | `features/X/stores/` o `shared/stores/` | Hooks propios (`useCart`, `useTheme`, `useNotifications`) |
| **Client state simple compartido** (sesión del administrador) | **React Context** | `features/auth/` | Hook propio (`useAuth`) |
| **Estado derivado** (total estimado, cantidad de ítems, filtros) | **Cálculo en renderizado** | — | Hooks/helpers propios |

## 9.2 Reglas de estado

| Regla | Enunciado | Origen |
|---|---|---|
| **ES-01** | El estado derivado nunca se almacena. | `02_ARQUITECTURA.md` §8.6 |
| **ES-02** | El estado del servidor no es estado del cliente. | `02_ARQUITECTURA.md` §8.6 |
| **ES-03** | Todo acceso a estado compartido pasa por un hook propio. | `AD-07`, ajuste aprobado |
| **ES-04** | El estado persistente declara versión y política de expiración. | `02_ARQUITECTURA.md` §8.6 |
| **ES-05** | Los filtros viven en la URL, no en memoria. | `RF-06`, `02_ARQUITECTURA.md` §8.11 |

## 9.3 Ejemplo de hooks propios

```javascript
// features/cart/hooks/useCart.js
export function useCart() {
  return useCartStore(); // Zustand encapsulado
}

// features/catalog/hooks/useProducts.js
export function useProducts(filters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => catalogService.getProducts(filters),
  });
}
```

Ningún componente consume `useQuery` o `useStore` directamente.

---

# 10. Comunicación con la API

## 10.1 Cliente HTTP

El cliente HTTP base vive en `shared/services/httpClient.js` y está construido sobre Axios.

| Responsabilidad | Detalle |
|---|---|
| Base URL | `/api/v1` |
| Credenciales | `withCredentials: true` para rutas privadas (`AD-37`) |
| Timeouts | Catálogo: 5 s; revalidación: 10 s; escrituras del panel: 10 s |
| Identificador de correlación | Agrega `X-Request-ID` en cada petición (`OA-09`) |
| Normalización de errores | Traduce errores de red y HTTP al formato `AD-16` |

## 10.2 Interceptores

**Petición:**
- Agrega credenciales de sesión en rutas privadas (cookie `HttpOnly`, `AD-37`).
- Agrega `X-Request-ID`.

**Respuesta:**
- Desenvuelve la respuesta de `AD-16` (`success/data/errors/meta`).
- Ante `401`, redirige a `/admin/login` y limpia el estado de sesión.
- Ante `403`, muestra mensaje de permisos insuficientes.
- Ante errores de red, traduce a un código uniforme para manejo en UI.

## 10.3 Retries

- **Sí:** errores de red en peticiones `GET` idempotentes (catálogo, detalle).
- **No:** `POST /cart/revalidate`, escrituras del panel, login/logout.

## 10.4 Estados de carga y error

| Estado | Qué se muestra |
|---|---|
| Cargando | Esqueleto con la forma del contenido final. |
| Vacío | Mensaje explicativo y acción sugerida (`RF-14`). |
| Error recuperable | Mensaje en español + botón de reintento. |
| Error no recuperable | Límite de error (`Error Boundary`) sin tumbar la app. |
| Sin conexión | Mensaje diferenciado; el carrito sigue disponible (`RN-81`). |

## 10.5 Traducción de errores

El frontend mantiene un catálogo de mensajes en español asociados a los códigos/reglas de la API (`AD-13`, `AD-16`). Por ejemplo:

| `rule` | Mensaje al usuario |
|---|---|
| `RN-31` | "El precio de oferta debe ser menor al precio de lista." |
| `RN-68` | "No se puede eliminar una marca con productos asociados." |

---

# 11. Carrito

## 11.1 Estado del carrito

El carrito vive en **LocalStorage** (`AD-06`, `RN-52`). Se gestiona mediante un store Zustand con persistencia.

### Estructura guardada

```json
{
  "format_version": 1,
  "content_version": 12,
  "last_modified_at": "2026-08-07T14:30:00Z",
  "items": [
    {
      "variant_id": 842,
      "quantity": 2,
      "snapshot": {
        "slug": "botin-nike-mercurial",
        "name": "Botín Nike Mercurial",
        "brand": "Nike",
        "size": "42",
        "thumbnail_url": "https://.../thumb.jpg",
        "list_price": 650000,
        "sale_price": 585000,
        "availability": "available"
      }
    }
  ]
}
```

| Campo | Propósito |
|---|---|
| `format_version` | Detecta cambios de esquema. Si no coincide, se descarta el carrito (`ES-04`). |
| `content_version` | Incrementa en cada modificación. Permite descartar respuestas obsoletas (`AD-22`). |
| `last_modified_at` | Fecha de última modificación. El carrito expira a 30 días (`RN-57`). |
| `variant_id` | Identidad del ítem (`AD-15`, `RN-53`). |
| `quantity` | Cantidad solicitada (`RN-54`). |
| `snapshot` | Copia de datos mostrables para renderizar sin red (`02_ARQUITECTURA.md` §13.2). |

## 11.2 Ciclo de vida

1. Se crea al agregar el primer ítem.
2. Cada modificación incrementa `content_version` y actualiza `last_modified_at`.
3. Expira a los 30 días de la última modificación (`RN-57`); se descarta informando al cliente.
4. Si `format_version` es desconocida, se descarta sin migrar (`02_ARQUITECTURA.md` §13.4).

## 11.3 Sincronización entre pestañas

- Se escucha el evento `storage` de `localStorage`.
- Si otra pestaña modifica el carrito, la pestaña actual actualiza su estado y su `content_version`.
- Esto evita discrepancias cuando el usuario tiene el carrito abierto en varias pestañas.

## 11.4 Revalidación

La revalidación ocurre en **dos momentos** (`RN-56`, `DN-10`):

1. **Al abrir el carrito.**
2. **Antes de generar el mensaje de WhatsApp.**

```javascript
// features/cart/hooks/useCartRevalidation.js
export function useCartRevalidation() {
  return useMutation({
    mutationFn: cartService.revalidate,
  });
}
```

### Reglas

- El cliente envía `variant_id` y `quantity`, nunca precios (`AD-36`).
- El servidor devuelve el estado autoritativo actual (`05_API.md` §8).
- Si `meta.cart_content_version` no coincide con la versión local, se descarta la respuesta y se vuelve a revalidar (`AD-22`).

## 11.5 Resolución de discrepancias

El cliente aplica la matriz de `AD-25`, gobernada por `AD-28`: **nada cambia sin que el cliente lo vea**.

| Estado de la API (`05_API.md` §8.4) | Acción del frontend |
|---|---|
| `ok` | Mantener ítem. |
| `product_hidden` | Eliminar e informar. |
| `product_deleted` | Eliminar e informar. |
| `variant_removed` | Eliminar y pedir nueva selección de talle. |
| `availability_changed` | Actualizar estado mostrado; permitir mantener (`RN-40`). |
| `price_changed` | Actualizar precio e informar. |
| `sale_ended` | Recalcular precio e informar. |

## 11.6 Confirmación antes de enviar

- Si la revalidación detecta cualquier discrepancia, el frontend **no genera el mensaje automáticamente** (`RN-77`, `RN-78`).
- El cliente debe confirmar el carrito actualizado.
- La confirmación no vuelve a revalidar (`02_ARQUITECTURA.md` §13.5).

## 11.7 Fallo de red en revalidación

Si la revalidación falla por red antes de enviar a WhatsApp (`AD-30`, `RN-81`):

- Se muestra advertencia: "Los precios y la disponibilidad podrían haber cambiado."
- Se ofrecen tres opciones: **Reintentar**, **Cancelar**, **Enviar igualmente**.

## 11.8 Generación del mensaje de WhatsApp

- El mensaje se construye en el frontend usando las plantillas de `store_settings` (`RN-59` a `RN-61`).
- El motor de plantillas es **sustitución de variables simple**, sin condicionales ni bucles (`PR-06`).
- Si un producto no tiene talle, se omite la etiqueta y su valor juntos (`02_ARQUITECTURA.md` §13.9).
- Se valida la longitud del cuerpo del mensaje antes de generar el enlace (`RN-76`, `DN-17`).
- Si se supera el límite, se advierte al usuario y no se abre WhatsApp.

## 11.9 Apertura de WhatsApp

- Se construye el enlace `https://wa.me/{numero}?text={mensaje_codificado}` (`RN-62`).
- Se abre en app o web según el dispositivo.
- El sistema nunca envía el mensaje; el cliente confirma el envío desde WhatsApp (`RN-62`).

## 11.10 Código de consulta

- Se genera en el cliente con formato `PS-XXXXX` (`RN-64`).
- Se incluye en el mensaje de WhatsApp como referencia de conversación.
- No se almacena en el servidor (`RN-63`).

---

# 12. Componentes reutilizables iniciales

## 12.1 Componentes del catálogo

| Componente | Feature | Descripción |
|---|---|---|
| `ProductCard` | `catalog` o `shared` | Tarjeta de producto para listados. |
| `ProductGrid` | `catalog` | Grilla responsiva de productos. |
| `ProductGallery` | `products` | Galería de imágenes con imagen principal. |
| `VariantSelector` | `products` | Selector de talle. |
| `FiltersPanel` | `catalog` | Panel de filtros con facetas. |
| `SearchBar` | `catalog` | Barra de búsqueda que actualiza `/catalogo?q=...` |
| `Pagination` | `catalog` o `shared` | Paginación por desplazamiento. |
| `Price` | `shared` | Muestra precio de lista, oferta y descuento. |
| `AvailabilityBadge` | `shared` | Traduce `availability` a etiqueta visual. |
| `Banner` | `store` o `shared` | Banner del home. |

## 12.2 Componentes del panel

| Componente | Feature | Descripción |
|---|---|---|
| `DataTable` | `admin` o `shared` | Tabla con búsqueda, filtros y paginación. |
| `AdminLayout` | `admin` | Layout con navegación lateral. |
| `FormField` | `admin` o `shared` | Campo de formulario con error. |
| `ImageUploader` | `admin` | Subida y preview de imágenes. |
| `ConfirmDialog` | `shared` | Diálogo de confirmación para eliminaciones. |

## 12.3 Regla de promoción a shared/

> Un componente se promueve a `shared/components/` **solo cuando lo usan dos o más features** (`DEP-12`). Hasta entonces vive en el feature que lo creó.

---

# 13. Accesibilidad

## 13.1 Objetivo

Cumplir con los principios básicos de accesibilidad web sin comprometer la experiencia mobile-first.

## 13.2 Requisitos

| Área | Requisito |
|---|---|
| **Teclado** | Todos los elementos interactivos son alcanzables y accionables con teclado. |
| **Foco** | El foco es visible y sigue un orden lógico. |
| **ARIA** | Uso correcto de roles, estados y propiedades en componentes interactivos (botones, modales, tabs, acordeones). |
| **Contraste** | Cumplimiento mínimo WCAG 2.1 AA para texto e iconos. |
| **Lectores de pantalla** | Imágenes con `alt` descriptivo (`RN-22`), estados anunciados, mensajes de error asociados a campos. |
| **Reducir movimiento** | Respetar `prefers-reduced-motion` en animaciones. |

## 13.3 Aplicación práctica

- Los filtros son navegables por teclado y anuncian cambios.
- La galería de producto tiene controles accesibles.
- Los formularios del panel usan etiquetas explícitas y mensajes de error vinculados.
- Los mensajes de notificación usan `aria-live`.

---

# 14. Rendimiento

## 14.1 Presupuesto

| Métrica | Objetivo | Origen |
|---|---|---|
| LCP | < 2,5 s en 4G | `RNF-01` |
| Respuestas de API de catálogo | < 300 ms (p95) | `RNF-02` |
| JavaScript inicial de ruta pública | Mínimo necesario para primera pantalla | `02_ARQUITECTURA.md` §8.10 |
| Código del panel en paquete público | Cero | `02_ARQUITECTURA.md` §8.10 |

## 14.2 Técnicas

| Técnica | Aplicación |
|---|---|
| **Code splitting por ruta** | Panel y rutas secundarias cargan de forma diferida. |
| **Carga diferida de imágenes** | `loading="lazy"` para imágenes fuera de la primera pantalla (`RNF-03`). |
| **Imágenes adaptativas** | `srcset` con los tamaños derivados del backend (`RF-33`). |
| **Reserva de espacio** | Toda imagen declara su proporción antes de cargar. |
| **Memoización** | **Solo cuando se mide.** No se memoiza por defecto (`02_ARQUITECTURA.md` §8.10). |
| **Virtualización** | **No en v1.** La paginación acota el tamaño de las listas. Punto de extensión. |

## 14.3 Regla sobre memoización

> No se memoiza por defecto. Se memoiza cuando hay una medición que lo justifique y un comentario que indique qué se midió.

---

# 15. Error Boundaries

## 15.1 Decisión

Se usan **React Error Boundaries** para limitar el impacto de errores de renderizado.

## 15.2 Ubicación

| Nivel | Ubicación | Propósito |
|---|---|---|
| Raíz | `app/ErrorBoundary.jsx` | Captura errores no atrapados en otra parte; muestra fallback genérico. |
| Sección carrito | Dentro de `/carrito` | Un error en el carrito no tumba la app. |
| Sección panel | Dentro de `/admin/*` | Un error en una pantalla del panel no tumba el resto. |
| Sección producto | Dentro de `/producto/:slug` | Un error en la galería no tumba toda la ficha. |

## 15.3 Comportamiento

- Muestran un mensaje amigable en español.
- Incluyen el `request_id` si está disponible (`OA-09`).
- Ofrecen acción de reintentar cuando tiene sentido.
- **No capturan errores de la API:** esos se manejan en los hooks de consulta.

---

# 16. React Suspense

## 16.1 Decisión

**React Suspense se usa en v1 únicamente para code splitting de rutas (lazy loading).**

## 16.2 Uso permitido

- Envolver rutas cargadas con `React.lazy()` y `Suspense` para mostrar un fallback mientras se descarga el chunk.
- El fallback debe ser un esqueleto coherente con la sección que se carga.

## 16.3 Uso explícitamente no permitido en v1

- **No se usa Suspense para manejo de datos asíncronos.** TanStack Query ya gestiona estados de carga/error mediante `isLoading` / `isError`.
- **No se usa Suspense para componentes individuales** salvo que formen parte de una ruta diferida.

## 16.4 Justificación

Evitar la complejidad adicional de integrar Suspense con TanStack Query en v1. La arquitectura no se cierra a usar Suspense para datos en el futuro, pero en v1 se limita a code splitting.

---

# 17. SEO

## 17.1 Estrategia

`AD-09` y `02_ARQUITECTURA.md` §8.9: renderizado del lado del cliente para personas; metadatos pre-renderizados para rastreadores.

## 17.2 Responsabilidad del frontend

- Nginx detecta agentes de rastreadores y deriva a endpoints `/_seo/*` del backend (`05_API.md` §6).
- El frontend React no genera el HTML para bots.
- El frontend sí debe:
  - Actualizar el `<title>` y las metaetiquetas dinámicamente para Google (que ejecuta JavaScript).
  - Gestionar etiquetas canónicas.
  - Asegurar que las URL sean limpias y estables (`AD-19`, `RN-10`).

## 17.3 Indexabilidad

| URL | Indexable | Canónica |
|---|---|---|
| `/` | Sí | Sí misma |
| `/catalogo` | Sí | Sí misma |
| `/producto/:slug` | Sí | Sí misma |
| `/catalogo?brand=...&size=...` | No | `/catalogo` |
| `/catalogo?pagina=2` | No | `/catalogo` |
| `/carrito`, `/admin/*` | No | — |

## 17.4 Datos estructurados

El backend genera datos estructurados (`Schema.org/Product`) en los endpoints `/_seo/*`. El frontend no los genera.

---

# 18. Responsive

## 18.1 Enfoque

**Mobile First.** El diseño parte del dispositivo móvil y escala hacia escritorio.

## 18.2 Uso de Bootstrap y CSS Modules

| Capa | Tecnología | Uso |
|---|---|---|
| **Grid y layout** | Bootstrap | Sistema de grid responsivo, contenedores, filas y columnas. |
| **Utilidades** | Bootstrap | Espaciado, tipografía, colores, flexbox, visibilidad. |
| **Componentes genéricos** | Bootstrap | Botones, formularios, modales, navegación base. |
| **Componentes específicos** | CSS Modules | `ProductCard`, `ProductGallery`, `FiltersPanel`, `Price`, etc. |
| **Aislamiento necesario** | CSS Modules | Cuando Bootstrap no cubre o cuando los estilos son propios del componente. |

## 18.3 Regla para evitar duplicidad

> **Usar Bootstrap por defecto.** Recurrir a CSS Modules solo cuando:
> - Bootstrap no proporciona el patrón necesario.
> - Se requiere aislamiento para evitar colisiones de clases.
> - El componente tiene estados visuales complejos no cubiertos por utilidades.

## 18.4 Breakpoints

Se usan los breakpoints de Bootstrap 5.3:

| Breakpoint | Ancho |
|---|---|
| `xs` | < 576 px |
| `sm` | ≥ 576 px |
| `md` | ≥ 768 px |
| `lg` | ≥ 992 px |
| `xl` | ≥ 1200 px |
| `xxl` | ≥ 1400 px |

## 18.5 Prioridades

1. Primera pantalla del catálogo visible y usable en móvil.
2. Filtros accesibles mediante un panel lateral o drawer en móvil.
3. Ficha de producto con galería táctil y selectores de variante grandes.
4. Panel administrativo optimizado para escritorio, pero funcional en tablet.

---

# 19. Testing Frontend

## 19.1 Estrategia general

El detalle de la estrategia de pruebas vive en `11_TESTING.md`. Este documento define los **flujos críticos del frontend que deben ser probados**.

## 19.2 Flujos críticos

| Flujo | Qué validar |
|---|---|
| Navegación de catálogo | Filtros, búsqueda, ordenamiento, paginación, facetas. |
| Ficha de producto | Selección de variante, galería, precios, disponibilidad. |
| Carrito | Agregar, modificar cantidad, eliminar, revalidación, mensaje de WhatsApp. |
| Revalidación | Discrepancias de precio, disponibilidad, producto oculto, variante eliminada. |
| Panel admin | CRUD de productos, marcas, categorías, promociones, banners. |
| Autenticación | Login, logout, expiración de sesión, guards de rutas. |
| Errores | Manejo de 404, 401, 422, 409, errores de red. |

## 19.3 Tipos de prueba

| Tipo | Alcance en frontend |
|---|---|
| Unitarias | Funciones puras, formatters, utilidades, hooks simples. |
| Componentes | Renderizado, interacciones básicas, estados de carga/error. |
| Integración | Flujos de catálogo, carrito, panel. |
| E2E | Flujo completo de consulta por WhatsApp. |

## 19.4 Qué no se prueba en el frontend

- Reglas de negocio que corresponden al backend.
- Duplicación de validaciones del backend como única defensa.
- Lógica de precios que el backend ya calcula.

---

# 20. Dependencias y documentos relacionados

| Documento | Relación |
|---|---|
| `07_PANEL_ADMIN.md` | Detalla el diseño de pantallas del panel. Este documento define la estructura y componentes base. |
| `08_UI_SYSTEM.md` | Define el sistema de diseño visual (colores, tipografía, espaciado). |
| `09_COMPONENTES.md` | Inventario detallado de componentes reutilizables. |
| `11_TESTING.md` | Estrategia completa de pruebas del frontend y backend. |
| `99_AI_DEVELOPMENT_GUIDE.md` | Guía operativa de implementación; depende de este documento. |

---

# 21. Trazabilidad

## 21.1 Decisiones arquitectónicas aplicadas

| Decisión | Sección de aplicación |
|---|---|
| `AD-01` | §4.2 (SPA React) |
| `AD-03` | §4.1 (frontend no decide reglas de negocio) |
| `AD-06` | §11 (carrito en LocalStorage) |
| `AD-07` | §5.2, §9 (resolución mediante Zustand, TanStack Query y hooks propios) |
| `AD-08` | §6, §7 (organización por features) |
| `AD-09` | §17 (SEO) |
| `AD-12` | §4.1 (DTOs, no modelos) |
| `AD-13` / `AD-16` | §10.5 (traducción de errores) |
| `AD-15` | §11.1 (carrito guarda `variant_id`) |
| `AD-19` | §8 (rutas con slug) |
| `AD-22` | §11.1, §11.4 (versión de contenido del carrito) |
| `AD-23` | §8.3 (filtros por slug) |
| `AD-25` / `AD-28` | §11.5 (resolución de discrepancias) |
| `AD-30` | §11.7 (fallo de red) |
| `AD-31` | §12.1 (paginación) |
| `AD-32` | §11.4 (revalidación por POST) |
| `AD-36` | §11.4 (cliente envía identidades) |
| `AD-37` | §10.1 (cookie `HttpOnly`) |

## 21.2 Reglas de negocio aplicadas

| Regla | Sección de aplicación |
|---|---|
| `RN-10` | §8 (slug en rutas) |
| `RN-14`, `RN-16` | §12.1 (selectores de variante) |
| `RN-20` | §12.1 (`ProductGallery`, `ProductCard`) |
| `RN-22` | §13.2 (alt text) |
| `RN-38` | §12.1 (`AvailabilityBadge`) |
| `RN-40` | §11.5 (producto sin stock se mantiene) |
| `RN-47` | §12.1 (`FiltersPanel` con facetas) |
| `RN-52` | §11.1 (LocalStorage) |
| `RN-54` | §11.1 (cantidad en carrito) |
| `RN-55` | §11.1 (total calculado en cliente) |
| `RN-56` | §11.4 (dos momentos de revalidación) |
| `RN-57` | §11.2 (expiración a 30 días) |
| `RN-59` a `RN-61` | §11.8 (plantillas de WhatsApp) |
| `RN-62` | §11.9 (enlace wa.me) |
| `RN-63` | §11.1 (sin identidad de cliente) |
| `RN-64` | §11.10 (código PS-XXXXX) |
| `RN-66`, `RN-67` | §8.2 (rutas protegidas) |
| `RN-75` | §11.4 (límite de 26 ítems) |
| `RN-76` | §11.8 (control de longitud del mensaje) |
| `RN-77`, `RN-78` | §11.6 (confirmación ante discrepancias) |
| `RN-81` | §10.4, §11.7 (sin conexión) |
| `RF-06` | §9.2, §12.1 (filtros en URL) |
| `RF-14` | §10.4 (estado vacío) |
| `RNF-01` | §14 (rendimiento) |
| `RNF-02` | §14 (tiempos de API) |
| `RNF-03` | §14 (lazy loading de imágenes) |
| `RNF-13` | §8.2, §17 (panel no indexable) |

---

# 22. Historial de Cambios

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| **1.0.0** | 07/08/2026 | ✅ **APROBADO** | Frontend completo: filosofía, stack, features, organización, routing, gestión de estado (resolución de `AD-07` / `ADP-01`), comunicación con API, carrito, componentes, accesibilidad, rendimiento, Error Boundaries, Suspense, SEO, responsive y testing. Aplicados ajustes aprobados: acceso a TanStack Query/Zustand solo por hooks propios, React Hook Form + Zod Resolver, delimitación Bootstrap/CSS Modules, listado definitivo de features previo a la arquitectura, decisión sobre Error Boundaries y uso explícito de Suspense solo para code splitting. |

---
