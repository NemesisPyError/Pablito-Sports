# 08_UI_SYSTEM.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Sistema de Diseño |
| **Código** | 08 |
| **Versión** | 2.3.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 18/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08.0_UI_SYSTEM_ANALISIS_PREVIO.md](08.0_UI_SYSTEM_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `09_COMPONENTES.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Definir el **sistema de diseño visual único y autoritativo** de Pablito Sports. Este documento centraliza todos los fundamentos visuales, design tokens, componentes base, estados, accesibilidad y reglas de implementación visual.

Una vez aprobado, `08_UI_SYSTEM.md` es la **única fuente de verdad** sobre apariencia. Ningún documento posterior ni componente puede redefinir colores, tipografías, espaciados o estilos.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Design tokens y fundamentos visuales | — |
| Componentes base del sistema de diseño | `09_COMPONENTES.md` |
| Implementación visual con Bootstrap y CSS Modules | — |
| Reglas de accesibilidad visual | — |
| Comportamiento responsive visual | — |
| Filosofía de componentes y flujo de dependencia visual | — |
| Especificación funcional de componentes | `09_COMPONENTES.md` |
| Casos de prueba visuales | `11_TESTING.md` |

## 2.3 Regla de autoridad visual

> **UDS-02:** `08_UI_SYSTEM.md` es la única autoridad sobre la apariencia visual del proyecto. `06_FRONTEND.md` y `07_PANEL_ADMIN.md` hacen referencia a este documento; ninguno redefine estilos.

---

# 3. Alcance

## 3.1 Incluye

- Fundamentos visuales: paleta, tipografía, espaciado, radios, sombras, bordes.
- Sistema de layout: contenedores, grid, breakpoints, z-index.
- Design tokens: estructura, tokens base, semánticos y de movimiento.
- Iconografía oficial.
- Estados visuales unificados.
- Accesibilidad visual.
- Principios responsive.
- Integración con Bootstrap 5.3 y CSS Modules.
- Inventario de componentes base a desarrollar en `09_COMPONENTES.md`.
- Tema claro implementado y estructura reservada para tema oscuro.

## 3.2 No incluye

- Especificación funcional completa de cada componente → `09_COMPONENTES.md`.
- Lógica de negocio o de estado → `01_ANALISIS_NEGOCIO.md`, `06_FRONTEND.md`, `07_PANEL_ADMIN.md`.
- Decisiones arquitectónicas → `02_ARQUITECTURA.md`, `02.1_DECISIONES_ARQUITECTONICAS.md`.
- Casos de prueba detallados → `11_TESTING.md`.

## 3.3 Fuera de alcance de la v1

- Tema oscuro implementado.
- Animaciones complejas o microinteracciones avanzadas.
- Personalización de temas por usuario.

---

# 4. Decisiones de diseño

## UDS-01 — Todos los estilos derivan de design tokens

| Campo | Valor |
|---|---|
| **Identificador** | UDS-01 |
| **Título** | Ningún componente define colores o espaciados directamente; todos usan exclusivamente los tokens de `08_UI_SYSTEM.md` |
| **Contexto** | Si los componentes hardcodean colores o tamaños, cualquier cambio de marca obliga a revisar decenas de archivos. |
| **Decisión** | Toda referencia a color, espaciado, radio, sombra o tipografía en el código pasa por un token. Bootstrap se configura a partir de estos tokens y CSS Modules los consume mediante variables CSS. |
| **Consecuencias** | `09_COMPONENTES.md` no define valores de estilo, solo referencia tokens. Los cambios de marca o temas no requieren tocar componentes. |

## UDS-02 — `08_UI_SYSTEM.md` es la autoridad visual única

| Campo | Valor |
|---|---|
| **Identificador** | UDS-02 |
| **Título** | El sistema de diseño es la única autoridad sobre la apariencia visual del proyecto |
| **Contexto** | Múltiples documentos definiendo estilos generan contradicciones y duplicación. |
| **Decisión** | `08_UI_SYSTEM.md` define y documenta todos los fundamentos visuales, tokens y componentes base. Los documentos posteriores lo referencian; ninguno redefine estilos. |
| **Consecuencias** | Cualquier duda sobre apariencia se resuelve consultando este documento. Los cambios visuales se gestionan en un solo lugar. |

## UDS-03 — Sin estilos inline

| Campo | Valor |
|---|---|
| **Identificador** | UDS-03 |
| **Título** | Los componentes nunca contienen estilos inline salvo valores calculados dinámicamente |
| **Contexto** | Los estilos inline rompen la trazabilidad a tokens y dificultan la mantenibilidad. |
| **Decisión** | Toda declaración visual vive en CSS Modules o en la configuración de Bootstrap y referencia tokens. Solo se permite `style={{ ... }}` para valores calculados en runtime (por ejemplo, posición en drag-and-drop o ancho de una barra de progreso). |
| **Consecuencias** | El código de componentes permanece limpio. Los cambios visuales se hacen en hojas de estilo, no en JSX. |

## UDS-04 — Ningún color visible fuera de tokens

| Campo | Valor |
|---|---|
| **Identificador** | UDS-04 |
| **Título** | Todo color visible debe derivar de un token |
| **Contexto** | Si un componente declara un HEX directamente, el sistema visual deja de ser centralizado. |
| **Decisión** | No se permiten códigos HEX, RGB ni HSL directamente en componentes o CSS Modules. Todo color visible se referencia mediante un token semántico o base de `08_UI_SYSTEM.md`. |
| **Consecuencias** | El tema oscuro futuro y los cambios de marca se aplican exclusivamente modificando tokens. |

## UDS-05 — Bootstrap es implementación, no autoridad del diseño

| Campo | Valor |
|---|---|
| **Identificador** | UDS-05 |
| **Título** | Bootstrap es una capa de implementación, no la fuente del diseño |
| **Contexto** | Bootstrap fue aprobado como parte del stack, pero sus valores por defecto no definen la identidad visual del proyecto. |
| **Decisión** | La fuente de verdad son los design tokens de `08_UI_SYSTEM.md`. Bootstrap se configura sobreescribiendo sus variables Sass con esos tokens. Nunca se usan colores o espaciados de Bootstrap directamente como autoridad. |
| **Consecuencias** | El flujo de dependencia es: **Tokens → UI System → Bootstrap + CSS Modules → Componentes**. Invertirlo está prohibido. |

## UIDS-03 — Font Awesome como biblioteca única de íconos

| Campo | Valor |
|---|---|
| **Identificador** | UIDS-03 |
| **Título** | El proyecto utiliza exclusivamente Font Awesome como biblioteca oficial de iconos |
| **Contexto** | Mezclar librerías de íconos genera inconsistencias visuales, peso extra y dificultad de mantenimiento. |
| **Decisión** | Se usa Font Awesome 6 Free para todos los íconos del sistema. No se permiten Heroicons, Lucide, Bootstrap Icons ni ninguna otra biblioteca. |
| **Consecuencias** | Un único set de íconos, un único sistema de pesos y estilos, un único punto de importación. |

## UDS-06 — Duración máxima de animaciones

| Campo | Valor |
|---|---|
| **Identificador** | UDS-06 |
| **Título** | Ninguna animación supera los 300 ms sin justificación UX |
| **Contexto** | Las transiciones largas generan percepción de lentitud, especialmente en el panel administrativo. |
| **Decisión** | La duración máxima estándar es `300 ms`. Cualquier animación superior requiere justificación documentada. |
| **Consecuencias** | La interfaz se siente rápida y responsiva. |

## UDS-07 — Identidad monocroma de alto contraste con un único acento

| Campo | Valor |
|---|---|
| **Identificador** | UDS-07 |
| **Título** | La identidad visual es tinta sobre blanco con un único color de energía; el color lo aporta el producto |
| **Contexto** | La v1 heredó la paleta por defecto de Bootstrap (`#0d6efd` y familia). El resultado se lee como una aplicación de gestión, no como una tienda deportiva. Sustituir un azul por otro azul no resuelve el problema: lo que falta no es un color, es una jerarquía. |
| **Decisión** | La marca se expresa mediante **tinta casi negra (`ink`) sobre blanco**, tipografía de alto contraste y densidad comercial. Un **único acento de energía (`volt`)** marca lo que debe llamar la atención comercial. Las fotografías de producto son la única fuente masiva de color en la interfaz. |
| **Consecuencias** | El fondo nunca compite con la foto del producto. La marca sobrevive a cualquier catálogo, sin importar los colores de las prendas. Añadir un segundo color de marca exige nueva versión de este documento. |

## UDS-08 — Carruseles con CSS `scroll-snap` nativo

| Campo | Valor |
|---|---|
| **Identificador** | UDS-08 |
| **Título** | Los carruseles se implementan con CSS `scroll-snap`, sin dependencias externas |
| **Contexto** | El catálogo necesita carruseles de banners, productos y marcas. Las bibliotecas del ecosistema (Swiper, Embla, Slick) suman peso, superficie de mantenimiento y estilos ajenos al sistema de tokens. |
| **Decisión** | Se usa `overflow-x` + `scroll-snap-type` + `scroll-snap-align` nativos. El desplazamiento táctil lo provee el navegador; los controles anterior/siguiente son botones que llaman a `scrollBy`. No se instala ninguna biblioteca de carrusel. |
| **Consecuencias** | Cero dependencias nuevas, cero JavaScript para el gesto principal y accesibilidad táctil garantizada por el navegador. Un requisito que CSS no pueda cubrir exige una decisión nueva y documentada antes de instalar nada. |

## UDS-09 — Ninguna imagen de identidad se hardcodea

| Campo | Valor |
|---|---|
| **Identificador** | UDS-09 |
| **Título** | Toda imagen visible del catálogo proviene de datos administrables; si el backend no la soporta, se usa fallback tipográfico |
| **Contexto** | Las secciones comerciales (hero, marcas, categorías) piden imágenes. Hoy solo los banners y las imágenes de producto tienen soporte real de carga administrativa; `brands`, `categories` y `store_settings` no tienen campo de imagen. |
| **Decisión** | Ningún componente incrusta rutas de imagen fijas en el código como solución definitiva. Los componentes de contenido declaran el contrato `{ image_url, name, slug, href }` y, mientras `image_url` sea `null`, renderizan una **variante tipográfica** legítima y diseñada, no un hueco ni un placeholder de relleno. |
| **Consecuencias** | El día que el backend exponga la imagen, se llena el dato y el componente cambia de variante sin refactor. Cualquier sección que necesite una imagen inexistente hoy se marca en este documento como `REQUIERE CAMBIO DE BACKEND`. |

## UDS-10 — Toda imagen reserva su espacio antes de cargar

| Campo | Valor |
|---|---|
| **Identificador** | UDS-10 |
| **Título** | Cada imagen se muestra dentro de una relación de aspecto fija y declarada por token |
| **Contexto** | El administrador sube imágenes de proporciones arbitrarias. Sin caja reservada, la carga desplaza el contenido y degrada tanto la percepción de calidad como las métricas de estabilidad visual. |
| **Decisión** | Todo contenedor de imagen fija `aspect-ratio` mediante los tokens de §7.5 y aplica `object-fit`. El producto usa `contain` sobre superficie clara para no recortar calzado ni prendas; el contenido editorial (hero, categorías) usa `cover`. |
| **Consecuencias** | No hay saltos de layout. Las proporciones de las secciones son estables aunque el contenido cambie desde el panel. |

## UDS-11 — El acento `volt` nunca es texto corrido sobre superficie clara

| Campo | Valor |
|---|---|
| **Identificador** | UDS-11 |
| **Título** | `volt` se usa como superficie, nunca como texto corrido |
| **Contexto** | v2.0.0 fijaba esta regla porque el acento original (amarillo-verde, `#D6F32F`) no alcanzaba contraste utilizable sobre blanco. v2.2.0 cambió el acento a un azul (`#2F5FFF`, decisión del usuario del 17/08/2026) que sí alcanza ≈5:1 sobre blanco — sería técnicamente legible como texto. La regla se mantiene igual, pero por otro motivo: `UDS-07` reserva el acento para lo que debe llamar la atención comercial (badge de oferta, CTA, indicador), y la proporción 90/7/3 de §6.1 se rompe si el acento también carga texto corrido. |
| **Decisión** | Combinaciones permitidas: `volt` como fondo con texto `color-white` encima (`color-volt-on`), o `volt` como elemento gráfico (subrayado, filete, indicador) sobre `ink-900`. Prohibido: `volt` como color de texto corrido, sobre cualquier fondo. |
| **Consecuencias** | El acento conserva su fuerza y su escasez deliberada. Cualquier uso de `volt` es verificable contra esta regla en revisión. |

## UDS-12 — El texto de `SectionHeader` se resuelve por variables CSS de tono, no por tono duplicado en cada componente

| Campo | Valor |
|---|---|
| **Identificador** | UDS-12 |
| **Título** | El tono de sección propaga su texto por variables CSS heredadas, no por selectores duplicados |
| **Contexto** | v2.4.0 (18/08/2026) suma más bloques en tono inverso a la Home (Novedades, Promociones, Ofertas, antes solo Hero y Marca destacada), pedido explícito del usuario para que la página tenga más tinta y menos blanco. `SectionHeader` (eyebrow, título, enlace «Ver todo») es compartido por todos los tonos; sin una regla, cada componente tendría que repetir sus propios colores de texto inverso, o `Section` tendría que conocer la estructura interna de `SectionHeader`. |
| **Decisión** | `Section` declara `--section-text-muted`, `--section-text-link` y `--section-text-link-hover` (y `--section-header-accent-*` para el filete de acento) únicamente en `.toneInverse`; `SectionHeader` los consume con `var(--section-text-muted, var(--color-text-muted))` — con la variable heredada del tono si existe, con el color de tono claro si no. Ni `.toneDefault` ni `.toneAlt` declaran estas variables: no hace falta, el `var(..., fallback)` ya resuelve al valor claro. Ningún componente hijo necesita saber en qué tono está: hereda el que le toca. |
| **Consecuencias** | Agregar un tono nuevo a `Section` no exige tocar `SectionHeader` ni ningún otro consumidor. El filete de acento junto al título (`--section-header-accent-color: color-volt-500`) solo existe en tono inverso — coherente con `UDS-11`, es el acento como elemento gráfico, nunca como texto corrido. |

---

# 5. Arquitectura visual

## 5.1 Flujo de dependencia

```
Design Tokens
      ↓
  UI System
      ↓
Bootstrap + CSS Modules
      ↓
  Componentes
```

- **Design Tokens:** valores semánticos y base del diseño.
- **UI System:** documentación y reglas que gobiernan la aplicación de los tokens.
- **Bootstrap + CSS Modules:** capa de implementación. Bootstrap se configura con tokens; CSS Modules consumen variables CSS generadas desde tokens.
- **Componentes:** usan clases de CSS Modules y, excepcionalmente, utilidades de Bootstrap cuando no existe token equivalente y está justificado.

## 5.2 Jerarquía de decisiones visuales

| Nivel | Autoridad | Ejemplo |
|---|---|---|
| 1 — Tokens | Máxima | `color-primary` |
| 2 — Tokens semánticos | Alta | `color-action-primary-bg` |
| 3 — Variables CSS | Media | `--color-primary` |
| 4 — CSS Modules | Baja | `.button { background: var(--color-primary); }` |
| 5 — Componente | Mínima | `<Button className={styles.button} />` |

---

# 6. Fundamentos visuales

## 6.1 Paleta de colores

### Concepto

La paleta responde a `UDS-07`. Tres familias y nada más:

| Familia | Rol | Presencia en pantalla |
|---|---|---|
| **Ink** | Tinta de marca: navegación, pie, texto, botón primario. | Alta |
| **Volt** | Energía comercial: oferta, llamadas a la acción destacadas, indicadores. | Muy baja y deliberada |
| **Estado** | Éxito, error, advertencia, información. | Puntual y funcional |

Regla de proporción: aproximadamente **90 % tinta y blanco, 7 % fotografía de producto, 3 % acento**. Si `volt` aparece más de dos o tres veces en una pantalla, deja de significar algo.

### Escala de tinta

| Token | Valor light | Uso |
|---|---|---|
| `color-ink-900` | `#0E1116` | Navbar, footer, botón primario, texto principal. |
| `color-ink-800` | `#171C23` | Superficie oscura elevada: mega-menú, overlay de hero. |
| `color-ink-700` | `#242B34` | Bordes y divisores sobre superficie oscura. |
| `color-ink-500` | `#5A636F` | Texto secundario sobre claro. |
| `color-ink-400` | `#666F7A` | Texto atenuado, metadatos, marca en la tarjeta. |
| `color-ink-200` | `#DDE1E6` | Bordes y divisores sobre claro. |
| `color-ink-100` | `#F1F3F5` | Superficie de tarjeta, fondo de imagen de producto. |
| `color-ink-050` | `#F8F9FA` | Franjas y secciones alternas. |
| `color-white` | `#FFFFFF` | Fondo de página. |

### Acento de energía

| Token | Valor light | Uso |
|---|---|---|
| `color-volt-500` | `#2F5FFF` | Superficie de acento: badge de oferta, CTA sobre tinta, filete activo. Azul desde v2.2.0 (antes `#D6F32F`, decisión del usuario). |
| `color-volt-600` | `#1E4BD8` | Hover del acento. |
| `color-volt-on` | `color-white` | **Único** color de texto admitido sobre `volt` (`UDS-11`). Blanco desde v2.2.0 (antes `ink-900`: el amarillo-verde original era claro y pedía texto oscuro; el azul es oscuro y pide texto blanco). |

### Colores de estado

| Token | Valor light | Superficie suave | Uso |
|---|---|---|---|
| `color-success` | `#0F6B41` | `#E7F4ED` | Confirmaciones, "Disponible". |
| `color-danger` | `#B32318` | `#FDECEA` | Errores, eliminaciones. |
| `color-warning` | `#9A5B00` | `#FDF3E3` | Advertencias, "Stock bajo" (v1.4.0, antes "últimas unidades"). |
| `color-info` | `#0B5D8A` | `#E8F2F8` | Información neutral. **v1.4.0:** deja de usarse para disponibilidad — se retira el estado "próximamente" (`coming_soon`), `AvailabilityBadge` queda en 3 estados. |

> **v1.4.0 — "No disponible"** (antes "sin stock") usa `color-surface` /
> `color-text-secondary` en `AvailabilityBadge`, no `color-danger`: es un
> estado informativo del catálogo, no un error. `color-danger` queda
> reservado para errores y eliminaciones, como documenta la fila de arriba.

### Colores semánticos

| Token | Referencia | Uso |
|---|---|---|
| `color-background` | `color-white` | Fondo de página. |
| `color-surface` | `color-ink-100` | Tarjetas, paneles, modales. |
| `color-surface-alt` | `color-ink-050` | Secciones alternas de la Home. |
| `color-surface-inverse` | `color-ink-900` | Navbar, footer, bloques de contraste. |
| `color-background-disabled` | `color-ink-200` | Fondo de elementos deshabilitados. |
| `color-border` | `color-ink-200` | Bordes y divisores. |
| `color-border-inverse` | `color-ink-700` | Divisores sobre superficie oscura. |
| `color-text-primary` | `color-ink-900` | Texto principal. |
| `color-text-secondary` | `color-ink-500` | Texto secundario, descripciones. |
| `color-text-muted` | `color-ink-400` | Metadatos, marca, ayudas. |
| `color-text-inverse` | `color-white` | Texto sobre superficie oscura. |
| `color-text-inverse-muted` | `#A8B1BC` | Texto secundario sobre superficie oscura. |
| `color-overlay` | `rgba(14, 17, 22, 0.55)` | Fondo de modales y drawers. |
| `color-overlay-media` | `linear-gradient(180deg, rgba(14,17,22,0) 35%, rgba(14,17,22,0.78) 100%)` | Velo de legibilidad sobre imagen editorial. |
| `color-overlay-hero` | Dos capas: vertical `0.2 → 0.85` y horizontal `0.8 → 0` al 70 % | Velo del hero. Dos direcciones porque el texto se apoya abajo en móvil y a la izquierda en escritorio; con una sola, el titular queda sobre zona transparente en uno de los dos casos y la legibilidad pasa a depender de que la foto sea oscura justo ahí, cosa que no se puede garantizar. |
| `color-shadow` | `rgba(14, 17, 22, 0.18)` | Sombras base. |

### Colores de acción semánticos

| Token | Referencia | Uso |
|---|---|---|
| `color-action-primary-bg` | `color-ink-900` | Fondo botón primario. |
| `color-action-primary-text` | `color-white` | Texto botón primario. |
| `color-action-primary-bg-hover` | `color-ink-800` | Hover del botón primario. |
| `color-action-accent-bg` | `color-volt-500` | Fondo del botón de acento comercial. |
| `color-action-accent-text` | `color-white` | Texto del botón de acento (`UDS-11`). Blanco desde v2.2.0, junto con el cambio de acento a azul. |
| `color-action-secondary-bg` | `transparent` | Fondo botón secundario (contorno). |
| `color-action-secondary-text` | `color-ink-900` | Texto botón secundario. |
| `color-action-secondary-border` | `color-ink-200` | Borde botón secundario. |
| `color-action-danger-bg` | `color-danger` | Fondo botón peligro. |
| `color-action-danger-text` | `color-white` | Texto botón peligro. |
| `color-action-success-bg` | `color-success` | Fondo botón éxito y acción de WhatsApp. |
| `color-action-success-text` | `color-white` | Texto botón éxito. |
| `color-link` | `color-ink-900` | Enlaces. |
| `color-link-hover` | `color-ink-500` | Enlaces en hover. |
| `color-border-focus` | `color-ink-900` | Anillo de foco sobre claro. |
| `color-border-focus-inverse` | `color-volt-500` | Anillo de foco sobre oscuro. |
| `color-border-error` | `color-danger` | Estados de error. |

### Colores comerciales

| Token | Referencia | Uso |
|---|---|---|
| `color-price-current` | `color-ink-900` | Precio vigente. |
| `color-price-list` | `color-ink-400` | Precio de lista tachado. |
| `color-price-sale` | `color-danger` | Precio rebajado y porcentaje de descuento. |
| `color-badge-new-bg` | `color-ink-900` | Fondo del distintivo «Nuevo». |
| `color-badge-new-text` | `color-white` | Texto del distintivo «Nuevo». |
| `color-badge-sale-bg` | `color-volt-500` | Fondo del distintivo de descuento. |
| `color-badge-sale-text` | `color-white` | Texto del distintivo de descuento. Blanco desde v2.2.0. |

> **Compatibilidad.** `color-primary` y `color-secondary` dejan de existir como tokens de marca. Su rol lo asumen `color-action-primary-bg` y `color-action-secondary-*`. Ningún componente puede seguir refiriéndose a ellos.

## 6.2 Tipografía

La tipografía es el principal vehículo de identidad, porque la paleta es deliberadamente sobria (`UDS-07`). El contraste se construye con **escala, peso y espaciado entre letras**, no con color.

### Familias

| Token | Valor |
|---|---|
| `font-family-display` | `"Archivo", "Archivo Narrow", var(--font-family-base)` |
| `font-family-base` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| `font-family-heading` | `font-family-display` |
| `font-family-monospace` | `SFMono-Regular, Menlo, Monaco, Consolas, monospace` |

> **Decisión abierta `UDSP-01`.** `font-family-display` requiere alojar localmente una fuente variable de licencia libre (Archivo, SIL OFL 1.1). **No es una dependencia de npm ni un servicio externo**: es un archivo `.woff2` servido por el propio Nginx, sin llamadas a terceros y sin impacto en la política de contenidos. Si no se aprueba, el token colapsa a `font-family-base` y el sistema sigue siendo coherente: la identidad se sostiene igual con mayúsculas, tracking y peso, con menos personalidad. **Ningún componente referencia la fuente directamente**, solo el token.

### Tamaños

| Token | Valor | Uso |
|---|---|---|
| `font-size-2xs` | `0.6875rem` (11px) | Distintivos, eyebrow en mayúsculas. |
| `font-size-xs` | `0.75rem` (12px) | Captions, ayudas, marca en la tarjeta. |
| `font-size-sm` | `0.875rem` (14px) | Texto pequeño, nombre de producto en tarjeta compacta. |
| `font-size-md` | `1rem` (16px) | Texto base. |
| `font-size-lg` | `1.125rem` (18px) | Subtítulos, precio en tarjeta. |
| `font-size-xl` | `1.375rem` (22px) | Títulos menores. |
| `font-size-2xl` | `1.75rem` (28px) | Títulos de sección en móvil. |
| `font-size-3xl` | `2.25rem` (36px) | Títulos de sección en escritorio. |
| `font-size-display` | `clamp(2.25rem, 6vw, 3.5rem)` | Titular de hero. |

### Pesos

| Token | Valor | Uso |
|---|---|---|
| `font-weight-normal` | `400` | Cuerpo. |
| `font-weight-medium` | `500` | Énfasis. |
| `font-weight-semibold` | `600` | Subtítulos, precio. |
| `font-weight-bold` | `700` | Títulos de sección, etiquetas. |
| `font-weight-extrabold` | `800` | Titular de hero y navegación principal. |

### Alturas de línea

| Token | Valor | Uso |
|---|---|---|
| `line-height-none` | `1` | Precios y cifras. |
| `line-height-tight` | `1.15` | Títulos y titular de hero. |
| `line-height-snug` | `1.3` | Nombre de producto en dos líneas. |
| `line-height-normal` | `1.5` | Cuerpo. |
| `line-height-relaxed` | `1.75` | Bloques largos. |

### Espaciado entre letras

| Token | Valor | Uso |
|---|---|---|
| `letter-spacing-tighter` | `-0.03em` | Titular de hero. |
| `letter-spacing-tight` | `-0.015em` | Títulos de sección. |
| `letter-spacing-normal` | `0` | Cuerpo. |
| `letter-spacing-wide` | `0.08em` | Navegación, botones, eyebrow. |
| `letter-spacing-wider` | `0.14em` | Marca en la tarjeta, etiquetas en mayúsculas. |

### Roles tipográficos

| Rol | Familia | Tamaño | Peso | Tracking | Caja |
|---|---|---|---|---|---|
| **Hero title** | display | `font-size-display` | 800 | `tighter` | Normal |
| **Section title** | display | `2xl` → `3xl` en `lg` | 700 | `tight` | Normal |
| **Eyebrow** | base | `2xs` | 700 | `wide` | MAYÚSCULAS |
| **Nav item** | base | `sm` | 600 | `wide` | MAYÚSCULAS |
| **Product name** | base | `sm` → `md` | 500 | `normal` | Normal |
| **Product brand** | base | `xs` | 600 | `wider` | MAYÚSCULAS |
| **Price** | display | `lg` | 600 | `tight` | Normal |
| **Body** | base | `md` | 400 | `normal` | Normal |

## 6.3 Sistema de espaciado

Base de `8px`/`0.5rem`, con escala híbrida que permite medios pasos:

| Token | Valor | Uso típico |
|---|---|---|
| `spacing-0` | `0` | Sin espacio. |
| `spacing-1` | `0.25rem` (4px) | Micro ajustes. |
| `spacing-2` | `0.5rem` (8px) | Iconos junto a texto, gap pequeño. |
| `spacing-3` | `0.75rem` (12px) | Padding pequeño. |
| `spacing-4` | `1rem` (16px) | Padding base. |
| `spacing-5` | `1.5rem` (24px) | Cards, secciones. |
| `spacing-6` | `2rem` (32px) | Separación de bloques. |
| `spacing-7` | `2.5rem` (40px) | Separación media. |
| `spacing-8` | `3rem` (48px) | Separación de secciones. |
| `spacing-9` | `4rem` (64px) | Separación mayor. |
| `spacing-10` | `5rem` (80px) | Separación de secciones amplias. |
| `spacing-11` | `6rem` (96px) | Separación de hero / landing. |

### Ritmo de sección

La Home es una sucesión de secciones. Su respiración se declara como token, no la decide cada sección:

| Token | Móvil | `md` | `lg` | Uso |
|---|---|---|---|---|
| `section-gap-y` | `2.5rem` | `3.5rem` | `4.5rem` | Separación vertical entre secciones de la Home. |
| `section-header-gap` | `1rem` | `1.25rem` | `1.5rem` | Distancia entre encabezado de sección y su contenido. |
| `section-inset-x` | `1rem` | `1.5rem` | `2rem` | Margen lateral del contenido dentro del contenedor. |

## 6.4 Border radius

Radios cortos: el redondeo blando es lo que más delata la estética por defecto de un framework. La tienda usa esquinas casi rectas y deja el redondeo generoso solo para píldoras.

| Token | Valor | Uso |
|---|---|---|
| `radius-none` | `0` | Tablas, elementos rectos. |
| `radius-media` | `0` | **Toda imagen de producto, banner, marca y categoría.** |
| `radius-sm` | `0.125rem` (2px) | Inputs, botones pequeños. |
| `radius-md` | `0.25rem` (4px) | Botones, tarjetas. |
| `radius-lg` | `0.5rem` (8px) | Modales, paneles, drawer. |
| `radius-pill` | `50rem` | Distintivos, chips, controles del carrusel. |
| `radius-circle` | `50%` | Avatares. |

## 6.5 Sombras

Regla de elevación: **una tarjeta en reposo no tiene sombra**, tiene un filete de `color-border`. La sombra comunica que algo está por encima del plano —superposiciones y hover—, no que algo existe.

| Token | Valor | Uso |
|---|---|---|
| `shadow-none` | `none` | Tarjetas en reposo, secciones. |
| `shadow-sm` | `0 1px 2px rgba(14,17,22,0.06)` | Navbar fijo con la página desplazada. |
| `shadow-md` | `0 8px 24px -12px rgba(14,17,22,0.25)` | Hover de tarjeta, mega-menú, controles del carrusel. |
| `shadow-lg` | `0 24px 48px -24px rgba(14,17,22,0.35)` | Modales, drawers. |

## 6.6 Bordes

| Token | Valor |
|---|---|
| `border-width-thin` | `1px` |
| `border-width-medium` | `2px` |
| `border-width-thick` | `4px` |
| `border-style-default` | `solid` |

---

# 7. Sistema de layout

## 7.1 Contenedores

| Token | Valor | Uso |
|---|---|---|
| `container-max-width-sm` | `540px` | — |
| `container-max-width-md` | `720px` | — |
| `container-max-width-lg` | `960px` | — |
| `container-max-width-xl` | `1140px` | Contenido de lectura: `Nosotros`, `Contacto`, formularios. |
| `container-max-width-xxl` | `1320px` | Panel en escritorio. |
| `container-max-width-store` | `1440px` | **Catálogo público y Home.** Una tienda necesita ancho para mostrar seis productos por fila sin encogerlos. |
| `container-bleed` | `100vw` | Secciones a sangre: hero y franjas de contraste. |
| `container-padding-x` | `1rem` (16px) | Padding horizontal base. |

## 7.2 Grid

| Token | Valor |
|---|---|
| `grid-columns` | `12` |
| `grid-gutter` | `1.5rem` (24px) |
| `grid-gutter-sm` | `0.75rem` (12px) |

## 7.3 Breakpoints

| Token | Valor | Alias |
|---|---|---|
| `breakpoint-xs` | `0` | Mobile |
| `breakpoint-sm` | `576px` | Mobile landscape |
| `breakpoint-md` | `768px` | Tablet |
| `breakpoint-lg` | `992px` | Desktop |
| `breakpoint-xl` | `1200px` | Large desktop |
| `breakpoint-xxl` | `1400px` | Extra large |

## 7.4 Z-index

| Token | Valor | Uso |
|---|---|---|
| `z-index-dropdown` | `1000` | Dropdowns. |
| `z-index-sticky` | `1020` | Sticky header. |
| `z-index-fixed` | `1030` | Elementos fijos. |
| `z-index-modal-backdrop` | `1040` | Fondo de modal. |
| `z-index-modal` | `1050` | Modal. |
| `z-index-popover` | `1070` | Popovers. |
| `z-index-tooltip` | `1080` | Tooltips. |
| `z-index-toast` | `1090` | Toasts. |

## 7.5 Relaciones de aspecto de imagen

Aplicación directa de `UDS-10`. Toda caja de imagen usa uno de estos tokens; no existe imagen sin proporción declarada.

| Token | Valor | Ajuste | Uso |
|---|---|---|---|
| `aspect-product` | `1 / 1` | `contain` sobre `color-surface` | Tarjeta de producto y miniaturas. El calzado no se recorta. |
| `aspect-product-detail` | `4 / 5` | `contain` sobre `color-surface` | Galería de la ficha de producto. |
| `aspect-hero-mobile` | `4 / 5` | `cover` | Hero en móvil: vertical, ocupa pantalla sin obligar a hacer scroll para entenderlo. |
| `aspect-hero-tablet` | `16 / 9` | `cover` | Hero desde `md`. |
| `aspect-hero-desktop` | `21 / 9` | `cover` | Hero desde `lg`: panorámico, no roba la pantalla completa. |
| `aspect-category` | `3 / 4` | `cover` | Mosaico de accesos por sexo y categoría. |
| `aspect-brand` | `3 / 2` | `contain` sobre `color-white` | Marca con imagen administrable, cuando exista. |

> El administrador sube una sola imagen por banner. Las tres proporciones del hero se obtienen recortando por CSS con `object-position: center`, no pidiendo tres archivos. **Si en el futuro se quisiera un recorte distinto por dispositivo, sería `REQUIERE CAMBIO DE BACKEND`.**

## 7.6 Métrica de carruseles

Los carruseles no se miden en píxeles sino en **cuántas piezas se ven a la vez**. De ahí se deriva el ancho de cada pieza (`UDS-08`).

| Token | `xs` | `sm` | `md` | `lg` | `xl` |
|---|---|---|---|---|---|
| `carousel-visible-products` | `2.2` | `2.5` | `3.5` | `5` | `6` |
| `carousel-visible-brands` | `2.5` | `3.5` | `5` | `6` | `7` |
| `carousel-visible-categories` | `1.4` | `2.2` | `3` | `4` | `5` |
| `carousel-gap` | `spacing-3` | `spacing-3` | `spacing-4` | `spacing-4` | `spacing-4` |

El valor fraccionario es intencional: dejar media tarjeta asomando en el borde es la única señal fiable de que el contenido continúa. Un carrusel que corta exacto en el borde parece una grilla incompleta.

| Token | Valor | Uso |
|---|---|---|
| `carousel-control-size` | `2.75rem` (44px) | Diámetro de los botones anterior/siguiente. Coincide con el objetivo táctil mínimo. |
| `carousel-scroll-padding` | `section-inset-x` | Alineación de la primera pieza con el título de la sección. |

---

# 8. Iconografía

> **Estado real al 13/08/2026.** `UIDS-03` designa Font Awesome como biblioteca oficial, pero **nunca se instaló**: no figura en `package.json`, no se carga en `index.html` y no hay un solo ícono en el código. La regla se mantiene vigente como decisión, no como descripción de lo implementado.
>
> Mientras tanto, los pocos glifos que el sistema necesita —los chevrones del carrusel— se dibujan como **SVG en línea con `currentColor`**, sin archivo de imagen y sin petición externa. Es una excepción acotada y explícita, no una segunda biblioteca: incorporar Font Awesome sigue siendo una decisión pendiente con su costo de peso y de carga.

- **Biblioteca oficial:** Font Awesome 6 Free (`UIDS-03`), **pendiente de incorporación**.
- **Importación:** mediante componente `Icon` o clases CSS de Font Awesome.
- **Formato:** nunca como imagen.
- **Tamaños:** `icon-size-sm` (16px), `icon-size-md` (20px), `icon-size-lg` (24px), `icon-size-xl` (32px).
- **Accesibilidad:** todo ícono con función debe tener `aria-label`, `aria-hidden="true"` con texto visible alternativo, o `role="img"` con título.

---

# 9. Estados visuales unificados

Cada componente interactivo define visualmente los siguientes estados:

| Estado | Descripción | Indicador visual |
|---|---|---|
| **Default** | Apariencia base. | Valor del token correspondiente. |
| **Hover** | Cursor sobre el elemento. | Ligero oscurecimiento o cambio de fondo. |
| **Focus** | Foco de teclado. | Anillo visible de `2px` usando `color-border-focus`. |
| **Active** | Elemento presionado o seleccionado. | Oscurecimiento adicional o inset. |
| **Disabled** | Elemento no disponible. | Opacidad `0.6`, cursor `not-allowed`, fondo `color-background-disabled`. |
| **Loading** | Elemento en proceso. | Spinner overlay, opacidad reducida, deshabilitación de interacción. |
| **Error** | Estado de error. | Borde `color-border-error`, texto `color-danger`, ícono opcional. |
| **Success** | Estado de éxito. | Borde o fondo `color-success`, ícono opcional. |

---

# 10. Accesibilidad

## 10.1 Criterios generales

| Aspecto | Criterio |
|---|---|
| **Contraste** | Relación mínima 4.5:1 para texto normal, 3:1 para texto grande (WCAG 2.1 AA). |
| **Foco visible** | Todo elemento interactivo muestra un indicador de foco claro. |
| **Navegación por teclado** | Orden lógico de tabulación; modales capturan foco. |
| **Áreas clicables** | Mínimo `44x44px` para controles táctiles. **Los enlaces no lo heredan**: la regla base de la hoja de estilos solo alcanza a `button`, `[role="button"]`, `a.btn` y las casillas, así que un enlace de icono o de pie debe declarar su propio mínimo. |
| **Atributos ARIA** | Uso consistente de `aria-label`, `aria-describedby`, `role`, `aria-expanded`, `aria-live`. |
| **Texto alternativo** | Toda imagen informativa lleva `alt`; las decorativas usan `alt=""`. |
| **Animaciones** | Se respetan `prefers-reduced-motion`; ninguna animación supera `300 ms` (`UDS-06`). |

## 10.2 Contraste verificado de las combinaciones aprobadas

| Primer plano | Fondo | Relación | Veredicto |
|---|---|---|---|
| `ink-900` `#0E1116` | `white` | ≈ 18.4:1 | ✅ AAA — texto principal |
| `ink-500` `#5A636F` | `white` | ≈ 5.8:1 | ✅ AA — texto secundario |
| `ink-400` `#666F7A` | `white` | ≈ 4.8:1 | ✅ AA — texto atenuado |
| `ink-900` | `ink-100` `#F1F3F5` | ≈ 17.2:1 | ✅ AAA — texto sobre tarjeta |
| `white` | `ink-900` | ≈ 18.4:1 | ✅ AAA — navbar y footer |
| `#A8B1BC` | `ink-900` | ≈ 8.6:1 | ✅ AAA — texto secundario invertido |
| `white` | `volt-500` `#2F5FFF` | ≈ 5.0:1 | ✅ AA — distintivo de oferta, CTA sobre acento (v2.2.0) |
| `volt-500` | `ink-900` | ≈ 3.8:1 | ✅ AA, solo elemento no textual (`UDS-11`) — anillo de foco sobre tinta |
| `white` | `danger` `#B32318` | ≈ 7.4:1 | ✅ AAA |
| `white` | `success` `#0F6B41` | ≈ 5.3:1 | ✅ AA |
| `white` | `warning` `#9A5B00` | ≈ 5.6:1 | ✅ AA |
| `white` | `info` `#0B5D8A` | ≈ 6.4:1 | ✅ AA |
| `danger` `#B32318` | `white` | ≈ 7.4:1 | ✅ AAA — precio rebajado |
| ⛔ `ink-900` | `volt-500` | ≈ 3.8:1 | **Prohibido para texto** — no alcanza AA de texto normal (4.5:1); por eso `color-volt-on`/`color-action-accent-text`/`color-badge-sale-text` son `white`, no `ink-900` |
| `volt-500` | `white` | ≈ 5.0:1 | Alcanza AA como texto, pero sigue prohibido como texto corrido por `UDS-11` (motivo de identidad, no de contraste) |

Los valores se verifican de nuevo con herramienta automatizada durante la implementación; cualquier par que no alcance su umbral obliga a ajustar el token, nunca a excepcionar el componente.

## 10.3 Foco

| Token | Valor | Uso |
|---|---|---|
| `focus-ring-width` | `2px` | Grosor del anillo. |
| `focus-ring-offset` | `2px` | Separación del elemento. |
| `focus-ring-color` | `color-border-focus` | Anillo sobre superficie clara. |
| `focus-ring-color-inverse` | `color-border-focus-inverse` | Anillo sobre superficie oscura. |

Reglas: el anillo se implementa con `outline` y `outline-offset`, nunca con `box-shadow` que pueda quedar recortado por `overflow: hidden` del carrusel.

> **Bootstrap lo anula y hay que restituirlo.** El CSS compilado declara `.btn:focus-visible { outline: 0 }` y lo sustituye por un `box-shadow`. Ese selector tiene más especificidad que `:focus-visible`, de modo que **todo botón con clase `.btn` pierde el anillo del sistema** salvo que se restituya explícitamente. La capa de integración lo hace, y por eso existe: sin ella, el foco dentro de un carril quedaría recortado justo donde más se necesita. Se usa `:focus-visible`, de modo que el clic con puntero no dibuja anillo pero el teclado siempre sí. **Está prohibido `outline: none` sin sustituto visible.**

## 10.4 Teclado

| Zona | Comportamiento exigido |
|---|---|
| **Navbar** | Cada eje es un botón con `aria-expanded`. `Enter`/`Espacio` abre el panel, `Escape` lo cierra y devuelve el foco al eje, `Tab` recorre el panel abierto. |
| **Mega-menú** | No captura el foco: es un panel de navegación, no un diálogo. Salir con `Tab` lo cierra. |
| **Carrusel** | Cada pieza es un enlace normal, de modo que `Tab` recorre el contenido y el navegador desplaza automáticamente el ítem enfocado. Los botones anterior/siguiente son alcanzables por teclado; **no se renderizan** cuando no hay desbordamiento. No se usa `aria-hidden` para esconderlos: aplicado a un elemento focoable produce un control alcanzable por teclado pero invisible para el lector de pantalla. |
| **Drawer de menú móvil** | Sí captura el foco: es un diálogo. `Escape` cierra. |
| **Buscador** | `Escape` limpia y cierra el panel expandido en móvil. |

## 10.5 Movimiento

Con `prefers-reduced-motion: reduce`: `scroll-behavior` pasa de `smooth` a `auto`, se desactiva cualquier desplazamiento automático del hero y las transiciones de hover se reducen a `duration-instant`. El contenido nunca depende del movimiento para ser comprensible.

## 10.6 Semántica de la Home

Un solo `<h1>` visible con el nombre de la tienda y su propuesta. Cada sección es un `<section>` con `aria-labelledby` apuntando a su `<h2>`. El navbar va en `<header>` con `<nav aria-label="Principal">`, el pie en `<footer>`. Existe un enlace «Saltar al contenido» como primer elemento tabulable.

---

# 11. Design tokens

## 11.1 Estructura de archivos

```
tokens/
├── color/
│   ├── base.json
│   ├── semantic.json
│   └── theme.json
├── typography/
│   ├── family.json
│   ├── size.json
│   ├── weight.json
│   └── line-height.json
├── spacing/
│   └── scale.json
├── size/
│   ├── border.json
│   ├── radius.json
│   └── shadow.json
├── layout/
│   ├── breakpoint.json
│   ├── container.json
│   └── z-index.json
└── motion/
    ├── duration.json
    ├── delay.json
    ├── easing.json
    └── transition.json
```

## 11.2 Tokens de movimiento

### Duraciones

| Token | Valor | Uso |
|---|---|---|
| `duration-instant` | `0ms` | Sin transición. |
| `duration-fast` | `150ms` | Hover, focus. |
| `duration-normal` | `250ms` | Transiciones de UI. |
| `duration-slow` | `300ms` | Modales, drawers. |

### Delays

| Token | Valor | Uso |
|---|---|---|
| `delay-none` | `0ms` | Sin retardo. |
| `delay-short` | `100ms` | Retardos leves. |
| `delay-medium` | `200ms` | Secuencias de animación. |

### Easing

| Token | Valor | Uso |
|---|---|---|
| `easing-default` | `ease-in-out` | Transiciones generales. |
| `easing-enter` | `ease-out` | Aparición de elementos. |
| `easing-exit` | `ease-in` | Desaparición de elementos. |
| `easing-bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Microinteracciones (uso moderado). |

### Transiciones predefinidas

| Token | Valor |
|---|---|
| `transition-fast` | `all duration-fast easing-default` |
| `transition-standard` | `all duration-normal easing-default` |
| `transition-slow` | `all duration-slow easing-default` |

## 11.3 Tokens semánticos completos

Los tokens semánticos de color se declaran en §6.1 y no se repiten aquí para que no puedan divergir. Esta sección lista únicamente los alias de compatibilidad que el código ya consume:

| Alias | Referencia | Uso |
|---|---|---|
| `color-background-page` | `color-background` | Fondo de página. |
| `color-background-card` | `color-surface` | Fondo de tarjetas, paneles, modales. |
| `color-text-heading` | `color-text-primary` | Títulos. |
| `color-text-body` | `color-text-primary` | Cuerpo. |
| `color-text-link` | `color-link` | Enlaces. |
| `color-text-link-hover` | `color-link-hover` | Enlaces en hover. |
| `color-border-default` | `color-border` | Bordes generales. |

## 11.4 Tokens retirados en la v2.0.0

| Token retirado | Sustituto | Motivo |
|---|---|---|
| `color-primary` | `color-action-primary-bg` | La marca ya no tiene un «color primario»: tiene tinta y un acento (`UDS-07`). |
| `color-primary-hover` | `color-action-primary-bg-hover` | Ídem. |
| `color-secondary` | `color-action-secondary-*` | El secundario pasa a ser un contorno, no un relleno gris. |
| `color-light` / `color-dark` | `color-ink-050` / `color-ink-900` | Nombres heredados de Bootstrap sin significado propio. |

Retirar un token no es opcional para los componentes: mientras exista una referencia viva, la migración no está terminada.

---

# 12. Temas

## 12.1 Tema claro

- Único tema implementado en v1.
- Todos los valores de §6 corresponden al tema claro.

## 12.2 Tema oscuro (reservado)

- No se implementa en v1.
- La estructura de tokens permite su incorporación futura sin reescribir componentes.
- Cuando se implemente, cada token `*-light` tendrá su contraparte `*-dark`, aplicada mediante una clase en `<html>` o `<body>`.

---

# 13. Integración con Bootstrap y CSS Modules

## 13.1 Bootstrap como capa de implementación

- Bootstrap 5.3 se instala y configura en el proyecto (`00_VISION_PROYECTO.md` §9).
- **Cómo se imponen los tokens en la implementación real.** El proyecto consume el CSS ya compilado (`bootstrap/dist/css/bootstrap.min.css`), no las fuentes Sass: los valores de marca vienen horneados en el archivo y sobrescribir variables Sass no tendría ningún efecto. La imposición se hace sobre las variables CSS que Bootstrap 5.3 sí resuelve en tiempo de ejecución:

| Qué se sobrescribe | Dónde actúa |
|---|---|
| `--bs-*-rgb` | Utilidades `text-*`, `bg-*`, `border-*`. |
| `--bs-secondary-color` | `.text-muted`. |
| `--bs-btn-*` por variante | `.btn-primary`, `.btn-outline-*`, `.btn-danger`, `.btn-success`. |
| `--bs-body-*`, `--bs-border-radius*`, `--bs-link-*` | Página, radios y enlaces. |

- El bloque Sass siguiente queda como **referencia de los valores de marca**, aplicable si en el futuro se pasara a compilar Bootstrap desde sus fuentes:

```scss
$primary: #0E1116;   // tinta de marca, no azul
$secondary: #5A636F;
$success: #0F6B41;
$danger: #B32318;
$warning: #9A5B00;
$info: #0B5D8A;
$light: #F8F9FA;
$dark: #0E1116;

$font-family-base: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

$spacer: 1rem;
$enable-rounded: true;
$border-radius: 0.25rem;
$border-radius-sm: 0.125rem;
$border-radius-lg: 0.5rem;
```

- No se usan colores o espaciados de Bootstrap como autoridad. Se usan como fallback o utilidad justificada.

## 13.2 CSS Modules

- Cada componente tiene su módulo CSS.
- Los valores se referencian mediante variables CSS generadas desde tokens:

```css
.button {
  background-color: var(--color-action-primary-bg);
  color: var(--color-action-primary-text);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}
```

## 13.3 Variables CSS globales

- Los tokens se exponen como variables CSS en `:root`.
- El tema oscuro futuro aplicará valores alternativos mediante un selector de clase en `<html>` o `<body>`.

```css
:root {
  --color-ink-900: #0e1116;
  --color-volt-500: #2f5fff;
  --color-action-primary-bg: var(--color-ink-900);
  --color-action-primary-text: #ffffff;
  --color-action-accent-bg: var(--color-volt-500);
  --color-action-accent-text: var(--color-white);
  --spacing-4: 1rem;
  --radius-md: 0.25rem;
  --radius-media: 0;
  --aspect-product: 1 / 1;
  --transition-fast: all 150ms ease-in-out;
}
```

---

# 14. Principios responsive

| Principio | Descripción |
|---|---|
| **Mobile First** | El diseño base es móvil; los breakpoints agregan complejidad en pantallas mayores. |
| **No scroll horizontal** | Ninguna pantalla genera scroll horizontal involuntario. |
| **Tablas adaptables** | Las tablas se adaptan mediante scroll horizontal controlado, tarjetas o columnas priorizadas. |
| **Formularios de una columna en móvil** | Los formularios de múltiples columnas en escritorio se apilan en una sola columna en móvil. |
| **Sidebar colapsable** | La navegación lateral del panel se colapsa a íconos o drawer en viewports pequeños. |
| **Touch targets** | Las áreas táctiles no son inferiores a `44x44px`. |
| **Legibilidad** | El tamaño de fuente base en inputs no se reduce por debajo de `16px` para evitar zoom automático en iOS. |

## 14.1 Comportamiento responsive del catálogo público

| Zona | Móvil (`xs`–`sm`) | Tablet (`md`) | Escritorio (`lg`+) |
|---|---|---|---|
| **Navbar** | Barra de 56px: menú, marca, buscar, carrito. Ejes dentro de un drawer con acordeón. | Barra de 64px, ejes visibles, sin panel desplegado. | Barra de 72px con ejes y mega-menú al enfocar o pasar el puntero. |
| **Buscador** | Ícono que expande una barra a ancho completo bajo el navbar. | Campo visible de ancho medio. | Campo visible permanente. |
| **Hero** | `aspect-hero-mobile`, texto sobre velo, un botón. | `aspect-hero-tablet`. | `aspect-hero-desktop`, texto alineado al contenedor, hasta dos botones. |
| **Accesos por categoría** | Carrusel de 1.4 piezas. | Grilla de 3. | Grilla de 5. |
| **Marcas** | Carrusel de 2.5. | Carrusel de 5. | Carrusel de 6–7 sin controles si no desborda. |
| **Carrusel de productos** | 2.2 piezas, sin botones, gesto táctil. | 3.5 piezas, botones visibles. | 5–6 piezas, botones visibles solo si hay desbordamiento. |
| **Tarjeta de producto** | Nombre `sm`, precio `lg`, dos por fila. | Nombre `md`, relleno mayor. | Ídem, con elevación al pasar el puntero. |
| **Footer** | Acordeón de columnas, datos de contacto siempre abiertos. | Dos columnas. | Cuatro columnas. |

## 14.2 Reglas transversales

- La Home nunca produce desplazamiento horizontal de página; el desplazamiento horizontal existe **solo dentro** de los carriles de carrusel.
- Ninguna sección desaparece por completo en móvil: se reordena o se compacta, pero el contenido comercial es el mismo.
- Los carriles de carrusel se extienden hasta el borde de la pantalla en móvil (`container-bleed`) con `scroll-padding` igual a `section-inset-x`, de modo que la primera tarjeta queda alineada con el título.

---

# 15. Inventario de componentes base

Componentes de diseño a especificar funcionalmente en `09_COMPONENTES.md`:

## 15.1 Acciones

- `Button`
- `IconButton`
- `Link`

## 15.2 Entrada de datos

- `Input`
- `Select`
- `Checkbox`
- `Radio`
- `Switch`
- `Textarea`
- `DatePicker`
- `FileInput`
- `SearchInput`

## 15.3 Retroalimentación

- `Alert`
- `Toast`
- `Badge`
- `Tag`
- `Spinner`
- `Skeleton`
- `LoadingOverlay`
- `ProgressBar`

## 15.4 Superposición

- `Modal`
- `Drawer`
- `Popover`
- `Tooltip`

## 15.5 Navegación

- `Breadcrumb`
- `Tabs`
- `Pagination`
- `Sidebar`
- `Navbar`
- `MegaMenu` *(nuevo en v2.0.0)*

## 15.6 Estructura

- `Card`
- `Accordion`
- `Table`
- `DataTable`
- `EmptyState`
- `Divider`
- `Container`
- `Grid`
- `Stack`
- `Section` *(nuevo en v2.0.0)*
- `SectionHeader` *(nuevo en v2.0.0)*
- `Carousel` *(nuevo en v2.0.0)*

## 15.7 Multimedia

- `Image`
- `Avatar`
- `ImageUploader`
- `MediaTile` *(nuevo en v2.0.0)* — pieza de contenido con imagen administrable y fallback tipográfico (`UDS-09`).

---

# 16. Trazabilidad

| Origen | Aplicación en este documento |
|---|---|
| `00_VISION_PROYECTO.md` §9 | Bootstrap 5.3, React y Vite como stack aprobado. |
| `00.3_NOMENCLATURA.md` | Convenciones de nombres de componentes. |
| `01_ANALISIS_NEGOCIO.md` | Los colores de producto son datos de negocio, no del sistema de diseño. |
| `02_ARQUITECTURA.md` | Mobile-first, organización por features, carga diferida. |
| `06_FRONTEND.md` | Stack frontend; este documento le provee los tokens visuales. |
| `07_PANEL_ADMIN.md` | Estados visuales y componentes base del panel derivan de aquí. |
| `08.0_UI_SYSTEM_ANALISIS_PREVIO.md` | Base del análisis previo aprobado. |

---

# 17. Prohibiciones visuales

| ID | Regla |
|---|---|
| **VIS-01** | No se permiten códigos de color directos en componentes o CSS Modules. |
| **VIS-02** | No se mezclan bibliotecas de íconos. |
| **VIS-03** | No se usan estilos inline salvo valores calculados dinámicamente. |
| **VIS-04** | No se definen animaciones superiores a `300 ms` sin justificación UX. |
| **VIS-05** | No se redefinen colores, tipografías ni espaciados en documentos posteriores. |
| **VIS-06** | No se usa `volt` como texto ni como fondo de texto sobre superficie clara (`UDS-11`). |
| **VIS-07** | No se instalan bibliotecas de carrusel (`UDS-08`). |
| **VIS-08** | No se incrustan rutas de imagen fijas como solución definitiva de contenido (`UDS-09`). |
| **VIS-09** | No se renderiza una imagen sin relación de aspecto declarada (`UDS-10`). |
| **VIS-10** | No se usa `outline: none` sin un indicador de foco sustituto visible. |

---

# 18. Historial de cambios

| **2.3.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Más tinta, menos blanco.** Decisión explícita del usuario tras revisar mockups: Novedades y Ofertas destacadas (`BannerRail`) y Promociones (`ProductRail`) pasan de tono claro a `tone="inverse"` — de 2 bloques oscuros en la Home (Hero, Marca destacada) a 5, con Destacados como único respiro claro entre ellos. Nueva decisión `UDS-12`: `Section` propaga el texto de `SectionHeader` por variables CSS de tono (`--section-text-muted`, `--section-text-link`, `--section-text-link-hover`), sin que el componente hijo necesite conocer el tono. Nuevo filete de acento (`--section-header-accent-*`) junto al título en tono inverso. Además: halo radial en el fondo del Hero (antes tinta plana), diagonales sutiles en el marco del carrusel de `BannerRail`, filete de acento en el borde superior de `BrandShowcase`, y trama de puntos casi imperceptible en `Section.toneDefault` (hoy exclusivo de Destacados). |
| **2.2.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Diseño visual de la Home.** Decisión explícita del usuario: el acento de energía (`color-volt-500`/`-600`) pasa de amarillo-verde (`#D6F32F`) a azul (`#2F5FFF`), a partir de una imagen de referencia usada para composición e identidad — no es la identidad real de Pablito Sports, es una elección estética confirmada por el usuario. `color-volt-on`, `color-action-accent-text` y `color-badge-sale-text` pasan de `ink-900` a `white`: el azul es más oscuro que el lima original y el texto oscuro sobre él no alcanza AA de texto normal (≈3.8:1); blanco sí (≈5.0:1). `UDS-11` se revisa: ya no prohíbe el acento como texto por falta de contraste (el azul lo tendría), sino por identidad (`UDS-07`, proporción 90/7/3). §10.2 actualiza la tabla de contraste verificado. Se corrige además que `--font-family-display` (`'Archivo'`, `'Archivo Narrow'`) nunca se cargaba: no había `@font-face` ni enlace, así que caía en silencio a la fuente del sistema desde que se declaró (v2.0.0). Se agrega el enlace de Google Fonts en `index.html`. |

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **2.1.0** | 17/08/2026 | 🟡 EN REVISIÓN | **Tanda funcional.** §6.1: se aclara el uso de `color-success`/`color-warning`/`color-danger` para los 3 estados de disponibilidad derivada (v1.4.0, `RN-38b`) y se retira el uso de `color-info` para "próximamente" (estado eliminado). No se agregan tokens nuevos — se reutiliza la paleta existente, sin adelantar el rediseño visual completo de la fase final. Pedido explícito del usuario en la tanda funcional del 17/08/2026. |
| **2.0.4** | 13/08/2026 | ✅ APROBADO | Hallazgos de la auditoría E10. §10.3: se documenta que Bootstrap anula el anillo de foco en todo `.btn` con mayor especificidad y que la capa de integración debe restituirlo. §10.1: se aclara que los enlaces no heredan el mínimo táctil de la regla base, que solo alcanza a botones y casillas; el icono de carrito medía 38 px y los enlaces del pie 19. |
| **2.0.3** | 13/08/2026 | ✅ APROBADO | §6.1: nuevo token `color-overlay-hero`. Al montar el hero se vio que un velo de una sola dirección deja el titular sobre zona transparente —abajo en móvil, a la izquierda en escritorio— y que además el respaldo claro de una imagen que no carga vuelve ilegible el texto blanco. El velo de dos capas garantiza el contraste sobre cualquier fotografía y sobre el respaldo. |
| **2.0.2** | 13/08/2026 | ✅ APROBADO | Corrección surgida al implementar E3. §14.1: la tarjeta de producto deja de describir una «acción rápida» de agregar al carrito, que `RN-53` vuelve imposible desde un listado; la diferencia entre tramos pasa a ser de tipografía y relleno. |
| **2.0.1** | 13/08/2026 | ✅ APROBADO | Correcciones surgidas al implementar E2. §8: se deja constancia de que `UIDS-03` (Font Awesome) nunca se implementó y de que los chevrones del carrusel son SVG en línea mientras tanto. §10.4: los controles del carrusel **no se renderizan** cuando no hay desbordamiento, en lugar de ocultarse con `aria-hidden`, que sobre un elemento focoable produce un control alcanzable por teclado e invisible para el lector de pantalla. |
| **2.0.0** | 13/08/2026 | ✅ APROBADO | **Identidad visual propia de tienda deportiva.** Se retira la paleta heredada de Bootstrap (`#0d6efd` y familia) y se adopta el sistema tinta + acento `volt` (`UDS-07`). Nuevas decisiones `UDS-07` a `UDS-11`. Reescritura de §6.1 (paleta), §6.2 (tipografía, escala, pesos, tracking y roles tipográficos), §6.4 (radios cortos), §6.5 (elevación por borde, no por sombra). Nuevos: ritmo de sección en §6.3, contenedor de tienda en §7.1, relaciones de aspecto en §7.5, métrica de carruseles en §7.6, contraste verificado y reglas de foco, teclado, movimiento y semántica en §10, responsive del catálogo público en §14.1 y §14.2. Se añaden `MegaMenu`, `Section`, `SectionHeader`, `Carousel` y `MediaTile` al inventario §15. Nuevas prohibiciones `VIS-06` a `VIS-10`. Tokens retirados documentados en §11.4. Decisión abierta `UDSP-01` sobre la fuente de display. Se corrige §13.1: la integración con Bootstrap se documenta sobre el CSS compilado que el proyecto realmente consume, no sobre variables Sass. |
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Redacción inicial del sistema de diseño. Deriva de `08.0_UI_SYSTEM_ANALISIS_PREVIO.md` aprobado. Incluye decisiones UDS-01 a UDS-06 y UIDS-03, design tokens, fundamentos visuales, layout, componentes base, accesibilidad, estados visuales, principios responsive y estructura para tema oscuro. |
