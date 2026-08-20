# 09_COMPONENTES.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Componentes React |
| **Código** | 09 |
| **Versión** | 2.5.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 18/08/2026 |
| **Documentos previos** | [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09.0_COMPONENTES_ANALISIS_PREVIO.md](09.0_COMPONENTES_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Definir el **contrato de implementación de los componentes React** de Pablito Sports: clasificación, API, dependencias, composición, estados, accesibilidad y relación con el sistema de diseño.

Este documento es la **referencia única** de los componentes React del proyecto. No define el sistema visual —`08_UI_SYSTEM.md`— ni la arquitectura —`02_ARQUITECTURA.md`—, sino cómo se construyen y combinan las piezas reutilizables de la interfaz.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Inventario de componentes React | — |
| Clasificación y nivel de reutilización | — |
| Contrato uniforme de cada componente | — |
| Dependencias y composición | — |
| Componentes prohibidos | — |
| Sistema visual y tokens | `08_UI_SYSTEM.md` |
| Routing, features y layouts | `06_FRONTEND.md`, `07_PANEL_ADMIN.md` |
| Casos de prueba | `11_TESTING.md` |
| Guía de implementación | `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 3. Alcance

## 3.1 Incluye

- Inventario completo de componentes React.
- Clasificación por responsabilidad, tipo, nivel, estabilidad, complejidad y prioridad.
- Contrato uniforme de componente.
- Dependencias directas e inversas.
- Reglas de composición.
- Estados visuales heredados del UI System.
- Accesibilidad por componente.
- Tokens de `08_UI_SYSTEM.md` utilizados.
- Componentes críticos con contrato detallado.
- Componentes prohibidos.
- Delimitación de qué NO es un componente.

## 3.2 No incluye

- Especificación de páginas, layouts de aplicación, hooks o servicios.
- Reglas de negocio ni contratos de API.
- Sistema de diseño visual.
- Guía de implementación paso a paso.

---

# 4. Decisiones de componentes

## COMP-01 — `09_COMPONENTES.md` es el contrato de implementación

| Campo | Valor |
|---|---|
| **Identificador** | COMP-01 |
| **Título** | `09_COMPONENTES.md` es el contrato único entre el UI System y el código React |
| **Decisión** | Todo componente React se documenta aquí con un formato uniforme de 17 campos. |
| **Consecuencias** | La implementación de cualquier componente es predecible y consistente. |

## COMP-02 — Todo estilo deriva de `08_UI_SYSTEM.md`

| Campo | Valor |
|---|---|
| **Identificador** | COMP-02 |
| **Título** | Los componentes no definen estilos; consumen tokens del sistema de diseño |
| **Decisión** | Ningún componente declara colores, tamaños, espaciados, radios ni sombras directamente. |
| **Consecuencias** | `09_COMPONENTES.md` documenta qué tokens usa cada componente, nunca valores concretos. |

## COMP-03 — Jerarquía de reutilización

| Campo | Valor |
|---|---|
| **Identificador** | COMP-03 |
| **Título** | Todo componente tiene un nivel de reutilización explícito |
| **Decisión** | Cada componente se etiqueta como `Global`, `Feature` o `Page`. La ubicación en el árbol de carpetas debe coincidir. |
| **Consecuencias** | Se evita la promoción incorrecta de componentes. |

## COMP-04 — Separación Presentational / Container

| Campo | Valor |
|---|---|
| **Identificador** | COMP-04 |
| **Título** | Todo componente se clasifica como Presentational o Container |
| **Decisión** | **Presentational:** reciben props y renderizan UI. **Container:** orquestan datos, estado y efectos. |
| **Consecuencias** | Mayor reutilización, testabilidad y claridad de responsabilidades. |

## COMP-05 — Estabilidad de la API

| Campo | Valor |
|---|---|
| **Identificador** | COMP-05 |
| **Título** | Cada componente declara el estado de estabilidad de su API |
| **Decisión** | `Stable` (API consolidada), `Internal` (uso restringido al feature), `Experimental` (puede cambiar). |
| **Consecuencias** | Los desarrolladores conocen el riesgo de usar cada componente. |

---

# 5. Clasificación de componentes

## 5.1 Por responsabilidad

| Categoría | Descripción |
|---|---|
| **Foundation** | Bloques visuales atómicos sin lógica de negocio. |
| **Form** | Controles de entrada de datos. |
| **Feedback** | Comunicación de estado al usuario. |
| **Overlay** | Elementos que se superponen al contenido. |
| **Navigation** | Navegación y orientación. |
| **Data Display** | Presentación de datos e información. |
| **Layout** | Estructura y disposición espacial. |
| **Domain** | Componentes específicos del catálogo o del panel. |

## 5.2 Por nivel de reutilización

| Nivel | Ubicación | Criterio |
|---|---|---|
| **Global** | `shared/components/` | Usado por al menos dos features. |
| **Feature** | `features/X/components/` | Usado solo dentro de un feature. |
| **Page** | `features/X/pages/` | Usado en una única página. |

## 5.3 Por tipo

| Tipo | Descripción |
|---|---|
| **Presentational** | Recibe props y renderiza. Sin lógica de negocio ni acceso a estado global. |
| **Container** | Orquesta datos, estado y efectos. Puede usar hooks propios del feature. |

## 5.4 Por estabilidad

| Estado | Significado |
|---|---|
| **Stable** | API consolidada. Cambios requieren justificación. |
| **Internal** | Uso restringido al feature. No se recomienda uso externo. |
| **Experimental** | API sujeta a cambios. Usar con precaución. |

## 5.5 Por complejidad

| Nivel | Criterio |
|---|---|
| **Baja** | Pocos props, sin estado interno, sin efectos. |
| **Media** | Estado interno, efectos simples o composición moderada. |
| **Alta** | Lógica significativa, interacciones complejas o integración con servicios. |

## 5.6 Por prioridad

| Prioridad | Significado |
|---|---|
| **P0** | Bloqueante para el MVP. Se implementa primero. |
| **P1** | Importante, pero no bloquea el lanzamiento. |
| **P2** | Mejora o funcionalidad secundaria. |

---

# 6. Contrato uniforme de componente

Cada componente de este documento incluye los siguientes 17 campos:

| # | Campo | Descripción |
|---|---|---|
| 1 | **Nombre** | Inglés, `PascalCase`. |
| 2 | **Nivel** | `Global` / `Feature` / `Page`. |
| 3 | **Categoría** | Foundation, Form, Feedback, Overlay, Navigation, Data Display, Layout, Domain. |
| 4 | **Tipo** | `Presentational` / `Container`. |
| 5 | **Estabilidad** | `Stable` / `Internal` / `Experimental`. |
| 6 | **Complejidad** | `Baja` / `Media` / `Alta`. |
| 7 | **Prioridad** | `P0` / `P1` / `P2`. |
| 8 | **Propósito** | Qué hace el componente. |
| 9 | **Props** | Propiedades, tipo, obligatoriedad y valor por omisión. |
| 10 | **Eventos** | Callbacks que expone. |
| 11 | **Estados** | Estados visuales; referencia al estándar del UI System. |
| 12 | **Accesibilidad** | Keyboard, ARIA, Focus, Screen Reader. |
| 13 | **Dependencias** | Componentes, hooks, servicios, DTOs o bibliotecas. |
| 14 | **Usado por** | Componentes que lo consumen. |
| 15 | **Composición** | Qué puede y no puede contener. |
| 16 | **Tokens** | Tokens de `08_UI_SYSTEM.md` que utiliza. |
| 17 | **Prohibiciones** | Qué no debe hacer. |

---

# 7. Estados visuales estándar

Todos los componentes heredan los estados de `08_UI_SYSTEM.md` §9:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error
- Success

Cada componente documenta solo excepciones o estados adicionales.

---

# 8. Accesibilidad estándar

| Aspecto | Aplicación |
|---|---|
| **Keyboard** | Orden de tabulación lógico, atajos, comportamiento con `Enter`/`Escape`/`Space`. |
| **ARIA** | Roles y atributos ARIA adecuados al patrón. |
| **Focus** | Indicador visible, captura en modales/drawers. |
| **Screen Reader** | Texto alternativo, anuncios dinámicos, etiquetas descriptivas. |

---

# 9. Inventario de componentes

## 9.1 Foundation

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Button` | Global | Presentational | Stable | Baja | P0 | Botón accionable con variantes. | `color-action-*`, `radius-md`, `spacing-3`, `font-size-md` |
| `IconButton` | Global | Presentational | Stable | Baja | P0 | Botón compacto con ícono. | `color-action-*`, `radius-md`, `spacing-2` |
| `Icon` | Global | Presentational | Stable | Baja | P0 | Renderizado de íconos Font Awesome. | `font-size-*` |
| `Typography` | Global | Presentational | Stable | Baja | P0 | Textos y encabezados estilizados. | `font-family-*`, `font-size-*`, `font-weight-*`, `color-text-*` |
| `Badge` | Global | Presentational | Stable | Baja | P0 | Indicador visual de estado o cantidad. | `radius-pill`, `color-action-*`, `spacing-2` |
| `Tag` | Global | Presentational | Stable | Baja | P1 | Etiqueta no interactiva. | `radius-md`, `color-background-card`, `spacing-2` |
| `Link` | Global | Presentational | Stable | Baja | P0 | Enlace estilizado. | `color-link`, `color-link-hover` |

### `Button`

| Campo | Valor |
|---|---|
| **Props** | `variant: 'primary' \| 'secondary' \| 'success' \| 'danger' \| 'ghost' \| 'link'` (default: `'primary'`), `size: 'sm' \| 'md' \| 'lg'` (default: `'md'`), `disabled: boolean`, `loading: boolean`, `children: ReactNode`, `onClick: () => void` |
| **Eventos** | `onClick` |
| **Estados** | → estándar |
| **Accesibilidad** | `disabled` y `aria-busy` en loading; foco visible. |
| **Dependencias** | `Icon`, `Spinner` |
| **Usado por** | Todos los componentes con acciones. |
| **Composición** | Puede contener: `Icon`, `Spinner`, texto. No puede contener: `Button`, `Link`. |
| **Prohibiciones** | No se crean `PrimaryButton`, `DangerButton`, etc. Usar `Button variant="..."`. |

---

## 9.2 Form

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Input` | Global | Presentational | Stable | Baja | P0 | Campo de texto simple. | `color-border`, `radius-sm`, `spacing-3`, `font-size-md` |
| `Select` | Global | Presentational | Stable | Baja | P0 | Selector de opciones. | `color-border`, `radius-sm`, `spacing-3` |
| `Checkbox` | Global | Presentational | Stable | Baja | P0 | Casilla de verificación. | `color-primary`, `radius-sm`, `spacing-2` |
| `Radio` | Global | Presentational | Stable | Baja | P0 | Opción única en grupo. | `color-primary`, `spacing-2` |
| `Switch` | Global | Presentational | Stable | Baja | P1 | Alternancia binaria. | `color-primary`, `radius-pill` |
| `Textarea` | Global | Presentational | Stable | Baja | P0 | Campo de texto multilinea. | `color-border`, `radius-sm`, `spacing-3` |
| `DatePicker` | Global | Presentational | Stable | Media | P1 | Selector de fecha. | `color-border`, `radius-md`, `shadow-md` |
| `FileInput` | Global | Presentational | Stable | Media | P1 | Carga de archivos. | `color-border`, `radius-md`, `spacing-3` |
| `SearchInput` | Global | Presentational | Stable | Baja | P0 | Campo de búsqueda con debounce. | `color-border`, `radius-sm`, `spacing-3` |
| `FormSection` | Global | Presentational | Stable | Baja | P0 | Agrupación visual de campos. | `spacing-5`, `font-size-lg`, `color-text-heading` |

### `SearchInput`

| Campo | Valor |
|---|---|
| **Props** | `value: string`, `placeholder?: string`, `debounceMs?: number` (default: `300`), `onChange: (value: string) => void`, `onClear?: () => void` |
| **Eventos** | `onChange`, `onClear` |
| **Estados** | → estándar |
| **Accesibilidad** | `role="search"`, botón de limpiar con `aria-label`. |
| **Dependencias** | `Input`, `IconButton`, `Icon` |
| **Usado por** | `ProductSearch`, `AdminDataTable`, páginas con búsqueda. |
| **Composición** | Puede contener: `Input`, `IconButton`. No puede contener: `Form`. |
| **Prohibiciones** | No ejecuta la búsqueda; solo emite el valor con debounce. |

---

## 9.3 Feedback

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Alert` | Global | Presentational | Stable | Baja | P0 | Mensaje contextual persistente. | `color-action-*-bg`, `radius-md`, `spacing-4` |
| `Toast` | Global | Container | Stable | Media | P0 | Notificación temporal. | `color-action-*-bg`, `shadow-lg`, `radius-md` |
| `Spinner` | Global | Presentational | Stable | Baja | P0 | Indicador de carga rotativo. | `color-primary`, `font-size-*` |
| `Skeleton` | Global | Presentational | Stable | Baja | P0 | Esqueleto de carga. | `color-background-disabled`, `radius-md` |
| `LoadingOverlay` | Global | Presentational | Stable | Baja | P0 | Capa de carga sobre sección. | `color-overlay`, `z-index-modal-backdrop` |
| `ProgressBar` | Global | Presentational | Stable | Baja | P1 | Progreso de operación. | `color-primary`, `radius-pill`, `spacing-2` |
| `EmptyState` | Global | Presentational | Stable | Baja | P0 | Estado vacío con mensaje y CTA. | `color-text-secondary`, `spacing-6`, `font-size-lg` |
| `ErrorState` | Global | Presentational | Stable | Baja | P0 | Mensaje de error con reintentar. | `color-danger`, `spacing-6` |
| `NoPermissionState` | Global | Presentational | Stable | Baja | P1 | Mensaje de acceso denegado. | `color-warning`, `spacing-6` |

### `Toast`

| Campo | Valor |
|---|---|
| **Props** | `id: string`, `message: string`, `variant: 'success' \| 'error' \| 'warning' \| 'info'` (default: `'info'`), `duration?: number` (default: `5000`), `onClose: (id: string) => void` |
| **Eventos** | `onClose` |
| **Estados** | → estándar; animación de entrada/salida |
| **Accesibilidad** | `role="alert"`, `aria-live="polite"`, cierre con `Escape` opcional. |
| **Dependencias** | `Alert`, `IconButton`, `Icon`, `ToastContainer` |
| **Usado por** | Páginas y containers tras mutaciones. |
| **Composición** | Puede contener: `Alert`, `IconButton`. No puede contener: `Modal`, `Form`. |
| **Prohibiciones** | No inicia acciones del usuario; solo comunica resultado. |

---

## 9.4 Overlay

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Modal` | Global | Presentational | Stable | Media | P0 | Ventana superpuesta. | `color-surface`, `shadow-lg`, `radius-lg`, `z-index-modal` |
| `Drawer` | Global | Presentational | Stable | Media | P0 | Panel lateral deslizable. | `color-surface`, `shadow-lg`, `z-index-drawer` |
| `ConfirmDialog` | Global | Container | Stable | Media | P0 | Diálogo de confirmación. | `color-surface`, `radius-lg`, `shadow-lg` |
| `Popover` | Global | Presentational | Stable | Media | P1 | Panel flotante vinculado a ancla. | `color-surface`, `shadow-md`, `radius-md` |
| `Tooltip` | Global | Presentational | Stable | Baja | P1 | Pequeña etiqueta explicativa. | `color-dark`, `color-text-primary-inverse`, `radius-sm` |

### `ConfirmDialog`

| Campo | Valor |
|---|---|
| **Props** | `isOpen: boolean`, `title: string`, `message: string`, `confirmLabel?: string` (default: `'Confirmar'`), `cancelLabel?: string` (default: `'Cancelar'`), `variant?: 'danger' \| 'primary'` (default: `'primary'`), `onConfirm: () => void`, `onCancel: () => void` |
| **Eventos** | `onConfirm`, `onCancel` |
| **Estados** | → estándar |
| **Accesibilidad** | Foco capturado, cierre con `Escape`, roles `dialog` y `alertdialog`. |
| **Dependencias** | `Modal`, `Button`, `Typography` |
| **Usado por** | `AdminDataTable`, cualquier acción destructiva. |
| **Composición** | Puede contener: `Modal`, `Button`, `Typography`, `Alert`. No puede contener: `Form`, `Drawer`. |
| **Prohibiciones** | No ejecuta la acción; emite `onConfirm` para que el consumidor decida. |

---

## 9.5 Navigation

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Breadcrumb` | Global | Presentational | Stable | Baja | P0 | Migas de pan. | `color-text-secondary`, `color-link`, `spacing-2` |
| `Pagination` | Global | Presentational | Stable | Media | P0 | Navegación de páginas. | `color-border`, `radius-md`, `spacing-2` |
| `Tabs` | Global | Presentational | Stable | Baja | P0 | Pestañas de contenido. | `color-border`, `color-primary`, `spacing-4` |
| `Sidebar` | Feature (Panel) | Container | Stable | Media | P0 | Menú lateral del panel. | `color-surface`, `spacing-4`, `z-index-fixed` |
| `Navbar` | Feature (Público) | Container | Stable | Media | P0 | Barra superior del catálogo. | `color-background`, `shadow-sm`, `spacing-4` |

### `Pagination`

| Campo | Valor |
|---|---|
| **Props** | `page: number`, `totalPages: number`, `total: number`, `onPageChange: (page: number) => void` |
| **Eventos** | `onPageChange` |
| **Estados** | → estándar; `Disabled` para página actual. |
| **Accesibilidad** | `nav` con `aria-label="Paginación"`, enlaces con `aria-current="page"`. |
| **Dependencias** | `Button`, `Icon` |
| **Usado por** | `DataTable`, `AdminDataTable`, `DataGrid`, páginas de listado. |
| **Composición** | Puede contener: `Button`, `Icon`. No puede contener: `Form`. |
| **Prohibiciones** | No cambia la URL; solo emite el cambio de página. |

---

## 9.6 Data Display

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Card` | Global | Presentational | Stable | Baja | P0 | Contenedor con estilo de tarjeta. | `color-background-card`, `radius-md`, `shadow-sm`, `spacing-4` |
| `Table` | Global | Presentational | Stable | Baja | P0 | Tabla HTML semántica. | `color-border`, `spacing-3`, `font-size-md` |
| `DataTable` | Global | Presentational | Stable | Alta | P0 | Tabla con ordenamiento, paginación y acciones; hasta ~100 filas. | `color-background-card`, `color-border`, `radius-md`, `spacing-3` |
| `DataGrid` | Global | Presentational | Experimental | Alta | P2 | Grid de datos con tarjetas; preparado para virtualización futura. | `color-background-card`, `spacing-4`, `shadow-sm` |
| `Avatar` | Global | Presentational | Stable | Baja | P1 | Imagen de usuario o entidad. | `radius-circle`, `color-background-disabled` |
| `Image` | Global | Presentational | Stable | Baja | P0 | Imagen optimizada con fallback. | `radius-md`, `color-background-disabled` |
| `ImageGallery` | Feature (Catálogo) | Presentational | Stable | Media | P1 | Galería de imágenes de producto. | `radius-md`, `color-border`, `spacing-2` |
| `ImageUploader` | Feature (Panel) | Container | Stable | Alta | P0 | Subida y gestión de imágenes. | `color-border`, `radius-md`, `spacing-4` |

### `DataTable` vs `DataGrid`

| Aspecto | `DataTable` | `DataGrid` |
|---|---|---|
| **Presentación** | Filas y columnas. | Tarjetas o celdas en grid. |
| **Uso principal** | CRUD del panel, listados administrativos. | Catálogo público, grandes volúmenes. |
| **Volumen esperado en v1** | Hasta ~100 filas por página. | Sin límite estricto; preparado para virtualización futura. |
| **Funciones en v1** | Ordenamiento, paginación, acciones por fila, búsqueda. | Renderizado de tarjetas, paginación. |
| **Virtualización** | No requerida en v1. | Reservada para evolución futura. |
| **Selección múltiple** | No en v1. | No en v1. |

### `DataTable`

| Campo | Valor |
|---|---|
| **Props** | `columns: Column<T>[]`, `data: T[]`, `sortable?: boolean`, `onSort?: (key: string, direction: 'asc' \| 'desc') => void`, `pagination?: PaginationMeta`, `onPageChange?: (page: number) => void`, `actions?: (row: T) => Action[]`, `loading?: boolean`, `emptyMessage?: string` |
| **Eventos** | `onSort`, `onPageChange`, `actions[].onClick` |
| **Estados** | → estándar; `Loading`, `Empty` |
| **Accesibilidad** | Tabla semántica, encabezados ordenables con teclado, acciones con `aria-label`. |
| **Dependencias** | `Table`, `Pagination`, `Button`, `Icon`, `Skeleton`, `EmptyState` |
| **Usado por** | `AdminDataTable`, `AuditTable`. |
| **Composición** | Puede contener: `Table`, `Pagination`, `Button`, `Skeleton`, `EmptyState`. No puede contener: `Modal`, `Form`. |
| **Prohibiciones** | No ejecuta acciones destructivas; delega al consumidor. |

---

## 9.7 Layout

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `Container` | Global | Presentational | Stable | Baja | P0 | Contenedor centrado con ancho máximo. | `container-max-width-*`, `container-padding-x` |
| `Stack` | Global | Presentational | Stable | Baja | P0 | Apilamiento vertical/horizontal con gap. | `spacing-*` |
| `Grid` | Global | Presentational | Stable | Baja | P0 | Sistema de columnas. | `grid-gutter`, `grid-columns`, `spacing-*` |
| `Section` | Global | Presentational | Stable | Baja | P0 | Sección semántica con separación. Tono inverso propaga variables de texto para sus hijos (`UDS-12`). | `spacing-7`, `color-background`, `color-surface-inverse`, `color-volt-500` |
| `PageHeader` | Global | Presentational | Stable | Baja | P0 | Cabecera de página con título y acciones. | `spacing-5`, `font-size-2xl`, `color-text-heading` |
| `Divider` | Global | Presentational | Stable | Baja | P0 | Separador visual. | `color-border`, `border-width-thin` |

> **Nota:** `AdminLayout` y `PublicLayout` son layouts de aplicación, no componentes reutilizables. Se documentan en `06_FRONTEND.md` y `07_PANEL_ADMIN.md`.

---

## 9.8 Domain — Catálogo público

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `ProductCard` | Feature (Catalog) | Presentational | Stable | Baja | P0 | Tarjeta de producto en listados. | `color-background-card`, `radius-md`, `shadow-sm`, `spacing-4` |
| `ProductGrid` | Feature (Catalog) | Presentational | Stable | Baja | P0 | Grid de tarjetas de producto. | `grid-gutter`, `spacing-4` |
| `ProductGallery` | Feature (Products) | Presentational | Stable | Media | P1 | Galería de imágenes en ficha de producto. | `radius-md`, `color-border`, `spacing-2` |
| `ProductFilters` | Feature (Catalog) | Container | Stable | Alta | P0 | Panel de filtros del catálogo. | `color-background-card`, `spacing-4`, `radius-md` |
| `ProductSearch` | Feature (Catalog) | Container | Stable | Media | P0 | Buscador del catálogo. | `color-background-card`, `spacing-3`, `radius-md` |
| `FiltersPanel` | Feature (Catalog) | Presentational | Stable | Media | P0 | Panel colapsable de filtros. | `color-background-card`, `spacing-4`, `radius-md` |
| `VariantSelector` | Feature (Products) | Container | Stable | Alta | P0 | Selector de color y talle. | `spacing-3`, `radius-md`, `color-border` |
| `ColorSelector` | Feature (Products) | Presentational | Internal | Baja | P1 | Selector de color (uso interno). | `radius-md`, `color-border`, `color-border-focus` |
| `SizeSelector` | Feature (Products) | Presentational | Internal | Baja | P1 | Selector de talle (uso interno). | `radius-md`, `color-border`, `color-border-focus` |
| `PriceBadge` | Feature (Catalog) | Presentational | Stable | Baja | P0 | Precio con oferta y descuento. | `color-text-primary`, `color-danger`, `font-size-md` |
| `PromotionBadge` | Feature (Catalog) | Presentational | Stable | Baja | P0 | Badge de promoción vigente. | `color-danger`, `radius-pill` |
| `AvailabilityBadge` | Feature (Catalog) | Presentational | Stable | Baja | P0 | Badge de disponibilidad (3 estados desde v1.4.0: Disponible/Stock bajo/No disponible). | `color-success`, `color-warning`, `color-danger`, `radius-pill` |
| `CartDrawer` | Feature (Cart) | Container | Stable | Alta | P0 | Drawer del carrito de consulta. | `color-surface`, `shadow-lg`, `spacing-4` |
| `CartItem` | Feature (Cart) | Presentational | Stable | Baja | P0 | Ítem del carrito. | `color-border`, `spacing-3`, `radius-md` |
| `WhatsAppButton` | Feature (Cart) | Container | Stable | Media | P0 | Botón de envío por WhatsApp. | `color-success`, `color-action-success-text`, `radius-md` |
| `WhatsAppSummary` | Feature (Cart) | Presentational | Stable | Media | P1 | Resumen del mensaje de WhatsApp. | `color-background-card`, `spacing-4`, `radius-md` |
| `Tag` | Global | Presentational | Stable | Baja | P0 | Distintivo corto de catálogo: «Nuevo», «Destacado». | `color-badge-*`, `radius-pill`, `font-size-2xs` |
| `Carousel` | Global | Presentational | Stable | Media | P0 | Carril de desplazamiento horizontal con `scroll-snap` (`UDS-08`). | `carousel-visible-*`, `carousel-gap`, `carousel-control-size` |
| `SectionHeader` | Global | Presentational | Stable | Baja | P0 | Encabezado de sección con eyebrow, título y enlace de escape. Colores heredados del tono de `Section` (`UDS-12`), nunca fijos. | `section-header-gap`, `font-size-2xl`, `letter-spacing-tight` |
| `MediaTile` | Global | Presentational | Stable | Baja | P0 | Pieza de contenido con imagen administrable y fallback tipográfico (`UDS-09`). | `aspect-brand`, `aspect-category`, `radius-media`, `color-border` |
| `Hero` | Feature (Store) | Presentational | Stable | Media | P0 | Pieza única de portada, administrable. Fondo con halo radial (`color-ink-800`/`900`) en vez de tinta plana. | `aspect-hero`, `color-overlay-hero`, `font-size-display`, `color-ink-800` |
| `BrandRail` | Feature (Store) | Container | Stable | Baja | P1 | Carril de marcas del catálogo. | `carousel-visible-brands`, `aspect-brand` |
| `CategoryRail` | Feature (Store) | Container | Stable | Media | P1 | Accesos comerciales por sexo y categoría. | `carousel-visible-categories`, `aspect-category` |
| `ProductRail` | Feature (Catalog) | Container | Stable | Media | P0 | Carrusel compacto de productos de una consulta. | `carousel-visible-products`, `carousel-gap` |
| `PublicNavbar` | Feature (Store) | Container | Stable | Alta | P0 | Navegación superior del catálogo. | `color-surface-inverse`, `z-index-sticky`, `letter-spacing-wide` |
| `MegaMenu` | Feature (Store) | Presentational | Stable | Media | P0 | Panel de subcategorías de un eje comercial. | `color-ink-800`, `shadow-md`, `z-index-dropdown` |
| `PublicFooter` | Feature (Store) | Presentational | Stable | Media | P0 | Pie del catálogo con datos reales de la tienda. | `color-surface-inverse`, `color-text-inverse-muted` |
| `TrustBar` | Feature (Store) | Presentational | Stable | Baja | P1 | Franja de 4 mensajes fijos de confianza, entre Promociones e Historia. | `color-border`, `color-text-secondary`, `spacing-5` |

### `ProductCard`

| Campo | Valor |
|---|---|
| **Props** | `product: ProductListItemDTO`, `variant?: 'grid' \| 'rail' \| 'compact'` (default: `'grid'`), `priority?: boolean` (default: `false`) |
| **Eventos** | Ninguno; la tarjeta es un enlace. |
| **Estados** | → estándar (`Default`, `Hover`, `Focus`); `Skeleton` durante la carga del listado. |
| **Accesibilidad** | La tarjeta entera es un único enlace; los distintivos no son focoables. `alt` de la imagen = nombre del producto. El anillo de foco lo dibuja la tarjeta, no el enlace interno, porque el objetivo accionable es la superficie completa. |
| **Dependencias** | `ProductListItemDTO`, `Image`, `PriceBadge`, `PromotionBadge`, `AvailabilityBadge`, `Link` |
| **Usado por** | `ProductGrid`, `ProductRail`, `SearchResults`, `RelatedProducts` |
| **Composición** | Puede contener: `Image`, `Badge`, `PriceBadge`, `AvailabilityBadge`. No puede contener: `Modal`, `Form`, `Carousel`, `Button`. |
| **Tokens** | `aspect-product`, `radius-media`, `color-surface`, `color-border`, `shadow-md` (solo hover), `color-price-*`, `font-size-sm`, `letter-spacing-wider` |
| **Prohibiciones** | No calcula precios ni descuentos; no llama a la API; no contiene lógica de negocio; no cambia de estructura por viewport (`variant` es explícita, no automática). |

#### Anatomía

```
┌─────────────────────────────┐
│ [-30%]            [NUEVO]   │  distintivos, esquinas superiores
│                             │
│        imagen 1:1           │  contain sobre color-surface
│        contain              │
│                             │
├─────────────────────────────┤
│ NIKE                        │  marca — xs / 600 / wider / MAYÚS
│ Botín Mercurial Vapor 15    │  nombre — 2 líneas máximo
│ Gs. 890.000  Gs. 1.270.000  │  precio vigente + lista tachado
│ ● Stock bajo                │  disponibilidad, solo si no es normal
└─────────────────────────────┘
```

Reglas: la imagen es el 70 % de la altura de la tarjeta. El nombre se recorta a dos líneas con altura reservada, de modo que dos tarjetas contiguas nunca se desalinean. La disponibilidad solo se muestra cuando aporta urgencia o advertencia (`low_stock`, `out_of_stock`); `available` no dibuja nada, porque decir lo esperable es ruido. **v1.4.0 (`RN-38b`):** el estado se deriva de la cantidad real cargada por variante (`derive_availability`, `05_API.md` §10.5) — "Últimas unidades" pasa a llamarse **"Stock bajo"** y "Sin stock" pasa a llamarse **"No disponible"**; se retira el estado `coming_soon`.

#### Variantes

| Variante | Ancho | Diferencias |
|---|---|---|
| `grid` | Columna de la grilla | Tamaños completos. |
| `rail` | `carousel-visible-products` | Idéntica a `grid`; solo cambia cómo la mide el contenedor. Sin altura fija: la alineación la da el `grid` interno. |
| `compact` | Contextos densos | Relleno y tipografía menores. |

> `MobileProductCard` y `DesktopProductCard` siguen prohibidos (§10). `variant` es una decisión de composición del consumidor, no del viewport.

#### Por qué no hay acción de agregar al carrito

`RN-53` fija la **variante** como unidad del carrito, y `ProductListItemDTO` no transporta variantes: solo `slug`, `name`, `brand`, `primary_category`, precios, `availability`, `is_new`, `is_featured` y `thumbnail_url`. Un botón de «agregar» en el listado tendría que elegir un color y un talle por el cliente, o inventar una variante por defecto que el modelo no define. La selección vive en la ficha, donde está `VariantSelector`.

### `Carousel`

| Campo | Valor |
|---|---|
| **Props** | `children: ReactNode`, `label: string`, `metric?: 'products' \| 'brands' \| 'categories' \| 'single'` (default: `'products'`), `controls?: boolean` (default: `true`), `bleed?: boolean` (default: `false`) |
| **Eventos** | Ninguno hacia afuera. |
| **Estados** | `Default`; controles en `Disabled` cuando no hay hacia dónde desplazar; controles ocultos por completo si el contenido no desborda. |
| **Accesibilidad** | `role="group"` con `aria-roledescription="carrusel"` y `aria-label={label}`. Los controles llevan `aria-label` explícito. El carril **no** recibe `tabindex`: cada pieza ya es focoable y el navegador la desplaza sola. Con `prefers-reduced-motion` el desplazamiento es instantáneo. |
| **Dependencias** | `IconButton`, `Icon` |
| **Usado por** | `BrandStrip` (`BrandRail`), `ProductRail`, `BannerRail`. **No** por `Hero`: es una pieza única, no un carril. |
| **Composición** | Puede contener cualquier pieza presentacional. No puede contener: `Modal`, `Drawer`, otro `Carousel`. |
| **Tokens** | `carousel-visible-*`, `carousel-gap`, `carousel-control-size`, `carousel-scroll-padding`, `shadow-md`, `radius-pill` |
| **Prohibiciones** | No usa bibliotecas externas (`UDS-08`, `VIS-07`); no reproduce automáticamente; no clona piezas para simular bucle infinito; no oculta la barra de desplazamiento en dispositivos donde es el único indicador de que hay más contenido. |

#### Mecánica

- Carril: `display: grid; grid-auto-flow: column; grid-auto-columns: <ancho derivado de la métrica>; overflow-x: auto; scroll-snap-type: x mandatory; gap: carousel-gap`.
- La métrica **no viaja como número por props**: `metric` selecciona el token de §7.6, que ya escala por breakpoint. Pasar `{ xs: 2.2, md: 3.5, … }` habría metido valores de diseño dentro del JSX, que es exactamente lo que prohíbe `UDS-01`.
- Pieza: `scroll-snap-align: start`.
- Controles: `scrollBy({ left: ±anchoVisible, behavior })`, donde `behavior` es `smooth` o `auto` según `prefers-reduced-motion`.
- Desbordamiento: se compara `scrollWidth` con `clientWidth` mediante `ResizeObserver`; si no desborda, los controles no se renderizan.
- El bucle infinito queda descartado a propósito: duplica nodos, rompe el orden de tabulación y confunde a los lectores de pantalla.

### `MediaTile`

| Campo | Valor |
|---|---|
| **Props** | `name: string`, `href: string`, `imageUrl?: string \| null`, `aspect: 'brand' \| 'category'`, `eyebrow?: string`, `tone?: 'light' \| 'inverse'` |
| **Eventos** | Ninguno; es un enlace. |
| **Estados** | `Default`, `Hover`, `Focus`; **`Fallback`** cuando `imageUrl` es nulo o vacío. |
| **Accesibilidad** | Enlace único con texto accesible = `name`. En variante con imagen, `alt=""` porque el nombre ya está en el texto visible: la imagen es decorativa. |
| **Dependencias** | `Image`, `Link` |
| **Usado por** | `BrandRail`, `CategoryRail` |
| **Composición** | Puede contener: `Image`. No puede contener: `Button`, `Modal`. |
| **Tokens** | `aspect-brand`, `aspect-category`, `radius-media`, `color-border`, `color-surface`, `letter-spacing-wider`, `color-overlay-media` |
| **Prohibiciones** | **No incrusta rutas de imagen fijas** (`UDS-09`, `VIS-08`). No inventa un logotipo cuando no hay imagen. |

#### Estado `Fallback` — el que se usará al inicio

Sin imagen, la pieza **no** muestra un hueco gris: muestra el nombre compuesto tipográficamente, en mayúsculas, con `letter-spacing-wider`, centrado sobre `color-surface` y con filete `color-border`. Al pasar el puntero o recibir foco, la superficie se invierte a `color-ink-900` con texto blanco. Es una solución deliberada y presentable, no un marcador de posición.

> **REQUIERE CAMBIO DE BACKEND** — para que `imageUrl` llegue con contenido real hacen falta: columna de imagen en `brands` y en `categories`, espacio de nombres de almacenamiento propio en `local_storage.py` con sus anchos en `99_AI_DEVELOPMENT_GUIDE.md` §17.1, endpoint administrativo `multipart/form-data`, exposición del campo en `BrandDTO` y `CategoryTreeDTO`, y campo de carga en el panel. **Nada de esto se implementa en la fase visual.** El componente ya queda preparado para recibirlo.

### `Hero`

> **Corrección (v2.2.0):** v2.0.0 había documentado esto como `HeroCarousel`,
> un carrusel de varias piezas. Lo que se construyó —y lo que pidió el
> negocio, ver `01_ANALISIS_NEGOCIO.md`— es lo opuesto a propósito: **una
> sola pieza, nunca una rotación**. La portada abre con una afirmación; un
> carrusel obliga a esperar para leerla entera y mueve el contenido bajo el
> puntero. Esta entrada se corrige para describir el componente real.

| Campo | Valor |
|---|---|
| **Props** | `banner: BannerDTO \| null`, `titleId?: string` (default: `'hero-title'`) |
| **Eventos** | Ninguno. |
| **Estados** | `Default` (con imagen); `Plain` (sin `image_url`: se sostiene con tipografía sobre `color-ink-900`, no deja un hueco); no se renderiza si `banner` es `null` —la Home continúa sin hueco—. |
| **Accesibilidad** | El título del banner es un `<h2>` (`id={titleId}`); el `<h1>` de la Home es un encabezado propio, oculto visualmente. `alt=""` en la imagen: el titular visible ya dice lo mismo, repetirlo duplicaría el anuncio del lector de pantalla. |
| **Dependencias** | `BannerDTO`, `Image`, `Link` |
| **Usado por** | `HomePage` |
| **Composición** | Puede contener: `Image`, `Link`. No puede contener: `Carousel`, `ProductCard`. |
| **Tokens** | `aspect-hero`, `color-overlay-hero`, `font-size-display`, `color-action-accent-bg` |
| **Prohibiciones** | No es un carrusel y no debe volver a serlo (ver nota de corrección arriba). No asume `description` ni identificador público del banner: el contrato real es `title`, `subtitle`, `image_url`, `link_url`, `button_label`, `placement`, `position` (§10.3). Si hay más de una pieza en la zona `hero`, se publica la de menor `position`; las demás no se muestran acá. No renderiza el botón primario cuando `link_url` es nulo — el secundario a Promociones es fijo y siempre se muestra. |

Es el elemento con mayor peso visual de la portada y la única imagen que justifica precarga: se pide sin diferir (`lazy={false}`) y con `fetchpriority="high"`, porque es el LCP de la página.

### `PublicNavbar`

| Campo | Valor |
|---|---|
| **Props** | `storeSettings: StoreSettingsPublicDTO`, `axes: NavAxis[]`, `cartCount: number` |
| **Eventos** | `onSearchSubmit` |
| **Estados** | `Default`, `Scrolled` (aparece `shadow-sm`), `MenuOpen` (móvil), `SearchOpen` (móvil). |
| **Accesibilidad** | `<header>` + `<nav aria-label="Principal">`. Cada eje es un `<button aria-expanded>` que controla su `MegaMenu`; `Escape` cierra y devuelve el foco. El contador del carrito se anuncia con texto para lector de pantalla, no solo con el número. Primer elemento tabulable: «Saltar al contenido». |
| **Dependencias** | `MegaMenu`, `SearchInput`, `IconButton`, `Drawer`, `Accordion`, `Link` |
| **Usado por** | `PublicLayout` |
| **Composición** | Puede contener: `MegaMenu`, `SearchInput`, `Drawer`, `Accordion`. No puede contener: `Carousel`, `Modal`. |
| **Tokens** | `color-surface-inverse`, `color-text-inverse`, `color-border-focus-inverse`, `letter-spacing-wide`, `z-index-sticky` |
| **Prohibiciones** | No incluye «Nosotros» ni «Contacto» — viven en el pie. No construye la marca con una imagen fija: hoy la identidad es el nombre de `storeSettings` compuesto tipográficamente. |

> **REQUIERE CAMBIO DE BACKEND** — un logotipo administrable exigiría un campo de imagen en `store_settings` con su carga en el panel. Mientras no exista, la marca es un logotipo tipográfico derivado de `store_name`, que además nunca queda desactualizado respecto de la configuración.

#### Ejes de navegación

`NavAxis` es una composición de datos reales, no una categoría inventada (ver [08_UI_SYSTEM.md](08_UI_SYSTEM.md) y el modelo de `products`):

| Eje | Origen | Destino |
|---|---|---|
| `HOMBRES` | `gender` = `men,unisex` | `/catalogo?gender=men,unisex` |
| `MUJERES` | `gender` = `women,unisex` | `/catalogo?gender=women,unisex` |
| `NIÑOS` | `gender` = `boys,girls` | `/catalogo?gender=boys,girls` |
| `ACCESORIOS` | Categoría raíz `accesorios` | `/catalogo?category=accesorios` |
| `NOVEDADES` | Filtro `is_new` | `/catalogo?is_new=true` |
| `PROMOCIONES` | Filtro `on_sale` | `/catalogo?on_sale=true` |

`PROMOCIONES` y `NOVEDADES` no abren panel y llevan directo al listado
filtrado; `PROMOCIONES` además se distingue con un filete `volt` bajo la
etiqueta, el único uso del acento en la barra.

> **`NOVEDADES` del navbar ≠ sección "Novedades" de la Home.** El eje de
> arriba es un atajo de navegación sobre `products.is_new` (marca manual del
> administrador, `RN-43`). La sección "Novedades" que aparece en la Home
> justo debajo del hero es otra cosa: un carril editorial de imágenes
> grandes, administrado como `Banner` con `placement="news"`
> (`04_BASE_DATOS.md` §9.2.11, `07_PANEL_ADMIN.md` §14.6). No hay que
> confundirlos ni intentar unificarlos — son dos formas distintas de mostrar
> "lo nuevo": una por producto, otra editorial y curada a mano.

### `MegaMenu`

| Campo | Valor |
|---|---|
| **Props** | `axis: NavAxis`, `categories: CategoryTreeDTO[]`, `brands: BrandDTO[]`, `isOpen: boolean`, `onClose: () => void` |
| **Eventos** | `onClose` |
| **Estados** | `Closed`, `Open`; `Empty` si el eje no tiene categorías **ni marcas** cargadas —en cuyo caso el eje enlaza directo y no despliega nada—. |
| **Accesibilidad** | Panel de navegación, **no** diálogo: no captura el foco. Se cierra con `Escape`, al salir con `Tab` o al perder el puntero con retardo `delay-short`. |
| **Dependencias** | `CategoryTreeDTO`, `BrandDTO`, `MediaTile`, `Link` |
| **Usado por** | `PublicNavbar` |
| **Composición** | Puede contener: `Link`, `MediaTile` (bloque "Marcas"). No puede contener: `Carousel`, `Form`, `ProductCard`. |
| **Tokens** | `color-ink-800`, `color-text-inverse`, `shadow-md`, `spacing-5`, `z-index-dropdown` |
| **Prohibiciones** | No fabrica categorías ni marcas que no existan en la base. No duplica el árbol por sexo: combina el eje con las categorías y marcas reales. |

Cada enlace del panel compone eje + categoría: `/catalogo?gender=<eje>&category=<slug>`. El primer elemento del panel es siempre «Ver todo <EJE>», que enlaza solo con el eje.

**v1.4.0 — bloque "Marcas".** Cada panel agrega, además de las categorías, un
bloque "Marcas" con **todas** las marcas activas (no solo las destacadas,
mismo catálogo que `BrandStrip`), usando `MediaTile` con el mismo fallback
tipográfico cuando la marca no tiene logotipo cargado (`UDS-09`). Cada
enlace compone eje + marca: `/catalogo?gender=<eje>&brand=<slug>`. Es el
mismo listado de marcas en los tres ejes de sexo — las marcas no tienen
sexo propio en el modelo, el filtro de sexo lo aporta el eje, no la marca.

### `PublicFooter`

| Campo | Valor |
|---|---|
| **Props** | `storeSettings: StoreSettingsPublicDTO` |
| **Eventos** | Ninguno. |
| **Estados** | `Default`; cada bloque se omite si su dato no está cargado. |
| **Accesibilidad** | `<footer>` con encabezados por columna; en móvil el acordeón usa `aria-expanded`. Los datos de contacto no se colapsan. |
| **Dependencias** | `StoreSettingsPublicDTO`, `Accordion`, `Link`, `Icon` |
| **Usado por** | `PublicLayout` |
| **Composición** | Puede contener: `Accordion`, `Link`, `Icon`. No puede contener: `Form`, `Carousel`. |
| **Tokens** | `color-surface-inverse`, `color-text-inverse`, `color-text-inverse-muted`, `border-inverse`, `section-gap-y` |
| **Prohibiciones** | No inventa datos comerciales —envíos, garantías, medios de pago— que la tienda no haya declarado. Solo muestra lo que existe en `store_settings`. |

#### Estructura

| Columna | Contenido | Origen |
|---|---|---|
| **1 — Marca** | Logotipo tipográfico, frase breve, redes. | `store_name`, `social_links` |
| **2 — Comprar** | Hombres, Mujeres, Niños, Accesorios, Promociones. | Mismos ejes del navbar |
| **3 — La tienda** | Nosotros, Contacto. | Rutas existentes |
| **4 — Contacto** | WhatsApp, dirección, horarios. | `whatsapp_number`, `address`, `business_hours` |

### `TrustBar` (v2.3.0)

| Campo | Valor |
|---|---|
| **Props** | Ninguna. |
| **Eventos** | Ninguno. |
| **Estados** | `Default` únicamente — no depende de datos remotos. |
| **Accesibilidad** | `<section aria-label="Beneficios de comprar en Pablito Sports">`; cada ícono es `aria-hidden`, el texto visible es lo único que anuncia el lector de pantalla. |
| **Dependencias** | Ninguna — glifos SVG en línea, sin `Carousel` ni `Image`. |
| **Usado por** | `HomePage`, entre `BannerRail placement="promo"` y `StoryBlock`. |
| **Composición** | Cuatro ítems fijos: envíos, cuotas, cambios, atención. No administrable — a diferencia de banners o historia, estos mensajes no varían por campaña. |
| **Tokens** | `color-border`, `color-text-primary`, `color-text-secondary`, `spacing-5`, `font-size-sm` |
| **Prohibiciones** | Ningún mensaje puede prometer algo que el negocio no ofrece hoy (`01_ANALISIS_NEGOCIO.md`) — en particular, ninguno asume checkout ni cuenta de cliente propios, que no existen. El texto de cuotas ("Hasta 12 cuotas sin interés") es contenido real confirmado por el usuario el 17/08/2026, no una cifra de la imagen de referencia copiada sin verificar. |

### `ProductRail`

| Campo | Valor |
|---|---|
| **Props** | `title: string`, `eyebrow?: string`, `query: ProductListQuery`, `href: string`, `limit?: number` |
| **Eventos** | Ninguno. |
| **Estados** | `Loading` (esqueletos con la misma métrica del carril), `Empty` (la sección entera no se renderiza), `Error` (mensaje discreto sin romper la Home). |
| **Accesibilidad** | `<section aria-labelledby>` con el título del `SectionHeader`. |
| **Dependencias** | `SectionHeader`, `Carousel`, `ProductCard`, `useProducts` |
| **Usado por** | `HomePage`, `ProductDetailPage` |
| **Composición** | Puede contener: `SectionHeader`, `Carousel`, `ProductCard`. No puede contener: `FiltersPanel`, `Pagination`. |
| **Tokens** | `carousel-visible-products`, `section-gap-y`, `section-header-gap` |
| **Prohibiciones** | **No envía `per_page` cuando la consulta es de destacados**: hacerlo anularía `featured_products_count`, que es la cantidad que el administrador decide desde el panel. Un carril vacío no deja hueco ni encabezado suelto. |

### `VariantSelector`

| Campo | Valor |
|---|---|
| **Props** | `colors: ColorDTO[]`, `sizes: SizeDTO[]`, `selectedVariant?: VariantDTO`, `onChange: (variant: VariantDTO \| null) => void` |
| **Eventos** | `onChange` |
| **Estados** | → estándar; `Error` si no se selecciona antes de agregar al carrito. |
| **Accesibilidad** | Grupo de opciones con `role="radiogroup"`, foco visible, etiquetas. |
| **Dependencias** | `ColorDTO`, `SizeDTO`, `VariantDTO`, `ColorSelector`, `SizeSelector`, `Alert` |
| **Usado por** | `ProductDetailPage` |
| **Composición** | Puede contener: `ColorSelector`, `SizeSelector`, `Alert`. No puede contener: `Button` (la acción es externa). |
| **Tokens** | `spacing-3`, `radius-md`, `color-border`, `color-border-focus` |
| **Prohibiciones** | No agrega al carrito; solo emite la variante seleccionada. |

> **Nota de API:** `VariantSelector` es el único componente público para selección de variantes. Internamente puede renderizar botones, `Select` o `Radio`, pero esa decisión es interna y no expone subcomponentes alternativos.

### `CartDrawer`

| Campo | Valor |
|---|---|
| **Props** | `isOpen: boolean`, `onClose: () => void`, `items: CartItemDTO[]` |
| **Eventos** | `onClose`, `onQuantityChange`, `onRemove`, `onCheckout` |
| **Estados** | → estándar; `Loading` durante revalidación. |
| **Accesibilidad** | Foco capturado dentro del drawer, cierre con `Escape`, rol `dialog`. |
| **Dependencias** | `CartItemDTO`, `Drawer`, `CartItem`, `Button`, `WhatsAppButton`, `WhatsAppSummary` |
| **Usado por** | `PublicLayout` |
| **Composición** | Puede contener: `Drawer`, `CartItem`, `Button`, `WhatsAppSummary`. No puede contener: `Modal`. |
| **Tokens** | `color-surface`, `shadow-lg`, `spacing-4`, `z-index-drawer` |
| **Prohibiciones** | No genera el enlace de WhatsApp directamente; usa `WhatsAppButton`. |

---

## 9.9 Domain — Panel administrativo

| Componente | Nivel | Tipo | Est. | Compl. | Prio. | Propósito | Tokens principales |
|---|---|---|---|---|---|---|---|
| `AdminDataTable` | Feature (Admin) | Container | Stable | Alta | P0 | Tabla de administración con acciones CRUD. | `color-background-card`, `radius-md`, `shadow-sm`, `spacing-4` |
| `AuditTable` | Feature (Admin) | Presentational | Stable | Media | P1 | Tabla de registros de auditoría. | `color-background-card`, `spacing-4`, `radius-md` |
| `HistoryTimeline` | Feature (Admin) | Presentational | Stable | Media | P1 | Línea de tiempo de historial de precios. | `color-border`, `spacing-4`, `font-size-sm` |
| `PriceHistoryWidget` | Feature (Admin) | Presentational | Stable | Baja | P1 | Widget de últimos cambios de precio. | `color-background-card`, `spacing-3`, `radius-md` |
| `StatusBadge` | Feature (Admin) | Presentational | Stable | Baja | P0 | Badge de estado para entidades del panel. | `color-success`, `color-warning`, `color-danger`, `radius-pill` |
| `VariantMatrix` | Feature (Admin) | Presentational | Stable | Alta | P1 | Matriz de combinaciones color/talle, con cantidad editable y estado derivado (v1.4.0). | `color-border`, `spacing-2`, `radius-md`, `color-success`, `color-warning`, `color-danger` |
| `ImageReorder` | Feature (Admin) | Container | Experimental | Alta | P1 | Reordenamiento drag-and-drop de imágenes. | `color-border`, `spacing-2`, `radius-md` |

### `AdminDataTable`

| Campo | Valor |
|---|---|
| **Props** | `columns: Column<T>[]`, `data: T[]`, `onEdit?: (row: T) => void`, `onDelete?: (row: T) => void`, `onFilter?: (filters: FilterState) => void`, `onSort?: (key: string, direction: 'asc' \| 'desc') => void`, `pagination: PaginationMeta`, `onPageChange: (page: number) => void`, `loading?: boolean` |
| **Eventos** | `onEdit`, `onDelete`, `onFilter`, `onSort`, `onPageChange` |
| **Estados** | → estándar; `Loading`, `Empty`, `Error`. |
| **Accesibilidad** | Tabla semántica, encabezados ordenables con teclado, botones de acción con `aria-label`. |
| **Dependencias** | `DataTable`, `SearchInput`, `FiltersPanel`, `Pagination`, `Button`, `Icon`, `ConfirmDialog` |
| **Usado por** | `ProductListPage`, `CategoryListPage`, `BrandListPage`, `UserListPage`, `AuditPage`, `PriceHistoryPage` |
| **Composición** | Puede contener: `DataTable`, `SearchInput`, `FiltersPanel`, `Pagination`, `ConfirmDialog`. No puede contener: `Form`, `Modal` (salvo confirmación). |
| **Tokens** | `color-background-card`, `spacing-4`, `radius-md`, `shadow-sm` |
| **Prohibiciones** | No ejecuta eliminaciones directamente; confirma mediante `ConfirmDialog`. |

### `ImageUploader`

| Campo | Valor |
|---|---|
| **Props** | `onUpload: (files: File[]) => void`, `maxSize?: number` (default: `5MB`), `acceptedTypes?: string[]` (default: `['image/jpeg', 'image/png', 'image/webp']`), `multiple?: boolean` (default: `true`), `maxFiles?: number` |
| **Eventos** | `onUpload`, `onError` |
| **Estados** | → estándar; `Loading`, `Error`, `Success`. |
| **Accesibilidad** | Input file accesible, mensajes de error asociados con `aria-describedby`. |
| **Dependencias** | `FileInput`, `Button`, `Image`, `ProgressBar`, `Alert` |
| **Usado por** | `ProductEditPage`, `BannerEditPage` |
| **Composición** | Puede contener: `FileInput`, `Button`, `Image`, `ProgressBar`. No puede contener: `Modal`. |
| **Tokens** | `color-border`, `color-border-focus`, `radius-md`, `spacing-4` |
| **Prohibiciones** | No realiza la subida a la API; delega a servicio del feature. |

> **`WhatsappTemplateForm` reincorporado (v2.2.0).** v2.1.0 había retirado
> este componente y su pantalla el mismo día, a pedido del usuario
> (`07_PANEL_ADMIN.md` v1.4.0). El QA funcional posterior a esa tanda
> encontró que Configuración seguía anunciando y enlazando «Editar
> plantilla» hacia una pantalla que ya no existía —un enlace muerto que
> redirigía en silencio al Dashboard—, y el usuario pidió reincorporarlo en
> vez de quitar el enlace (`07_PANEL_ADMIN.md` v1.5.0, §14.8). Vive en
> `features/admin/whatsapp/`: `pages/WhatsappTemplatePage.jsx`,
> `components/WhatsappTemplateForm.jsx`. Edita `message_template` e
> `item_template` con listado de variables, vista previa —compuesta con el
> mismo motor de `features/cart/whatsapp/template.js` que usa el mensaje
> real— y restauración a la plantilla por defecto, contra el contrato de
> `05_API.md` §9.13 que nunca dejó de existir en el backend.
>
> **Sin ruta de nuevo (v2.3.0).** El componente sigue existiendo tal cual se
> describe arriba, pero `AdminRoutes.jsx` ya no lo enlaza — pedido explícito
> del usuario en la misma tanda del rediseño de la Home. A diferencia de la
> retirada de v2.1.0, esta vez el archivo **no se borra**: queda reversible.
> `SettingsPage` y `SeedDataPage` corren la misma suerte (`07_PANEL_ADMIN.md`
> v1.6.0).

---

# 10. Componentes prohibidos

Para evitar duplicaciones y fragmentación, los siguientes componentes **NO existirán**:

| Componente prohibido | Razón | Solución |
|---|---|---|
| `PrimaryButton`, `SecondaryButton`, `SuccessButton`, `DangerButton` | Fragmentan un concepto único. | Usar `Button` con prop `variant`. |
| `ProductTable`, `CategoryTable`, `BrandTable`, `UserTable` | Tablas específicas por entidad. | Usar `DataTable` / `AdminDataTable` con configuración de columnas. |
| `ProductSearchBar`, `CategorySearchBar` | Buscadores específicos por entidad. | Usar `SearchInput` o `ProductSearch` genérico. |
| `MobileProductCard`, `DesktopProductCard` | Variantes por viewport. | Usar `ProductCard` con responsive interno. |
| `AdminButton`, `PublicButton` | Botones por contexto. | Usar `Button` con variantes y tokens. |

La regla general es: **si un componente solo cambia por el contexto en el que se usa, debe resolverse mediante props y tokens, no creando un nuevo componente.**

---

# 11. Qué NO es un componente

`09_COMPONENTES.md` NO documenta:

| Concepto | Dónde se documenta | Ejemplo |
|---|---|---|---|
| **Páginas** | `06_FRONTEND.md` §8, `07_PANEL_ADMIN.md` §11 | `CatalogPage`, `ProductEditPage` |
| **Features** | `06_FRONTEND.md` §6 | `catalog`, `cart`, `admin` |
| **Hooks** | `06_FRONTEND.md` §9, `07_PANEL_ADMIN.md` §10 | `useProducts`, `useAuth` |
| **Servicios** | `05_API.md`, `08_BACKEND.md` | `catalogService`, `adminProductService` |
| **Layouts de aplicación** | `06_FRONTEND.md` §7, `07_PANEL_ADMIN.md` §5 | `PublicLayout`, `AdminLayout` |
| **DTOs / Tipos** | `05_API.md`, `00.3_NOMENCLATURA.md` | `ProductListItemDTO` |
| **Utilidades puras** | `99_AI_DEVELOPMENT_GUIDE.md` | `formatPrice`, `buildWhatsAppLink` |

---

# 12. Relación con `08_UI_SYSTEM.md`

| Regla | Descripción |
|---|---|
| **Tokens únicos** | Cada componente declara qué tokens de `08_UI_SYSTEM.md` utiliza. |
| **No valores concretos** | `09_COMPONENTES.md` nunca documenta colores HEX, tamaños fijos ni espaciados numéricos. |
| **Estados heredados** | Los estados visuales se heredan del UI System. |
| **Accesibilidad compartida** | Los criterios de accesibilidad de `08_UI_SYSTEM.md` §10 aplican a todos. |

---

# 13. Trazabilidad

| Origen | Aplicación en este documento |
|---|---|
| `00.3_NOMENCLATURA.md` | Nombres de componentes; normalizaciones: `PriceTag` → `PriceBadge`, `DiscountBadge` → `PromotionBadge`, `SearchBar` → `ProductSearch`. |
| `02_ARQUITECTURA.md` | Organización por features, niveles de reutilización, separación presentacional/container. |
| `06_FRONTEND.md` | Features y componentes del catálogo público. |
| `07_PANEL_ADMIN.md` | Componentes del panel administrativo. |
| `08_UI_SYSTEM.md` | Tokens, estados visuales, accesibilidad. |
| `09.0_COMPONENTES_ANALISIS_PREVIO.md` | Base del análisis previo aprobado. |

---

# 14. Decisiones resueltas

| ID | Decisión |
|---|---|
| `COMPP-01` | Drag-and-drop de `ImageReorder`: se evaluará en implementación; si requiere librería, se documentará como dependencia justificada en `99_AI_DEVELOPMENT_GUIDE.md`. |
| `COMPP-02` | `DataTable` no soporta selección múltiple en v1. |
| `COMPP-03` | `ImageGallery` no incluye lightbox en v1. |
| `COMPP-04` | `Carousel` no implementa bucle infinito ni reproducción automática: duplicar nodos rompe el orden de tabulación y el movimiento no solicitado perjudica la accesibilidad. |
| `COMPP-05` | `MediaTile` nace con estado `Fallback` como comportamiento normal, no como error: es el estado que usará hasta que exista soporte de imágenes administrables para marcas y categorías. |
| `COMPP-06` | La navegación no crea categorías por sexo: `HOMBRES`, `MUJERES` y `NIÑOS` se resuelven con el eje `gender` combinado con las categorías reales. |

---

# 15. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **2.5.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Más tinta, menos blanco (`08_UI_SYSTEM.md` v2.3.0, `UDS-12`).** Novedades y Ofertas destacadas (`BannerRail`) y Promociones (`ProductRail`) pasan a `tone="inverse"` en `HomePage`: de 2 bloques oscuros en la Home a 5, con Destacados como único respiro claro. `Section` (§9.8) suma variables CSS de tono para que `SectionHeader` herede sus colores sin conocer el tono. `Hero` cambia su fondo a un halo radial; `BannerRail` suma diagonales sutiles al marco del carrusel; `BrandShowcase` suma un filete de acento en el borde superior. Decisión explícita del usuario tras revisar mockups de las opciones. |
| **2.4.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Logotipos ilegibles en el menú de navegación.** `MegaMenu` (§9.8, bloque "Marcas") y el cajón móvil de `PublicNavbar` usaban `tone="inverse"` en `MediaTile` — un tile con fondo casi negro pensado para verse "sobre un bloque de tinta". Los logotipos reales son tinta negra sobre transparente: sobre un fondo casi negro quedaban invisibles. Se quita `tone="inverse"` en ambos; el bloque "Marcas" pasa al tile claro por defecto, igual que `BrandStrip`. Reportado por el usuario como *"al subir estos aparecen con fondo negro"*. Un segundo problema, no relacionado con `MediaTile`, se documenta en `99_AI_DEVELOPMENT_GUIDE.md` v1.4.0 §17.1.6: el WebP con alfa de los logotipos se decodifica mal en una franja real de navegadores; el canónico de `brands` pasa a JPEG. |
| **2.3.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Diseño visual de la Home.** Se agrega `TrustBar` (§9.8) entre `BannerRail placement="promo"` y `StoryBlock`. Decisión explícita del usuario, revertida sobre una decisión previa de la misma tanda que la había rechazado. `WhatsappTemplateForm` (reincorporado en 2.2.0) vuelve a quedar sin ruta en el panel — a diferencia de la retirada de v2.1.0, esta vez el componente **no se elimina**, solo deja de estar enlazado, junto con `SettingsPage` y `SeedDataPage` (`07_PANEL_ADMIN.md` v1.6.0). `ProductForm` y `ClassificationsTable` dejan de mostrar el slug: sigue siendo el identificador real de la URL pública, solo se oculta de las pantallas de solo lectura del panel. |
| **2.2.0** | 17/08/2026 | 🟡 EN REVISIÓN | **QA funcional: coherencia con el código real.** `HeroCarousel` (§9.8) se corrige a `Hero`: v2.0.0 lo había documentado como carrusel de varias piezas, pero lo construido —y lo que pide el negocio— es una sola pieza fija, nunca una rotación; se reescribe su contrato (`banner` singular, sin `Carousel`) para describir el componente real. `WhatsAppTemplateEditor`, que v2.1.0 había dado por retirado el mismo día, se reincorpora como `WhatsappTemplateForm` (`07_PANEL_ADMIN.md` v1.5.0): el QA posterior a esa tanda encontró un enlace muerto hacia la pantalla eliminada, y el usuario pidió restaurarla en vez de quitar el enlace. |
| **2.1.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Tanda funcional.** `AvailabilityBadge` (§9.8): relabeling a 3 estados (Disponible/Stock bajo/No disponible, se retira `coming_soon`), fuente derivada de `variants.quantity` (v1.4.0). `MegaMenu`: nuevo prop `brands` y bloque "Marcas" reutilizando `MediaTile`. `VariantMatrix`: cantidad editable y estado derivado. Se retira `WhatsAppTemplateEditor` (componente y pantalla, `07_PANEL_ADMIN.md` §7.1). Se documenta el eje `NOVEDADES` del navbar y se aclara explícitamente que no es la misma sección que "Novedades" de la Home (`Banner.placement="news"`). Pedido explícito del usuario en la tanda funcional del 17/08/2026. |
| **2.0.0** | 13/08/2026 | ✅ APROBADO | **Componentes de la fase visual del catálogo público.** Se añaden a §9.8: `Carousel`, `SectionHeader`, `MediaTile`, `HeroCarousel`, `BrandRail`, `CategoryRail`, `ProductRail`, `PublicNavbar`, `MegaMenu` y `PublicFooter`, con su contrato, anatomía, accesibilidad y prohibiciones. Se reescribe el contrato de `ProductCard` con variantes `grid`/`rail`/`compact` y anatomía explícita. Nuevas decisiones `COMPP-04` a `COMPP-06`. Se marcan como `REQUIERE CAMBIO DE BACKEND` la imagen administrable de marcas y categorías y el logotipo de tienda. Deriva de `08_UI_SYSTEM.md` v2.0.0. |
| **2.0.3** | 13/08/2026 | ✅ APROBADO | Nuevo componente `Tag` (§9.8), surgido de la auditoría E10. Reemplaza a las utilidades `badge bg-warning text-dark` y `badge bg-info text-dark` de la ficha de producto, que daban 3.49:1 y menos: los colores de estado están calculados para llevar texto blanco encima, no tinta. `Tag` solo admite tinta y acento, ambos verificados por encima de 15:1. |
| **2.0.2** | 13/08/2026 | ✅ APROBADO | Corrección surgida al implementar E3. Se elimina `onQuickAdd` de `ProductCard`: `RN-53` fija la variante como unidad del carrito y `ProductListItemDTO` no transporta variantes, de modo que agregar desde un listado exigiría elegir color y talle por el cliente. La tarjeta queda como enlace puro y la selección sigue en la ficha con `VariantSelector`. Se documenta el motivo junto a las variantes. |
| **2.0.1** | 13/08/2026 | ✅ APROBADO | Correcciones surgidas al implementar E2. `Carousel` recibe `metric` en lugar de un objeto `visible` con valores por breakpoint: la métrica ya es token de §7.6 y pasarla por props habría metido números de diseño en el JSX contra `UDS-01`. |
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Redacción inicial del catálogo de componentes. Deriva de `09.0_COMPONENTES_ANALISIS_PREVIO.md` aprobado. Incluye clasificación por responsabilidad, nivel, tipo, estabilidad, complejidad y prioridad; contrato uniforme de 17 campos; dependencias directas e inversas; componentes críticos; componentes prohibidos; y diferenciación `DataTable`/`DataGrid`. |
