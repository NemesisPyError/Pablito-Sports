# 07_PANEL_ADMIN.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Panel Administrativo |
| **Código** | 07 |
| **Versión** | 1.18.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 22/09/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07.0_PANEL_ADMIN_ANALISIS_PREVIO.md](07.0_PANEL_ADMIN_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `08_UI_SYSTEM.md`, `09_COMPONENTES.md`, `11_TESTING.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Definir el **diseño funcional y de interacción del panel administrativo** de Pablito Sports: módulos, permisos, navegación, estados visuales, operaciones críticas, componentes reutilizables y mapeo completo a los endpoints de `05_API.md`.

Este documento **materializa** los casos de uso `CU-A-01` a `CU-A-28`, los requisitos `RF-27` a `RF-42` y las decisiones arquitectónicas aprobadas en `02_ARQUITECTURA.md` y `02.1_DECISIONES_ARQUITECTONICAS.md`.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Módulos del panel y trazabilidad con casos de uso | — |
| Matriz de permisos por módulo, acción y pantalla | — |
| Layout base del panel (`AdminLayout`) | — |
| Estados visuales unificados | — |
| Operaciones que requieren confirmación | — |
| Árbol de navegación y rutas del panel | `06_FRONTEND.md` §8.2 |
| Componentes reutilizables iniciales | `09_COMPONENTES.md` |
| Mapeo pantalla → endpoint | `05_API.md` |
| Sistema de diseño visual detallado | `08_UI_SYSTEM.md` |
| Casos de prueba del panel | `11_TESTING.md` |

## 2.3 Regla del Freeze

Este documento no introduce nuevas reglas de negocio `RN-xx` ni decisiones arquitectónicas `AD-xx`. Si durante la redacción surgiera la necesidad de una nueva regla o decisión, se registra como pendiente y se eleva antes de continuar.

---

# 3. Alcance

## 3.1 Incluye

- Layout base del panel (`AdminLayout`).
- Inventario de módulos y submódulos.
- Matriz de permisos por acción y por pantalla.
- Estados visuales unificados para todos los CRUD.
- Operaciones críticas con confirmación explícita.
- Árbol de navegación.
- Componentes reutilizables iniciales.
- Mapeo completo de pantallas a endpoints de `05_API.md`.
- Especificación funcional de las pantallas principales.
- Consideraciones de accesibilidad, rendimiento y testing.

## 3.2 No incluye

- Lógica de negocio del backend → `01_ANALISIS_NEGOCIO.md`, `02_ARQUITECTURA.md`.
- Contratos de API → `05_API.md`.
- Filosofía general del frontend, routing público o gestión del carrito → `06_FRONTEND.md`.
- Especificación detallada de cada componente → `09_COMPONENTES.md`.
- Sistema de diseño visual completo (colores, tipografía, espaciado) → `08_UI_SYSTEM.md`.
- Casos de prueba detallados → `11_TESTING.md`.

## 3.3 Fuera de alcance de la v1

- Reportes gráficos o analítica avanzada en el dashboard.
- Exportación de datos (CSV, Excel, PDF).
- Gestión de múltiples sucursales o inventario por depósito.
- Notificaciones push o en tiempo real dentro del panel.
- Personalización de roles más allá de Administrador y Superadministrador.

---

# 4. Principios y decisiones

## 4.1 Principios del panel

| # | Principio | Origen |
|---|---|---|
| 1 | **El panel nunca accede directamente al modelo de datos.** Toda interacción ocurre exclusivamente mediante `05_API.md`. | PAD-01 |
| 2 | **La autorización real la impone el backend en cada endpoint.** La guarda de ruta del frontend es solo una conveniencia de interfaz. | `PA-06`, `06_FRONTEND.md` §8.3 |
| 3 | **Todos los CRUD comparten estados visuales y patrones de interacción.** | `RNF-07`, `RNF-09` |
| 4 | **Las operaciones destructivas o de alto impacto requieren confirmación explícita.** | `RNF-09`, `RN-69`, `RN-71`, `RN-72` |
| 5 | **El panel se organiza por dominio, no por tipo de archivo.** | `AD-08` |
| 6 | **Mobile-first también aplica al panel**, aunque el uso principal será en escritorio. | `RNF-06` |

## 4.2 Decisiones aprobadas

### PAD-01 — El panel accede exclusivamente por API

| Campo | Valor |
|---|---|
| **Identificador** | PAD-01 |
| **Título** | El panel administrativo nunca accede directamente al modelo de datos |
| **Estado** | ✅ Aprobado |
| **Contexto** | `04_BASE_DATOS.md`, `05_API.md`, `06_FRONTEND.md` y `07_PANEL_ADMIN.md` deben mantener una cadena de dependencia unidireccional. Un atajo del panel a la base de datos rompería la separación de capas aprobada en `AD-02` y `AD-03`. |
| **Decisión** | Toda lectura, escritura, validación o transformación de datos del panel pasa por los endpoints de `05_API.md`. El frontend consume DTOs, nunca modelos de base de datos. |
| **Consecuencias** | El panel puede evolucionar sin conocer el esquema físico. Cualquier cambio en la base de datos se materializa en la API antes de llegar al panel. |
| **Documentos afectados** | `04_BASE_DATOS.md`, `05_API.md`, `06_FRONTEND.md`, `07_PANEL_ADMIN.md` |

## 4.3 Resolución de pendientes del análisis previo

| ID | Descripción | Resolución en v1.0.0 |
|---|---|---|
| `PADP-01` | ¿El dashboard incluye gráficos o solo métricas? | **Solo tarjetas de métricas y alertas.** No se incluyen gráficos en v1. |
| `PADP-02` | ¿Productos eliminados como filtro o pantalla aparte? | **Revertida (v1.14.0, 02/09/2026, pedido del usuario):** el panel no expone los productos eliminados ni permite restaurarlos. La eliminación es un borrado lógico (`AD-18`) sin vuelta atrás desde el panel. |
| `PADP-03` | ¿Historial de precios solo como pantalla o también en ficha de producto? | **Ambas:** widget de últimos cambios en la ficha de producto y pantalla completa con filtros. |

---

# 5. Layout del panel

## 5.1 Estructura base de `AdminLayout`

Todo el panel se renderiza dentro de un único layout compartido:

```text
AdminLayout
│
├── Sidebar                 # Navegación principal; colapsable en móvil
├── Header                  # Título de página, usuario actual, acciones globales
├── Breadcrumb              # Migas de pan con ruta actual
├── MainContent             # Área de renderizado de la pantalla activa
├── ToastContainer          # Notificaciones temporales
└── ModalProvider           # Contenedor de diálogos modales
```

> **v1.12.3 — rediseño visual del panel** (pedido explícito del usuario,
> sobre una referencia de composición): sidebar oscura con los mismos
> tokens que ya usa el catálogo público (`--color-surface-inverse`,
> acento `--color-volt-500`), tarjetas con borde suave y sombra sutil,
> iconografía SVG en línea (`AdminIcon`, sin librería) en vez de los
> glifos Unicode que tenía la sidebar. **Ninguna región, ruta, permiso ni
> comportamiento cambió** — es exclusivamente CSS y composición sobre las
> mismas ocho secciones de la sidebar y las mismas tres piezas del header.

## 5.2 Responsabilidad de cada región

| Región | Responsabilidad | No debe |
|---|---|---|
| **Sidebar** | Mostrar menú de navegación, indicar ruta activa, respetar permisos de rol. | Ejecutar lógica de negocio ni cargar datos de pantallas. |
| **Header** | Mostrar título contextual, usuario autenticado, logout, notificaciones globales. | Contener navegación profunda del dominio. |
| **Breadcrumb** | Reflejar la ruta actual con enlaces navegables. | Reemplazar al menú principal. |
| **MainContent** | Renderizar la pantalla activa con sus propios estados de carga y error. | Acumular estado de otras pantallas. |
| **ToastContainer** | Mostrar feedback de éxito, error o advertencia tras mutaciones. | Bloquear la interfaz. |
| **ModalProvider** | Montar diálogos de confirmación y formularios emergentes. | Contener lógica propia de dominio. |

## 5.3 Comportamiento responsive

| Viewport | Comportamiento |
|---|---|
| **Escritorio** | Sidebar fija a la izquierda; MainContent ocupa el resto. |
| **Tablet** | Sidebar colapsable a íconos; toggle en Header. |
| **Móvil** | Sidebar como drawer deslizable; Breadcrumb simplificado. |

---

# 6. Autenticación y sesión

## 6.1 Flujo de acceso

| Paso | Pantalla | Endpoint | Notas |
|---|---|---|---|
| 1 | `/admin/login` | — | Formulario de usuario y contraseña. |
| 2 | Enviar credenciales | `POST /api/v1/admin/auth/login` | Cookie `HttpOnly` (`AD-37`). |
| 3 | Redirección | — | Si éxito, a `/admin`; si error, mensaje genérico de credenciales inválidas. |
| 4 | Verificar sesión | `GET /api/v1/admin/auth/me` | En cada carga del panel; determina rol y permisos. |
| 5 | Cerrar sesión | `POST /api/v1/admin/auth/logout` | Limpia cookie y estado de sesión; redirige a `/admin/login`. |

## 6.2 Reglas de sesión

- La sesión se transporta en cookie `HttpOnly` y exclusiva de HTTPS (`AD-37`).
- El frontend no almacena token ni password en ningún estado persistente.
- Ante `401` en cualquier endpoint privado, se redirige a `/admin/login`.
- Ante `403`, se muestra el estado visual **Sin permisos**.
- La inactividad puede cerrar sesión por parte del backend; el frontend la maneja como `401` (`RF-28`).

---

# 7. Inventario de módulos

## 7.1 Módulos principales

| Módulo | Tipo | Casos de uso | Descripción |
|---|---|---|---|
| **Dashboard** | Visualización | CU-A-03 | Resumen del catálogo y alertas de productos incompletos. |
| **Productos** | CRUD | CU-A-04 a CU-A-12 | Gestión completa del catálogo. |
| **Variantes** | Submódulo de Productos | Derivado de CU-A-04 / CU-A-05 | Vista diagnóstica, carga de cantidad real (v1.4.0, `RN-38b`), registro de ventas con descuento automático (v1.8.0, `RN-82`) y eliminación manual de variantes. |
| **Imágenes** | Submódulo de Productos | CU-A-13, CU-A-14 | Galería, reordenamiento y definición de imagen principal. |
| **Categorías** | CRUD | CU-A-16 | Jerarquía de dos niveles. Sexos por categoría (`RN-83`). |
| **Marcas** | CRUD | CU-A-15 | ABM de marcas; desde v1.1.0 incluye logotipo, frase, orden en portada y collage. |
| **Collage de marca** | Submódulo de Marcas | Derivado de CU-A-15 (v1.1.0) | Carga, reordenamiento y baja de las imágenes del bloque de portada. |
| **Deportes** | CRUD | CU-A-17 | ABM de deportes. |
| **Talles** | CRUD | CU-A-20 | ABM de talles; tipos de talle de solo lectura. |
| **Promociones** | CRUD | CU-A-21 | Promociones por producto, categoría o marca. |
| **Banners** | CRUD | CU-A-22 | Piezas gráficas de la portada. Desde v1.1.0 cada pieza declara su zona: hero, novedades o promociones. **v1.10.0:** la zona "novedades" (`placement="news"`) ya no tiene consumidor público — la Home la reemplazó por la selección editorial de productos (§14.2, "Agregar a Novedades"). El CRUD y la zona siguen existiendo en el panel por si se reutilizan más adelante; no se retira nada. |
| **Configuración** | Formulario | CU-A-23 | Datos globales de la tienda; desde v1.1.0 incluye correo e historia con su foto. |
| **Usuarios** | CRUD | CU-A-26 | Gestión de administradores; solo Superadministrador. |
| **Auditoría** | Solo lectura | Habilitado por AD-20 | Registro inmutable de escrituras. |
| **Plantilla WhatsApp** | Formulario | CU-A-24, CU-A-25 | Edición completa del mensaje y del ítem, con listado de variables, vista previa y restauración a la plantilla por defecto (`RF-41`). |
| **Historial de precios** | Solo lectura | CU-A-28 | Registro inmutable de cambios de precio. |

> **Nota (v1.5.0):** v1.4.0 había retirado este módulo del panel el mismo
> día en que se agregó, a pedido del usuario. El barrido de QA funcional
> posterior encontró que la pantalla de Configuración seguía anunciando y
> enlazando «Editar plantilla» hacia una ruta que ya no existía —un enlace
> muerto que redirigía en silencio al Dashboard—, y el usuario pidió
> reincorporar el módulo en vez de quitar el enlace. Ver §13.12, §14.8 y el
> historial de cambios.
>
> **Nota (v1.6.0):** el usuario volvió a pedir sacar **Plantilla WhatsApp**
> y **Configuración** del menú del panel, en la misma tanda del rediseño
> visual de la Home. A diferencia de v1.4.0, esta vez el código de ambas
> pantallas **no se elimina** — solo dejan de tener entrada de sidebar y
> ruta en `AdminRoutes.jsx` — porque Configuración sigue siendo la única
> pantalla capaz de cargar WhatsApp, horarios, dirección y la foto/texto de
> "Nuestra historia", que la Home necesita para dejar de tener secciones
> ocultas. Sin eso resuelto, ambas quedan reversibles a propósito. También
> se retira del menú **Datos del sistema** (no forma parte de este
> inventario formal; es la pantalla de solo lectura de sexos y tipos de
> talle).
>
> **Nota (09/09/2026):** **Configuración** vuelve al menú y a
> `AdminRoutes.jsx` (`/admin/settings`). La retirada de v1.6.0 dejó un efecto
> que no se había previsto: al ser la única pantalla que edita dirección,
> horarios, WhatsApp, redes y el texto y la foto de "Nuestra historia", esos
> contenidos quedaron sin forma de administrarse desde el panel — solo
> escribiendo en la base a mano. El usuario lo detectó por el camino más
> directo: la página pública "Nosotros" invitaba a editarla «desde
> Configuración → Nuestra historia», y esa entrada no existía. El código
> seguía intacto, tal como v1.6.0 lo había dejado a propósito, así que la
> reincorporación fue solo volver a conectar ruta e ítem de sidebar.
> **Plantilla WhatsApp** y **Datos del sistema** siguen fuera del menú: no
> se reincorporan porque nadie las pidió, y Configuración ya no enlaza a la
> primera (el enlace se quitó en v1.6.0, así que no queda ninguno muerto).

## 7.2 Entidades no administrables

| Entidad | Origen | Cómo se presentan en el panel |
|---|---|---|
| **Sexo** | `RN-09`, v2.5.0 | Casillas en la ficha de producto (v1.11.0: un producto admite varios sexos a la vez, era un selector de uno solo); sin pantalla propia. |
| **Tipo de talle** | v2.5.0 | Selector/filtro en el módulo Talles; sin ABM. |

---

# 8. Matriz de permisos

## 8.1 Por módulo y acción

| Módulo | Acción | Administrador | Superadministrador | Restricciones |
|---|---|:---:|:---:|---|
| **Dashboard** | Ver | ✅ | ✅ | — |
| **Productos** | Listar | ✅ | ✅ | — |
| | Crear | ✅ | ✅ | — |
| | Editar | ✅ | ✅ | — |
| | Activar / Desactivar | ✅ | ✅ | — |
| | Agregar / Quitar de Novedades (v1.10.0) | ✅ | ✅ | — |
| | Eliminar (lógico) | ✅ | ✅ | `RN-69` |
| | Restaurar | ✅ | ✅ | — |
| | Cambiar precio | ✅ | ✅ | `RN-70` |
| **Variantes** | Ver | ✅ | ✅ | Submódulo de producto |
| | Eliminar | ✅ | ✅ | Soft delete |
| **Imágenes** | Subir / Reordenar / Principal / Eliminar | ✅ | ✅ | `RN-19`, `RN-20`, `RN-22` |
| **Categorías** | CRUD completo | ✅ | ✅ | `RN-68` |
| **Marcas** | CRUD completo | ✅ | ✅ | `RN-68` |
| **Deportes** | CRUD completo | ✅ | ✅ | `RN-68` |
| **Talles** | CRUD completo | ✅ | ✅ | `RN-68` |
| **Promociones** | CRUD completo | ✅ | ✅ | `RN-36` |
| **Banners** | CRUD completo | ✅ | ✅ | `RN-73`, `RN-74` |
| **Configuración** | Editar | ✅ | ✅ | — |
| **Usuarios** | Listar | ❌ | ✅ | `RN-67` |
| | Crear | ❌ | ✅ | `RN-67` |
| | Editar | ❌ | ✅ | `RN-67` |
| | Eliminar | ❌ | ✅ | `RN-71`, `RN-72` |
| | Cambiar contraseña propia | ✅ | ✅ | `CU-A-27` |
| | Cambiar contraseña de otro | ❌ | ✅ | `05_API.md` §9.14 |
| **Auditoría** | Consultar | ✅ | ✅ | Solo lectura |
| **Historial de precios** | Consultar | ✅ | ✅ | Solo lectura |

## 8.2 Por pantalla

| Pantalla | Ruta | Permiso requerido | Rol mínimo |
|---|---|---|---|
| Login | `/admin/login` | `anonymous` | Anónimo |
| Dashboard | `/admin` | `authenticated_admin` | Administrador |
| Listado de productos | `/admin/productos` | `manage_products` | Administrador |
| Crear producto | `/admin/productos/nuevo` | `manage_products` | Administrador |
| Editar producto | `/admin/productos/:id` | `manage_products` | Administrador |
| Categorías | `/admin/categorias` | `manage_categories` | Administrador |
| Marcas | `/admin/marcas` | `manage_brands` | Administrador |
| Deportes | `/admin/deportes` | `manage_sports` | Administrador |
| Talles | `/admin/talles` | `manage_sizes` | Administrador |
| Promociones | `/admin/promociones` | `manage_promotions` | Administrador |
| Banners | `/admin/banners` | `manage_banners` | Administrador |
| Configuración | `/admin/configuracion` | `manage_store_settings` | Administrador |
| Usuarios | `/admin/usuarios` | `super_administrator` | Superadministrador |
| Mi cuenta | `/admin/cuenta` | `authenticated_admin` | Administrador |
| Auditoría | `/admin/auditoria` | `view_audit_logs` | Administrador |
| Historial de precios | `/admin/historial-precios` | `view_price_history` | Administrador |

### Notas sobre los permisos

- Los permisos del frontend son **conveniencias de interfaz** para ocultar/enrutar.
- El backend impone la autorización real en cada endpoint (`PA-06`).
- Un Administrador no ve el ítem "Usuarios" en el Sidebar.
- Si un Administrador accede manualmente a `/admin/usuarios`, el backend devuelve `403` y el frontend muestra **Sin permisos**.
- **Rutas implementadas en inglés** (el código quedó así desde v1.0.0): `/admin/users` y `/admin/account`. Las rutas en español de esta tabla son las del diseño original; la implementación no las siguió y se documentan aquí como referencia histórica.
- **Mi cuenta** (`/admin/account`) la alcanza cualquier administrador autenticado: es donde cambia su propia contraseña (`CU-A-27`), lo único de la matriz de "Usuarios" abierto a ambos roles.

---

# 9. Estados visuales unificados

## 9.1 Estados obligatorios

| Estado | Cuándo ocurre | Qué mostrar |
|---|---|---|
| **Vacío** | La entidad no tiene registros. | Ilustración ligera + mensaje + CTA principal ("Crear primer ..."). |
| **Cargando** | Primera carga o recarga de datos del servidor. | Esqueleto con la forma del contenido final; nunca un spinner genérico a pantalla completa. |
| **Error** | Fallo de red o error 5xx. | Mensaje no técnico + botón de reintentar + enlace al dashboard. |
| **Sin permisos** | Usuario sin rol suficiente. | Mensaje claro de permisos insuficientes + enlace al dashboard. |
| **Sin resultados** | Filtros aplicados no devuelven registros. | Mensaje + botón para limpiar filtros. |
| **Éxito** | Operación de escritura completada. | Toast breve; actualización de lista o redirección. |
| **Confirmación** | Operación crítica solicitada. | Modal con consecuencia explícita y acciones Confirmar/Cancelar. |

## 9.2 Aplicación por tipo de pantalla

| Tipo | Estados obligatorios |
|---|---|
| **Listado** | Vacío, Cargando, Error, Sin resultados, Éxito (tras mutación). |
| **Formulario** | Cargando (solo en edición), Error, Éxito, Confirmación (al abandonar con cambios). |
| **Detalle / Vista previa** | Cargando, Error, Sin permisos. |
| **Dashboard** | Cargando, Error. |

---

# 10. Operaciones críticas

Toda operación de esta tabla requiere un `ConfirmDialog` antes de ejecutarse.

| Operación | Módulo / Pantalla | Consecuencia | Detalle del modal |
|---|---|---|---|
| Eliminar producto | Productos | Soft delete (`RN-69`). No es reversible desde el panel. | "El producto **{nombre}** se eliminará del catálogo. Esta acción no se puede deshacer desde el panel." |
| Eliminar variante | Ficha de producto → Variantes | El talle desaparece. | "La variante **{talle}** será eliminada." |
| Cargar cantidad de variante | Ficha de producto → Variantes | Recalcula la disponibilidad del producto (v1.4.0). | No requiere confirmación: no es destructiva. |
| Registrar venta de variante | Ficha de producto → Variantes | Descuenta `quantity` y recalcula disponibilidad (v1.8.0, `RN-82`). | No usa `ConfirmDialog`: el formulario inline de "Registrar venta" ya exige un paso explícito ("Confirmar") separado del botón que lo abre, y el servidor rechaza con `409` si la cantidad supera el stock cargado. |
| Eliminar imagen | Ficha de producto → Imágenes | Soft delete de la fila. | "La imagen será eliminada." |
| Eliminar categoría | Categorías | Solo si no tiene productos ni subcategorías. | "La categoría **{nombre}** será eliminada." |
| Eliminar marca | Marcas | Solo si no tiene productos. | "La marca **{nombre}** será eliminada." |
| Eliminar deporte | Deportes | Solo si no tiene productos. | "El deporte **{nombre}** será eliminado." |
| Eliminar talle | Talles | Solo si no tiene productos ni variantes. | "El talle **{nombre}** será eliminado." |
| Eliminar promoción | Promociones | Deja de aplicar. | "La promoción **{nombre}** será eliminada." |
| Restaurar promoción | Promociones (filtrado eliminadas) | Vuelve a aplicar si está vigente. | "La promoción **{nombre}** será restaurada." |
| Eliminar banner | Banners | Deja de mostrarse. | "El banner **{nombre}** será eliminado." |
| Cambiar contraseña propia | Perfil / Usuarios | Invalida sesiones activas. | Solicita contraseña actual + nueva. |
| Cambiar contraseña de otro | Usuarios | Invalida sesiones de ese usuario. | "Se cambiará la contraseña de **{usuario}**." |
| Eliminar usuario | Usuarios | No aplica al último superadmin ni a sí mismo. | "El usuario **{usuario}** será eliminado." |

### Operaciones que NO requieren confirmación modal

- Guardar formulario (usa Toast de éxito).
- Activar / desactivar producto (usa toggle con feedback visual inmediato).
- Agregar / quitar de Novedades (v1.10.0, reversible e inmediato, mismo criterio que activar/desactivar).
- Cambiar imagen principal (acción reversible inmediata).
- Reordenar imágenes (auto-guardado con feedback).

---

# 11. Navegación

## 11.1 Árbol de rutas

```text
/admin
│
├── /login                            (anónimo)
│
├── /                                 Dashboard
│
├── /productos                        Listado de productos
│   ├── /nuevo                        Crear producto
│   └── /:id                          Editar producto
│       ├── /variantes                Variantes (subpestaña)
│       └── /imagenes                 Imágenes (subpestaña)
│
├── /categorias                       ABM de categorías
├── /marcas                           ABM de marcas
├── /deportes                         ABM de deportes
├── /talles                           ABM de talles
│
├── /promociones                      ABM de promociones
├── /banners                          ABM de banners
│
├── /configuracion                    Configuración de la tienda
│
├── /usuarios                         ABM de administradores (solo Superadministrador)
│
├── /auditoria                        Registros de auditoría
└── /historial-precios                Historial de cambios de precio
```

## 11.2 Sidebar

| Sección | Ítems |
|---|---|
| **Principal** | Dashboard, Productos, Promociones, Banners |
| **Catálogo** | Categorías, Marcas, Deportes, Talles |
| **Tienda** | Configuración |
| **Sistema** | Usuarios, Auditoría, Historial de precios |

- Los ítems se ordenan por frecuencia de uso descendente.
- Los ítems de **Sistema** solo son visibles según permisos.

---

# 12. Componentes reutilizables iniciales

## 12.1 Tablas y listados

| Componente | Responsabilidad |
|---|---|
| `DataTable` | Tabla con encabezados, celdas personalizables, ordenamiento y acciones por fila. |
| `SearchBar` | Búsqueda con debounce y botón de limpiar. |
| `FiltersPanel` | Panel colapsable de filtros declarativo. |
| `Pagination` | Navegación de páginas con totales. |
| `StatusBadge` | Badge para activo, inactivo, eliminado, vigente, vencido. |

## 12.2 Feedback y estados

| Componente | Responsabilidad |
|---|---|
| `ConfirmDialog` | Modal de confirmación para operaciones críticas. |
| `Toast` | Notificaciones temporales. |
| `EmptyState` | Estado vacío con mensaje y CTA. |
| `LoadingOverlay` | Carga sobre una sección sin bloquear toda la pantalla. |
| `Skeleton` | Esqueletos para tablas, tarjetas y formularios. |
| `ErrorState` | Mensaje de error con reintentar. |
| `NoPermissionState` | Mensaje de acceso denegado. |

## 12.3 Formularios

| Componente | Responsabilidad |
|---|---|
| `FormSection` | Agrupación visual de campos. |
| `FormInput` | Input con label, error e hint. |
| `FormSelect` | Select con label, error e hint. |
| `FormCheckbox` | Checkbox con label y error. |
| `FormDatePicker` | Selector de fecha para vigencias. |
| `FormTextarea` | Textarea con label, error y contador. |

## 12.4 Dominio

| Componente | Responsabilidad |
|---|---|
| `ImageUploader` | Subida con validación de formato, peso y dimensiones (`RF-32`). |
| `ImageGallery` | Galería con reordenamiento y definición de principal. |
| `VariantMatrix` | Vista de las variantes (por talle) de un producto, con cantidad y estado derivado (v1.4.0). |
| `PriceHistoryWidget` | Últimos cambios de precio en ficha de producto. |

---

# 13. Mapeo pantalla → endpoint

## 13.1 Autenticación

| Pantalla | Método | Endpoint |
|---|---|---|
| Login | `POST` | `/api/v1/admin/auth/login` |
| Logout | `POST` | `/api/v1/admin/auth/logout` |
| Perfil | `GET` | `/api/v1/admin/auth/me` |

## 13.2 Dashboard

| Pantalla | Método | Endpoint | DTO |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/dashboard` | `DashboardDTO` |

## 13.3 Productos

| Pantalla | Método | Endpoint | Notas |
|---|---|---|---|
| Listado | `GET` | `/api/v1/admin/products` | Filtros: `q`, `brand`, `category`, `availability`, `is_active`, `sort`, `page`, `per_page` |
| Crear | `POST` | `/api/v1/admin/products` | `ProductCreateDTO` |
| Editar (carga) | `GET` | `/api/v1/admin/products/{id}` | `ProductAdminDTO` |
| Editar (guardar) | `PUT` | `/api/v1/admin/products/{id}` | `ProductUpdateDTO` |
| Eliminar | `DELETE` | `/api/v1/admin/products/{id}` | Soft delete (`AD-18`); no reversible desde el panel |
| Activar/Desactivar | `POST` | `/api/v1/admin/products/{id}/set-active` | `{ "is_active": boolean }` |
| Agregar/Quitar de Novedades (v1.10.0) | `POST` | `/api/v1/admin/products/{id}/set-home-new` | `{ "selected": boolean }` |

### Variantes (subpestaña de producto)

| Pantalla | Método | Endpoint |
|---|---|---|
| Listar | `GET` | `/api/v1/admin/products/{id}/variants` |
| Cargar cantidad (v1.4.0) | `PUT` | `/api/v1/admin/products/{id}/variants/{variant_id}` |
| Registrar venta (v1.8.0) | `POST` | `/api/v1/admin/products/{id}/variants/{variant_id}/sales` |
| Eliminar | `DELETE` | `/api/v1/admin/products/{id}/variants/{variant_id}` |

### Imágenes (subpestaña de producto)

| Pantalla | Método | Endpoint |
|---|---|---|
| Listar | `GET` | `/api/v1/admin/products/{id}/images` |
| Subir | `POST` | `/api/v1/admin/products/{id}/images` |
| Actualizar metadatos | `PUT` | `/api/v1/admin/products/{id}/images/{image_id}` |
| Eliminar | `DELETE` | `/api/v1/admin/products/{id}/images/{image_id}` |
| Reordenar | `POST` | `/api/v1/admin/products/{id}/images/reorder` |
| Definir principal | `POST` | `/api/v1/admin/products/{id}/images/{image_id}/set-primary` |

## 13.4 Categorías

| Pantalla | Método | Endpoint |
|---|---|---|
| Listar | `GET` | `/api/v1/admin/categories` |
| Crear | `POST` | `/api/v1/admin/categories` |
| Editar (carga) | `GET` | `/api/v1/admin/categories/{id}` |
| Editar (guardar) | `PUT` | `/api/v1/admin/categories/{id}` |
| Eliminar | `DELETE` | `/api/v1/admin/categories/{id}` |

## 13.5 Marcas

| Pantalla | Método | Endpoint |
|---|---|---|
| CRUD | `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/admin/brands` / `/api/v1/admin/brands/{id}` |
| Logotipo (v1.1.0) | `PUT` / `DELETE` | `/api/v1/admin/brands/{id}/image` |
| Collage (v1.1.0) | `GET` / `POST` / `DELETE` | `/api/v1/admin/brands/{id}/images` / `.../{image_id}` |
| Reordenar collage (v1.1.0) | `PUT` | `/api/v1/admin/brands/{id}/images/order` |

## 13.6 Deportes

| Pantalla | Método | Endpoint |
|---|---|---|
| CRUD | `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/admin/sports` / `/api/v1/admin/sports/{id}` |

## 13.7 Colores

*Sección retirada el 19/08/2026 (`01_ANALISIS_NEGOCIO.md` 2.7.0, pedido del administrador): ya no existe la clasificación "color", y con ella desaparece el CRUD bajo `/api/v1/admin/colors`. El número de sección se conserva sin contenido para no correr la numeración de §13.8 en adelante, citada desde varios puntos de este documento.*

## 13.8 Talles

| Pantalla | Método | Endpoint |
|---|---|---|
| CRUD | `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/admin/sizes` / `/api/v1/admin/sizes/{id}` |

## 13.9 Promociones

| Pantalla | Método | Endpoint |
|---|---|---|
| CRUD | `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/admin/promotions` / `/api/v1/admin/promotions/{id}` |

## 13.10 Banners

| Pantalla | Método | Endpoint |
|---|---|---|
| CRUD | `GET` / `POST` / `PUT` / `DELETE` | `/api/v1/admin/banners` / `/api/v1/admin/banners/{id}` |

## 13.11 Configuración

| Pantalla | Método | Endpoint |
|---|---|---|
| Ver | `GET` | `/api/v1/admin/store/settings` |
| Guardar | `PUT` | `/api/v1/admin/store/settings` |
| Foto de historia (v1.1.0) | `PUT` / `DELETE` | `/api/v1/admin/store/about-image` |

## 13.12 Plantilla WhatsApp (reincorporada, v1.5.0)

| Pantalla | Método | Endpoint |
|---|---|---|
| Ver | `GET` | `/api/v1/admin/store/whatsapp-template` |
| Guardar | `PUT` | `/api/v1/admin/store/whatsapp-template` |
| Restaurar por defecto | `POST` | `/api/v1/admin/store/whatsapp-template/reset` |

Comparte columnas con §13.11 (`message_template`, `item_template` de
`store_settings`), de modo que guardar acá o en Configuración deja obsoleta
la lectura del otro: la pantalla invalida ambas cachés (la propia y la de
Configuración) al guardar o restaurar, y la de Configuración hace lo mismo
en sentido inverso, porque su `PUT` reemplaza el recurso completo y reenvía
estos dos campos tal como los cargó.

## 13.13 Usuarios (solo Superadministrador)

| Pantalla | Método | Endpoint |
|---|---|---|
| Listar | `GET` | `/api/v1/admin/users` |
| Crear | `POST` | `/api/v1/admin/users` |
| Editar (carga) | `GET` | `/api/v1/admin/users/{id}` |
| Editar (guardar) | `PUT` | `/api/v1/admin/users/{id}` |
| Eliminar | `DELETE` | `/api/v1/admin/users/{id}` |
| Cambiar contraseña | `POST` | `/api/v1/admin/users/{id}/change-password` |

## 13.14 Auditoría

| Pantalla | Método | Endpoint |
|---|---|---|
| Listar | `GET` | `/api/v1/admin/audit-logs` |

## 13.15 Historial de precios

| Pantalla | Método | Endpoint |
|---|---|---|
| Listado completo | `GET` | `/api/v1/admin/price-history` |
| Widget en producto | `GET` | `/api/v1/admin/price-history?product_id={id}` |

---

# 14. Especificación de pantallas principales

## 14.1 Dashboard

### Objetivo

Ofrecer una vista rápida del estado del catálogo y destacar productos que requieren atención.

### Contenido

| Sección | Métrica / Alerta | Origen |
|---|---|---|
| Tarjetas superiores | Total de productos activos, inactivos, en oferta, por disponibilidad. | `RF-38` |
| Alertas | Productos incompletos: sin imagen, sin precio o sin categoría. | `RF-39` |
| Accesos rápidos | Enlaces a Crear producto, Promociones, Banners. | — |

### Decisión de UI

- **No se incluyen gráficos en v1** (resolución de `PADP-01`).
- Las tarjetas son el componente principal del dashboard.
- **v1.12.3 — rediseño visual** (pedido explícito del usuario): cada
  tarjeta suma un ícono en una caja de color (`MetricCard`, tono según la
  métrica — verde para Activos/Disponibles, ámbar para Stock bajo, rojo
  para No disponibles, el acento de la marca para En oferta, neutro para
  Productos/Ocultos) y el número principal creció de tipografía. El color
  es apoyo visual, nunca el único portador del dato — la etiqueta de texto
  sigue ahí siempre. Las siete métricas y sus siete valores no cambiaron.

## 14.2 Listado de productos

### Objetivo

Permitir buscar, filtrar y gestionar el catálogo completo.

### Controles

- Búsqueda por nombre, SKU o slug.
- Filtros: marca, categoría, disponibilidad, activo/inactivo.
- Ordenamiento por nombre, fecha de creación, fecha de actualización, precio.
- Paginación.

### Acciones por fila

- Editar.
- Activar / Desactivar.
- Agregar a Novedades / Quitar de Novedades (v1.10.0) — el estado actual se distingue con un badge "Novedades" junto a los de Destacado/Nuevo.
- Eliminar (modal de confirmación).

### Productos eliminados

- El borrado de producto es lógico (`AD-18`): marca `deleted_at` y mantiene la fila por integridad referencial.
- El panel **no** los lista ni ofrece restaurarlos (`PADP-02` revertida, v1.14.0). Revertir un borrado exige intervención directa en la base de datos.

## 14.3 Ficha de producto (crear / editar)

**v1.12.0 — un solo formulario para los dos modos** (pedido explícito del
usuario). Hasta v1.11.0 "Nuevo producto" y "Editar producto" eran pantallas
distintas: el alta era un formulario reducido (`QuickAddProductForm`, sin
navegar al guardar, para cargar productos en serie) y la edición era el
formulario completo, pero sin imágenes ni cantidad por talle — eso vivía
aparte, en la ficha de solo lectura. Ahora los dos modos usan el mismo
`ProductForm`: mismos campos, mismo orden, mismas validaciones. La única
diferencia es si el formulario recibe un producto existente (edición,
precargado) o no (alta, vacío).

### Secciones del formulario

1. **Identificación:** nombre (ocupa toda la fila, v1.12.1), descripción. El
   **nombre** se normaliza a formato título al perder el foco del campo
   (v1.12.0, pedido explícito del usuario): "nike air" → "Nike Air",
   "NIKE AIR MAX" → "Nike Air Max". El **SKU no se muestra ni se edita**
   (v1.12.1, pedido explícito del usuario: "el administrador no debe ver ni
   poder editar el SKU") — sigue existiendo en el modelo y el contrato
   (`_product_fields` lo exige), pero el formulario ya no lo pide: se
   autogenera siempre a partir del nombre normalizado al crear
   (`toPayload`/`generarSku`), y al editar viaja intacto con el valor que ya
   tenía el producto, precargado por `toFormValues` sin que haya campo para
   tocarlo. El **slug** lo genera el backend a partir del nombre normalizado
   al crear el producto y no se vuelve a tocar, aunque el nombre cambie
   después — ver `05_API.md` §10.4, nota de v1.3.2. No se muestra en el
   panel (v1.6.0): sigue siendo el identificador real de la URL pública,
   solo se ocultó de la interfaz.
2. **Precio:** precio de lista, precio de oferta, fechas de vigencia.
3. **Clasificación:** marca, categoría principal, tipo de talle, sexo
   (varios), categorías adicionales, deportes. **Categorías adicionales no
   ofrece la categoría principal** (v1.12.2, pedido explícito del usuario):
   ya se incluye sola, así que no se muestra como opción — ni al crear ni al
   editar, y al cambiar la principal varias veces no quedan restos de una
   selección anterior. Si un producto ya guardado tenía la misma categoría
   en las dos partes (dato de antes de esta regla), se limpia sola al cargar
   el formulario. Ninguna categoría se borra ni se modifica: es solo qué
   opciones ofrece este selector.
4. **Talles y stock** (v1.12.0): selección de talles, con un campo de
   cantidad junto a cada talle marcado — la carga inicial de stock ya no
   exige entrar a "Ver" después de crear. La variante y su `id` recién
   existen después de guardar (`AD-15`), así que la cantidad se reconcilia
   en un segundo paso, automático, contra `PATCH .../variants/{id}`, después
   de que el `POST`/`PUT` principal confirma.
5. **Imágenes** (v1.12.0): al crear, se juntan localmente y se suben recién
   después de que el producto existe (mismo mecanismo que tenía el alta
   rápida). Al editar, es la galería real y en vivo (subir, reordenar,
   marcar principal, eliminar), embebida en el propio formulario.
6. **Publicación:** activo/inactivo, destacado, nuevo. La **disponibilidad**
   no se elige acá (v1.4.0, `RN-38b`): se deriva de la cantidad cargada por
   variante, y un producto recién creado nace "No disponible" hasta que se
   carga stock.

> **La ficha de solo lectura conserva su propia gestión.** `ImagesSection` y
> `VariantsSection` siguen viviendo en la ficha del producto (decisión
> explícita al unificar el formulario, v1.12.0): además de la carga inicial
> del formulario, la ficha sigue siendo el lugar para reordenar imágenes,
> marcar principal, **registrar venta** y **eliminar una variante** — acciones
> operativas sobre un producto que ya existe, no datos de este formulario.

> **Imágenes derivadas.** Las dimensiones, los formatos y la convención de
> nombres de los tres derivados de `02_ARQUITECTURA.md` §15.5 están fijados en
> `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (`AI-06`), que cierra `ADP-16`. La galería
> muestra la Miniatura de 400 px; el catálogo público usa Catálogo (800 px) y la
> ficha usa Detalle (1600 px).

> **El alta sigue sin navegar al guardar** (pedido explícito del
> administrador, 2026-08-16, conservado en la unificación v1.12.0): limpia el
> formulario y queda lista para el siguiente producto. Editar sí navega, de
> vuelta a la ficha.

### Validaciones del frontend

- Nombre obligatorio.
- SKU: sin campo en el formulario; se autogenera siempre al crear, y al
  editar se conserva el valor existente sin pedirlo (v1.12.1).
- Precio de lista mayor a cero.
- Marca, categoría principal y tipo de talle obligatorios; al menos un sexo.
- Si se definen talles, la selección genera variantes (`RN-13`, `RN-14`, `RN-15`).

## 14.4 Módulos de catálogo simples (Categorías, Marcas, Deportes, Talles)

### Patrón común

- Pantalla de listado con tabla.
- Botón "Nuevo".
- Formulario modal o página de edición.
- Eliminación con validación de dependencias (`RN-68`).

### Categorías

- Incluye selector de **Categoría padre** (`AD-24`: dos niveles como máximo).
- Incluye **Sexos de esta categoría** (v1.15.0, `RN-83`): cinco casillas
  —Hombre, Mujer, Unisex, Niño, Niña— que deciden en qué secciones del menú de
  la tienda aparece la categoría, y qué se lista en el filtro del catálogo
  cuando el cliente ya filtró por sexo. El menú **Hombres** muestra las de
  Hombre o Unisex, **Mujeres** las de Mujer o Unisex, e **Infantil** las de
  Niño o Niña.
- **No tildar ninguna significa «sin restricción»**, no «ninguno» (`AD-41`): la
  categoría aparece en todas las secciones. Es como se comportaban todas antes
  de que el campo existiera, de modo que las categorías ya cargadas no
  necesitan tocarse.
- Una categoría nueva nace con las cinco tildadas. No cambia el resultado
  —tildar todo y no tildar nada se ven igual— pero le muestra al administrador
  que el campo existe y qué puede quitar. Mismo criterio que "Mostrar en la
  franja de marcas" (§14.4, Marcas).
- Para esconder una categoría de toda la tienda está **Activo**, que ya existe
  y significa exactamente eso.

### Talles

- Incluye selector de **Tipo de talle** (solo lectura).
- El listado puede filtrarse por tipo de talle.
- El campo "Nombre" es **texto libre** (v1.5.0, `RN-15b` revisada, pedido
  explícito del usuario): admite cualquier valor alfanumérico razonable —
  numérico ("42"), decimal ("8.5"), alfabético ("XL"), alfanumérico ("4T",
  "12Y"), con "/" ("35/36"), con "-" ("38-39") o "Único" — sin restricción
  según el tipo de talle elegido. El backend solo exige que no quede vacío
  tras recortar espacios ("8.5, M, 35/36, Único"); ya no rechaza un valor
  puramente numérico en Indumentaria ni uno no numérico en Calzado.

## 14.5 Promociones

### Formulario

- Nombre y descripción.
- Tipo de aplicación: producto, categoría, marca o **todos los productos**
  (v1.17.0, pedido explícito del usuario).
- Selección del objetivo según tipo — sin selector cuando el tipo es "todos
  los productos".
- Porcentaje de descuento.
- Fechas de inicio y fin.
- Estado activo/inactivo.

### Reglas

- Una promoción aplica a como máximo uno de los tres tipos con entidad, o a
  todos los productos (`RN-36`, revisada v1.17.0).
- El descuento se expresa como porcentaje entero.
- Una promoción "todos los productos" participa igual que cualquier otra en
  `RN-37`: si coincide con una promoción más específica sobre el mismo
  producto, el catálogo aplica la de mayor descuento.

## 14.6 Banners

### Formulario

- Título.
- Subtítulo.
- Imagen.
- Enlace opcional.
- Posición de orden.
- Fechas de inicio y fin.
- Estado activo/inactivo.

> El panel consume `BannerAdminDTO` (`05_API.md` §10.3), que es el que lleva
> `id`, fechas y estado. El `BannerDTO` del catálogo público no los expone
> (`AD-12`). La imagen se almacena según `99_AI_DEVELOPMENT_GUIDE.md` §17.1,
> espacio de nombres `banners`.

### Reglas

- El orden de aparición, la vigencia y el estado activo son propios del banner
  (`RN-73`).
- Un banner sin vigencia definida es permanente mientras esté activo (`RN-74`).

## 14.6b Bancos — Superdescuentos (nuevo, v1.16.0)

Panel administrativo para los bancos que se muestran en la sección pública
"Superdescuentos" del pie del catálogo, antes hardcodeados en el frontend sin
ningún campo administrable (pedido explícito del usuario).

### Formulario

- Nombre del banco.
- Descripción (opcional, v1.18.0, pedido explícito del usuario): nota interna
  para el panel — no aparece en la tarjeta pública.
- Porcentaje de descuento (entero, 1 a 99).
- Posición de orden.
- Mini banner (imagen): subir, reemplazar o quitar.
- Estado activo/inactivo.

> El panel consume `BankAdminDTO` (`05_API.md` §10.3b). La sección pública
> "Superdescuentos" consume `BankDTO` (sin `id` ni estado, `AD-12`) y solo
> muestra los bancos activos, ordenados por posición. La imagen se almacena
> según `99_AI_DEVELOPMENT_GUIDE.md` §17.1, espacio de nombres propio `banks`.

### Reglas

- La tarjeta pública sigue siendo mínima: nombre, porcentaje y mini banner,
  sin nota, detalle ni color por banco — usa un estilo visual único para
  todos (decisión original, sigue firme). La `description` que suma v1.18.0
  es aparte: vive solo en el panel, como contexto para el administrador, y
  nunca viaja al `BankDTO` público. Un caso comercial con más de un
  porcentaje por banco (p. ej. débito/crédito distintos) se sigue cargando
  como dos bancos separados, no como un campo compuesto.
- El borrado es lógico (`AD-18`); el banco deja de mostrarse en
  Superdescuentos de inmediato. El archivo del mini banner solo se retira del
  disco si ningún otro banco vivo lo sigue usando.
- No existe ningún endpoint público de escritura: solo lectura (`GET
  /api/v1/banks`).

## 14.7 Configuración de la tienda

### Campos

- Nombre de la tienda.
- Número de WhatsApp.
- Dirección.
- Horarios.
- Redes sociales.
- Email de contacto.

## 14.8 Plantilla WhatsApp (reincorporada, v1.5.0)

### Campos

- Plantilla del mensaje (`message_template`), texto libre con variables.
- Plantilla de ítem (`item_template`), texto libre con variables; se repite
  una vez por producto y compone `{{items}}` de la plantilla del mensaje.

### Elementos de la pantalla (`RF-41`)

- **Listado de variables disponibles**, junto a cada plantilla: `{{tienda}}`,
  `{{items}}`, `{{total}}` y `{{codigo_consulta}}` para el mensaje;
  `{{numero}}`, `{{producto}}`, `{{marca}}`, `{{talle}}`,
  `{{cantidad}}`, `{{precio_unitario}}`, `{{subtotal}}` y `{{disponibilidad}}`
  para el ítem (`01_ANALISIS_NEGOCIO.md` §12.2).
- **Vista previa**, compuesta con el mismo motor de sustitución que arma el
  mensaje real (`02_ARQUITECTURA.md` §13.8) y dos productos de ejemplo, uno
  de ellos sin talle, para mostrar la omisión de etiqueta y valor juntos
  (§13.9).
- **Restaurar plantilla por defecto**, con confirmación: reemplaza las dos
  plantillas por `whatsapp_defaults.py` (`RN-61`) y descarta cualquier cambio
  sin guardar.

### Reglas

- `{{items}}` y `{{total}}` son obligatorias en la plantilla del mensaje; se
  valida antes de guardar (`RN-60`) con el mismo mensaje de error que el
  backend (`05_API.md` §11).
- La plantilla de ítem no tiene variables obligatorias.
- Comparte columnas con §14.7 (`StoreSettingsAdminDTO`): esa pantalla las
  reenvía sin editarlas, así que guardar acá invalida también su lectura, y
  viceversa (§13.12).

## 14.9 Usuarios

### Restricciones

- Solo Superadministrador accede (`RN-67`). Ruta real: `/admin/users`.
- No se puede eliminar, desactivar ni degradar de rol al último superadministrador activo (`RN-71`). La UI deshabilita esas acciones cuando lo detecta en el listado ya traído, con el motivo a la vista; el backend es la autoridad.
- Un usuario no puede eliminarse a sí mismo (`RN-72`). La UI marca su propia fila con «vos» y deshabilita «Eliminar».

### Listado

- Columnas: nombre de usuario, correo, rol, estado (Activo/Inactivo), último acceso.
- Acciones por fila: Editar · Contraseña · Eliminar.

### Formulario de alta / edición

- Nombre de usuario (obligatorio, único; el modelo **no** tiene «nombre completo», ver `03_SEGURIDAD.md` §5.7.3).
- Correo (obligatorio, único, formato de dirección).
- Rol (`administrator` / `super_administrator`).
- Estado activo/inactivo — **solo en edición**; el alta siempre crea activo. Desactivar cierra las sesiones abiertas de ese usuario (§7.3).
- Contraseña inicial — **solo en el alta**. En edición la contraseña tiene su propio botón «Contraseña».

### Cambio de contraseña

- Diálogo aparte con confirmación (§10). Pide la nueva contraseña dos veces.
- Todo campo de contraseña del panel (login, alta de usuario, cambio de
  contraseña) tiene un botón para mostrarla/ocultarla (v1.18.0, pedido
  explícito del usuario) — puramente de presentación, no cambia validación
  ni contrato.
- Si el objetivo es la **propia** cuenta (desde el listado o desde «Mi cuenta»), pide además la contraseña actual (`05_API.md` §9.14) y, al terminar, cierra la sesión y lleva al login (§7.3).
- Si un superadministrador cambia la de **otro**, no se pide la actual; se cierran las sesiones de ese usuario.
- Límite: 3 intentos cada 15 minutos por sesión (`03_SEGURIDAD.md` §14.1); el `429` se traduce a "Demasiados intentos. Esperá unos minutos.".

### Mi cuenta (`/admin/account`)

- La alcanza **cualquier** administrador desde el nombre de usuario del topbar.
- Muestra usuario, correo, rol y último acceso (solo lectura) y el formulario de cambio de contraseña propia.
- Un administrador común no puede cambiar su usuario ni su correo: eso lo hace el superadministrador desde «Usuarios».

## 14.10 Auditoría

### Pantalla

- Tabla inmutable con: fecha, administrador, acción, entidad, identificador, cambios resumidos.
- Filtros: entidad, identificador, administrador, acción, rango de fechas.
- Sin acciones de edición ni eliminación.

## 14.11 Historial de precios

### Pantallas

1. **Widget en ficha de producto:** últimos 5 cambios de precio.
2. **Pantalla completa:** listado paginado con filtros por producto, administrador y fechas (resolución de `PADP-03`).

---

# 15. Accesibilidad y usabilidad

## 15.1 Accesibilidad

- Todas las tablas usan etiquetas semánticas (`<table>`, `<th>`, `<td>`).
- Los formularios asocian `<label>` con cada campo.
- Los modales capturan el foco y permiten cerrar con `Escape`.
- Los badges de estado no dependen solo del color; incluyen texto descriptivo.
- Los íconos de acción tienen `aria-label`.

## 15.2 Usabilidad

- Las acciones más frecuentes están a un clic en la tabla.
- Los filtros aplicados se muestran como chips removibles.
- Las operaciones de guardado deshabilitan el botón primario hasta recibir respuesta.
- Los errores de validación se muestran junto al campo correspondiente.

---

# 16. Rendimiento

| Escenario | Objetivo | Estrategia |
|---|---|---|
| Carga inicial del panel | < 2 s en escritorio | Code splitting del bundle del panel (`02_ARQUITECTURA.md` §8.5). |
| Listados del panel | < 300 ms (p95) | Paginación server-side, sin cargar relaciones innecesarias. |
| Subida de imágenes | Feedback inmediato | Carga con progreso y optimización en servidor. |
| Navegación entre pantallas | Sin recarga completa | React Router + TanStack Query con stale-while-revalidate. |

---

# 17. Testing

| Tipo | Qué probar | Dónde se detalla |
|---|---|---|
| **Unitario** | Hooks propios del feature `admin`, utilidades de formato, helpers de permisos. | `11_TESTING.md` |
| **Integración** | Flujos de creación/edición/eliminación contra mocks de `05_API.md`. | `11_TESTING.md` |
| **Accesibilidad** | Navegación por teclado, lectores de pantalla en formularios y tablas. | `11_TESTING.md` |
| **End-to-end** | Login, CRUD de producto, cambio de contraseña, guarda de rutas. | `11_TESTING.md` |

---

# 18. Trazabilidad

| Origen | Aplicación en este documento |
|---|---|
| `00_VISION_PROYECTO.md` §3.3 | Alcance del panel administrativo. |
| `01_ANALISIS_NEGOCIO.md` §5.1 | Roles Administrador y Superadministrador. |
| `01_ANALISIS_NEGOCIO.md` §9.2 | Casos de uso `CU-A-01` a `CU-A-28`. |
| `01_ANALISIS_NEGOCIO.md` §10.3 | Requisitos funcionales del panel `RF-27` a `RF-42`. |
| `02_ARQUITECTURA.md` §8.2, §8.5 | Organización por features y carga diferida del panel. |
| `02.1_DECISIONES_ARQUITECTONICAS.md` `AD-01`, `AD-03`, `AD-07`, `AD-08`, `AD-18`, `AD-20`, `AD-37` | Fundamento de decisiones de arquitectura. |
| `05_API.md` §9 | Endpoints privados del panel. |
| `06_FRONTEND.md` §5, §7, §8.2, §9, §10 | Stack, estructura, routing y gestión de estado del frontend. |
| `07.0_PANEL_ADMIN_ANALISIS_PREVIO.md` | Base del análisis previo aprobado. |

---

# 19. Glosario de permisos del panel

| Permiso | Descripción |
|---|---|
| `authenticated_admin` | Usuario autenticado con rol Administrador o Superadministrador. |
| `super_administrator` | Usuario autenticado con rol Superadministrador. |
| `manage_products` | Puede gestionar productos. |
| `manage_categories` | Puede gestionar categorías. |
| `manage_brands` | Puede gestionar marcas. |
| `manage_sports` | Puede gestionar deportes. |
| `manage_sizes` | Puede gestionar talles. |
| `manage_promotions` | Puede gestionar promociones. |
| `manage_banners` | Puede gestionar banners. |
| `manage_store_settings` | Puede editar configuración de la tienda. |
| `manage_whatsapp_template` | Puede editar plantilla de WhatsApp. |
| `view_audit_logs` | Puede consultar auditoría. |
| `view_price_history` | Puede consultar historial de precios. |

---

# 20. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.18.0** | 22/09/2026 | 🟡 EN REVISIÓN | **Dos ajustes menores (pedido explícito del usuario).** (1) Botón de mostrar/ocultar en todo campo de contraseña del panel (login, alta de usuario, cambio de contraseña) — nuevo componente compartido `PasswordField`, sin cambios de validación ni de contrato. (2) §14.6b Bancos: nuevo campo **Descripción** (opcional, `04_BASE_DATOS.md` v1.10.0, `05_API.md` v1.13.0) — nota interna del panel; la tarjeta pública de Superdescuentos sigue sin mostrarla, según la decisión original de campos mínimos. |
| **1.17.0** | 22/09/2026 | 🟡 EN REVISIÓN | **Promoción "todos los productos" (`01_ANALISIS_NEGOCIO.md` v2.9.0, `04_BASE_DATOS.md` v1.9.0, `05_API.md` v1.12.0, pedido explícito del usuario).** §14.5: el selector "Se aplica a" suma un cuarto tipo, "Todos los productos", sin selector de entidad. `RN-36` revisada: como máximo uno de producto/categoría/marca, o ninguno para aplicar a todo el catálogo. |
| **1.16.0** | 22/09/2026 | 🟡 EN REVISIÓN | **Tanda funcional (pedido explícito del usuario, 4 cambios).** (1) §14.4 Talles: el nombre pasa a ser texto libre (`RN-15b` revisada, `01_ANALISIS_NEGOCIO.md`, `05_API.md`) — ya no valida numérico/alfabético según el tipo. (2) §14.7 Configuración: el horario de atención y el número de WhatsApp se actualizan al horario y teléfono oficiales vigentes; sin cambio de arquitectura, siguen siendo la única fuente de verdad ya existente. (3) Corrige un bug encontrado durante la implementación: la página de Contacto armaba su enlace de WhatsApp sin sanear el número (a diferencia del pie y "Nuestra historia"), lo que podía romper el enlace `wa.me` con un número que llevara espacios. (4) **Nuevo §14.6b Bancos (Superdescuentos)** (`04_BASE_DATOS.md` v1.8.0, `05_API.md` v1.11.0): panel administrativo nuevo para los bancos que antes vivían hardcodeados en el pie del catálogo — nombre, porcentaje de descuento, mini banner y estado activo/inactivo, siguiendo el mismo patrón que Banners (CRUD, `multipart/form-data`, borrado lógico). |
| **1.15.0** | 10/09/2026 | 🟡 EN REVISIÓN | **Sexos por categoría (`RN-83` nueva, `04_BASE_DATOS.md` v1.7.0, `05_API.md` v1.10.0, pedido explícito del usuario: *"que al crear una categoria nueva aparezca la opcion de a que sexo permitir cada categoria, para de esta forma ordenar un poco mas el navbar"*).** §14.4: el formulario de categoría suma **Sexos de esta categoría**, cinco casillas que deciden en qué secciones del menú aparece. Hasta ahora la única forma de sacar una categoría del menú era una lista de slugs escrita en el código del frontend. **No tildar ninguna significa «sin restricción»** (`AD-41`), así que ninguna categoría ya cargada necesita tocarse y el menú se ve igual hasta que el administrador empiece a quitar. |
| **1.14.0** | 02/09/2026 | 🟡 EN REVISIÓN | **Se retira la vista y la restauración de productos eliminados** (`PADP-02` revertida, `05_API.md` v1.9.0, pedido explícito del usuario: *"elimina esa opcion"*). §4.3, §10, §13.3, §14.2: desaparece el filtro "Ver eliminados" del listado de productos, la acción "Restaurar" por fila y la operación crítica asociada. El borrado de producto sigue siendo lógico (`AD-18`) pero deja de ser reversible desde el panel. Los CRUD de marcas, categorías, deportes, talles y promociones conservan su filtro de eliminados y su acción de restaurar. |
| **1.13.0** | 28/08/2026 | 🟡 EN REVISIÓN | **Módulo Usuarios implementado en el panel** (05_API.md §9.14, ya existente; 03_SEGURIDAD.md §5.7). §7.1: la sidebar suma «Usuarios» — visible **solo** para el superadministrador (`RN-67`); un administrador común no lo ve y, si entra a mano, la guarda de ruta muestra «Sin permisos» y el backend responde `403` (§8.2). Pantalla de listado (usuario, correo, rol, estado, último acceso) con alta, edición (usuario/correo/rol/estado), eliminación lógica y cambio de contraseña propia o de terceros, cada uno con su confirmación (§10). Nueva pantalla **«Mi cuenta»** (`/admin/account`), accesible a cualquier administrador desde el nombre de usuario del topbar, para cambiar la propia contraseña (`CU-A-27`); exige la contraseña actual e invalida la sesión al terminar (§7.3). **Rutas reales:** `/admin/users`, `/admin/users/new`, `/admin/users/:id`, `/admin/account` — en inglés, como el resto de rutas ya implementadas (§8.2 documenta las rutas en español; el código quedó en inglés desde v1.0.0). Sin migraciones ni cambios de contrato. |
| **1.11.0** | 24/08/2026 | 🟡 EN REVISIÓN | **Sexo pasa de selector único a casillas (`RN-09` revisada, `04_BASE_DATOS.md` v1.6.0, `05_API.md` v1.8.0, pedido explícito del usuario).** §7.1, §14.3: la ficha de producto deja de pedir un solo sexo y pasa a casillas — mismo patrón que categorías adicionales y deportes, un producto puede ser de varios sexos a la vez. El alta rápida (§14.4) no cambia: sigue pidiendo un solo sexo con selector, por diseño (formulario reducido), y lo envuelve en una lista de uno al guardar. |
| **1.10.0** | 24/08/2026 | 🟡 EN REVISIÓN | **Novedades como selección editorial de productos** (`04_BASE_DATOS.md` v1.5.0, `05_API.md` v1.7.0, `09_COMPONENTES.md` v2.7.0, pedido explícito del usuario). §13.3 y §14.2: nueva acción "Agregar a Novedades" / "Quitar de Novedades" por fila del listado de productos, junto a Ver/Editar/Activar-Desactivar/Eliminar, reversible e inmediata (sin `ConfirmDialog`, mismo criterio que Activar/Desactivar). El estado se ve en el listado con un badge "Novedades". §8.1 suma la fila de permisos correspondiente (administrador y superadministrador, sin restricciones). §7.1: la zona "novedades" de Banners (`placement="news"`) deja de tener consumidor público en la Home, pero el CRUD y la zona no se retiran del panel. |
| **1.9.0** | 19/08/2026 | 🟡 EN REVISIÓN | **Eliminación completa de "color"** (`01_ANALISIS_NEGOCIO.md` 2.7.0, pedido del administrador). Supera a v1.7.0: ya no es que el CRUD de colores siga existiendo sin entrada de menú — el CRUD desaparece del todo (§13.7, retirada). §14.3: el paso "Variantes" del formulario de producto pasa a ser solo selección de talles. §14.4 pierde "Colores" de los módulos de catálogo simples. §14.8: la plantilla de WhatsApp pierde la variable `{{color}}`. Se retira el permiso documentado `manage_colors` (§19) — ya era aspiracional, sin enforcement propio en el backend. |
| **1.8.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Registro de ventas (`RN-82`, `05_API.md` v1.5.0).** §13.3 y §14.3 (Variantes): nuevo botón "Registrar venta" junto a cada variante, que abre un formulario inline con la cantidad vendida y un botón "Confirmar" — no usa `ConfirmDialog` (§10). Descuenta `quantity` de la variante y recalcula la disponibilidad del producto en el mismo `POST`; el botón se deshabilita si la variante ya está en 0. El servidor rechaza con `409` una venta que supere el stock cargado, traducido en pantalla a "No hay stock suficiente para esa cantidad." (`ERR-04`); un chequeo del lado del cliente evita el viaje obvio antes de eso. Pedido explícito del usuario: *"agregar opcion de registrar ventas para que de esta manera reduzca en el stock desded el panel admin"*, confirmado como funcionalidad nueva y no como alias de "cargar cantidad" (18/08/2026). |
| **1.7.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Ajustes de panel.** Se retira **Colores** del menú (§7.1) — mismo patrón reversible que v1.6.0, pedido explícito del usuario porque no le encuentra uso hoy; el CRUD de colores sigue existiendo, solo sin entrada de sidebar ni ruta. §14.5 (Promociones): el buscador de producto por nombre o SKU en "Se aplica a" ya existía (`ScopeSelector`, búsqueda server-side); se le agrega un ícono de lupa para que sea visualmente evidente, sin cambiar el comportamiento. |
| **1.6.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Diseño visual de la Home.** Se retiran del menú del panel **Plantilla WhatsApp**, **Configuración** y **Datos del sistema** (§7.1) — pedido explícito del usuario, en la misma tanda que el rediseño de la Home. A diferencia de la retirada de v1.4.0, el código de las tres pantallas no se borra: solo se quitan la entrada de sidebar y la ruta, de modo que siguen reversibles. §14.3: el campo **slug** deja de mostrarse en la ficha de producto (ya no era editable desde v1.3.2, ahora tampoco se muestra); las tablas de Categorías, Marcas, Deportes, Colores y Talles dejan de mostrar la columna Slug. Sigue siendo el identificador real de la URL pública — solo se ocultó de las pantallas de solo lectura del panel. |
| **1.5.0** | 17/08/2026 | 🟡 EN REVISIÓN | **QA funcional.** Reincorpora el módulo "Plantilla WhatsApp" que v1.4.0 había retirado el mismo día (§7.1, §13.12, §14.8), con pantalla propia, listado de variables, vista previa y restauración por defecto, contra el contrato de `05_API.md` §9.13 que nunca dejó de existir. El barrido de QA funcional posterior a v1.4.0 encontró que Configuración seguía enlazando «Editar plantilla» hacia una ruta inexistente —un enlace muerto que redirigía en silencio al Dashboard—, y el usuario prefirió restaurar el módulo antes que quitar el enlace. Sin cambios de contrato ni de migración: el backend y el permiso `manage_whatsapp_template` ya estaban listos. |
| **1.4.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Tanda funcional.** Se retira del panel el módulo "Plantilla WhatsApp" (§7.1, §13.12, §14.8): el sistema usa siempre la plantilla por defecto; el backend y el permiso `manage_whatsapp_template` se mantienen por compatibilidad. §14.3: la "Disponibilidad" deja de elegirse al crear/editar un producto — se deriva de la cantidad cargada por variante (`RN-38b`, `04_BASE_DATOS.md` v1.2.0). §13.3/§14.3: nuevo `PUT .../variants/{variant_id}` para cargar cantidad. §14.4: ayuda dinámica en "Talles" según el tipo elegido, con la misma validación de formato en el backend (`RN-15b`). Pedido explícito del usuario en la tanda funcional del 17/08/2026. |
| **1.3.2** | 16/08/2026 | ✅ APROBADO | **Slug automático (v1.2.0).** §14.3: el campo `slug` deja de editarse a mano en la ficha de producto y pasa a mostrarse de solo lectura; lo genera el backend a partir del nombre al crear y no se toca después, aunque el nombre cambie. Ver `05_API.md` §10.4, nota de v1.3.2. |
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Redacción inicial del panel administrativo. Deriva de `07.0_PANEL_ADMIN_ANALISIS_PREVIO.md` aprobado. Resuelve `PADP-01`, `PADP-02` y `PADP-03`. Añade matriz Pantalla ↔ Permiso y layout `AdminLayout`. |
| **1.1.0** | 10/08/2026 | ✅ APROBADO | §14.3 remite a `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (`AI-06`) para las dimensiones, formatos y nomenclatura de las imágenes derivadas, que cierran `ADP-16`. Sin cambios de comportamiento ni de permisos. |
| **1.3.1** | 13/08/2026 | ✅ APROBADO | §13.5: el logotipo de marca se carga y se quita por `PUT`/`DELETE` en su propio recurso, no dentro del formulario de la marca. Las imágenes se guardan al elegirlas, sin pasar por el botón «Guardar», porque viajan por endpoints distintos del `PUT` del recurso. |
| **1.3.0** | 13/08/2026 | ✅ APROBADO | **Portada administrable.** Marcas suma logotipo, frase, orden en portada y el submódulo de collage con reordenamiento (§7.1, §13.5). Banners declara la zona de cada pieza —hero, novedades o promociones— y el texto del botón (§7.1). Configuración suma correo e historia con su foto (§7.1, §13.12). No se crean permisos nuevos: `manage_brands`, `manage_banners` y `manage_settings` ya cubren las pantallas afectadas, porque son los mismos recursos con más campos, no recursos nuevos. |
| **1.2.0** | 11/08/2026 | ✅ APROBADO | §14.6: errata *"Imen."* corregida a *"Imagen"*, añadido el subtítulo que el formulario editaba sin declarar, referencia a `BannerAdminDTO` (`05_API.md` §10.3) y al espacio de nombres `banners` de `99_AI_DEVELOPMENT_GUIDE.md` §17.1, más las reglas `RN-73` y `RN-74` que la sección aplicaba sin citar. Sin cambios de permisos ni de comportamiento. |

---
