# 01_ANALISIS_NEGOCIO.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Análisis de Negocio |
| **Código** | 01 |
| **Versión** | 2.9.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 22/09/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅, [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ |
| **Documentos dependientes** | `02_ARQUITECTURA.md`, `03_SEGURIDAD.md`, `04_BASE_DATOS.md`, `05_API.md`, `06_FRONTEND.md`, `07_PANEL_ADMIN.md` |

> **Estabilidad de identificadores:** los prefijos `RN-`, `RF-`, `RNF-`, `CU-C-`, `CU-A-`, `P-`, `R-` conservan la numeración de la versión 1.1.0. La versión 2.0.0 reestructura las secciones, **no** renumera los requisitos. Toda referencia externa a un `RN-xx` sigue siendo válida.

---

# 2. Objetivo

Traducir la visión definida en `00_VISION_PROYECTO.md` a términos de negocio concretos: procesos, entidades, reglas, casos de uso y requisitos.

Este documento establece **qué debe hacer el sistema y bajo qué reglas**. No define **cómo** se implementará: eso corresponde a `02_ARQUITECTURA.md` y posteriores.

Toda regla de negocio aquí aprobada es de **cumplimiento obligatorio**. Ningún documento posterior puede contradecirla sin una nueva versión mayor de este documento.

---

# 3. Alcance

## 3.1 Incluye

- Contexto y problemática del negocio.
- Actores y sus responsabilidades.
- Procesos de negocio actuales y propuestos.
- Entidades de negocio a nivel conceptual.
- Reglas de negocio.
- Casos de uso.
- Requisitos funcionales y no funcionales.
- Especificación funcional de la consulta por WhatsApp.

## 3.2 No incluye

- Modelo físico de datos → `04_BASE_DATOS.md`
- Contratos de API → `05_API.md`
- Decisiones de tecnología, capas e índices → `02_ARQUITECTURA.md`
- Diseño visual → `08_UI_SYSTEM.md`
- Mecanismos de autenticación → `03_SEGURIDAD.md`

## 3.3 Fuera de alcance de la versión 1

Se ratifica lo establecido en `00_VISION_PROYECTO.md` §11. Adicionalmente **no forman parte de la v1**:

- Persistencia de consultas o pedidos en base de datos.
- Registro, cuentas o favoritos de clientes.
- Notificaciones automáticas al vendedor.
- Integración con la API oficial de WhatsApp Business.
- Control de stock numérico.
- Disponibilidad o precio diferenciados por variante.
- Promociones complejas: 2x1, combos, topes, cupones.
- Reportes y analítica dentro del panel.
- Cálculo de costos de envío.
- Reseñas, calificaciones o comparador de productos.

---

# 4. Definiciones

El vocabulario del proyecto se define en **[00.2_GLOSARIO.md](00.2_GLOSARIO.md)**, de aplicación obligatoria. Este documento no redefine términos.

## 4.1 Entidades de negocio

Definición **conceptual**. El modelo físico corresponde a `04_BASE_DATOS.md`.

| Entidad | Descripción | Gestión |
|---|---|---|
| **Producto** | Artículo comercializable. Núcleo del catálogo. | Admin |
| **Variante** | Combinación de Producto + Talle. Unidad que el cliente selecciona y consulta. **Entidad propia del modelo** (ver DN-01). | Derivada |
| **Marca** | Fabricante o marca comercial. | Admin |
| **Categoría** | Clasificación por tipo de artículo. Admite jerarquía. | Admin |
| **Deporte** | Disciplina asociada al producto. | Admin |
| **Sexo** | Público destinatario: Hombre, Mujer, Unisex, Niño, Niña. | Admin |
| **Talle** | Medida disponible. Pertenece a un tipo de talle. | Admin |
| **Tipo de Talle** | Agrupador: Calzado numérico, Indumentaria alfanumérica, Único. | Admin |
| **Imagen** | Fotografía del producto. Una es principal. | Admin |
| **Promoción** | Descuento aplicable a producto, categoría o marca, con vigencia. | Admin |
| **Banner** | Pieza gráfica promocional de la página principal. | Admin |
| **Usuario Administrador** | Cuenta con acceso al panel. | Superadmin |
| **Configuración de Tienda** | Datos globales: WhatsApp, plantillas, horarios, dirección, redes. | Admin |
| **Carrito** | Lista de consulta del cliente. Vive en el navegador. | Cliente |
| **Ítem de Carrito** | Variante + cantidad. | Cliente |

---

# 5. Responsabilidades

## 5.1 Actores del sistema

| Actor | Responsabilidad | Autenticación |
|---|---|---|
| **Cliente** | Navega el catálogo, arma su carrito de consulta y la envía por WhatsApp. | No requiere |
| **Vendedor** | Recibe la consulta, confirma precios y disponibilidad, y cierra la venta. Actor externo: no usa el sistema. | — |
| **Administrador** | Gestiona catálogo, precios, imágenes, clasificaciones, promociones, banners y plantillas de WhatsApp. | Requiere login |
| **Superadministrador** | Todo lo anterior, más la gestión de usuarios administradores. | Requiere login |
| **Sistema** | Compone el mensaje de WhatsApp, calcula descuentos y revalida el carrito. | — |

## 5.2 Responsabilidades sobre este documento

| Responsabilidad | Responsable |
|---|---|
| Aprobar una regla de negocio nueva o modificada | Responsable del proyecto |
| Verificar que ningún documento posterior contradiga una regla aprobada | Revisor |
| Implementar cada regla en la capa que corresponda | Implementador |
| Registrar toda decisión con su justificación | Redactor |

---

# 6. Contexto del Negocio

## 6.1 La tienda

Pablito Sports es una tienda deportiva con **una única sucursal física** en **Paraguay**, que comercializa en **guaraníes (PYG)**. Vende indumentaria, calzado, pelotas, guantes, accesorios y equipamiento deportivo.

La venta se realiza de forma presencial en el local y de forma remota mediante WhatsApp, canal por el cual los clientes consultan disponibilidad, precios y talles.

## 6.2 Problemática actual

| # | Problema | Impacto |
|---|---|---|
| P-01 | No existe un catálogo digital consultable por el cliente. | El cliente debe preguntar por cada producto individualmente. |
| P-02 | Los precios se responden manualmente por WhatsApp. | Alto consumo de tiempo del vendedor; respuestas repetitivas. |
| P-03 | Las fotos de productos están dispersas y desactualizadas. | Imagen comercial inconsistente. |
| P-04 | No hay forma de filtrar o buscar por marca, categoría, deporte o talle. | El cliente no descubre productos que sí están disponibles. |
| P-05 | Las consultas llegan incompletas, sin talle ni cantidad. | Ida y vuelta de mensajes antes de poder cotizar. |
| P-06 | Las promociones no tienen un canal de difusión propio. | Menor rotación de productos en oferta. |
| P-07 | Actualizar precios implica rehacer material gráfico. | Los precios publicados quedan desactualizados. |
| P-08 | No hay forma de comunicar productos por llegar. | Se pierden ventas de mercadería en camino. |

## 6.3 Solución propuesta

- **Catálogo público** navegable, con búsqueda y filtros combinables.
- **Precios visibles y actualizados**, administrados desde un único lugar.
- **Carrito de consulta** que el cliente arma por sí mismo.
- **Mensaje de WhatsApp** generado automáticamente, con plantilla editable por el administrador.
- **Panel administrativo** que centraliza la gestión del catálogo.

El sistema **no reemplaza la venta**: la concreta el vendedor por WhatsApp. El sistema elimina la fricción previa a esa conversación.

---

# 7. Procesos de Negocio

## 7.1 Proceso actual

```
Cliente ve una foto en redes
   ↓
Escribe por WhatsApp: "¿Cuánto sale?"
   ↓
Vendedor busca el precio manualmente
   ↓
Responde precio
   ↓
Cliente pregunta por talle
   ↓
Vendedor verifica y responde
   ↓
... (N intercambios)
   ↓
Recién aquí comienza la negociación real
```

**Costo:** entre 6 y 15 mensajes antes de poder cotizar.

## 7.2 Proceso propuesto

```
Cliente ingresa al catálogo web
   ↓
Busca / filtra por categoría, marca, deporte, sexo, talle o precio
   ↓
Ve precio, fotos y disponibilidad
   ↓
Selecciona talle
   ↓
Agrega la variante al carrito de consulta
   ↓
(repite por cada producto)
   ↓
Abre el carrito
   ↓
El sistema revalida los ítems contra la API
   ↓
Cliente revisa el total estimado
   ↓
Presiona "Consultar por WhatsApp"
   ↓
Se abre WhatsApp con el mensaje completo pre-cargado
   ↓
Cliente envía
   ↓
Vendedor recibe la consulta completa y cotiza en 1 mensaje
```

**Beneficio:** de N intercambios a 1 consulta estructurada.

## 7.3 Revalidación del carrito

Proceso crítico: el carrito puede permanecer hasta 30 días en el navegador del cliente mientras el catálogo cambia.

```
LocalStorage
   ↓
API
   ↓
¿El producto sigue activo?
   ↓
¿El precio cambió?
   ↓
¿La disponibilidad cambió?
   ↓
Notificar al cliente y actualizar el ítem
```

Sin esta revalidación, el cliente podría enviar por WhatsApp precios vencidos o productos dados de baja.

---

# 8. Reglas de Negocio

## 8.1 Producto y clasificación

| ID | Regla |
|---|---|
| RN-01 | Solo los productos **activos** son visibles en el catálogo público. |
| RN-02 | El administrador puede **ocultar un producto sin eliminarlo**, desactivándolo. |
| RN-03 | Un producto puede pertenecer a **una o más categorías**. |
| RN-04 | Una de sus categorías se designa como **categoría principal**, usada para navegación, migas de pan y URL. |
| RN-05 | Un producto pertenece a **exactamente una marca**. |
| RN-06 | Una **marca puede estar asociada a múltiples productos**. |
| RN-07 | Una **categoría puede contener múltiples productos**. |
| RN-08 | Un producto puede asociarse a **uno o más deportes**. La asociación es opcional. |
| RN-09 | Un producto se clasifica por **sexo**: Hombre, Mujer, Unisex, Niño o Niña. |
| RN-10 | Cada producto tiene un **slug único** para su URL pública. Ver también `RN-79`. |
| RN-79 | **Toda entidad utilizada como filtro público deberá poseer un slug único, permanente y no reutilizable.** Aplica como mínimo a **Producto, Marca, Categoría, Deporte y Sexo**. |
| RN-80 | Un producto puede asignarse **tanto a una categoría padre como a una categoría hoja**. Al consultar una categoría padre se devuelven los productos asignados directamente a ella **y** los de todas sus categorías descendientes. |
| RN-83 | Una **categoría declara a qué sexos aplica** (Hombre, Mujer, Unisex, Niño, Niña). Es lo que decide en qué secciones de la navegación se ofrece y qué categorías se listan en el filtro del catálogo cuando el cliente ya filtró por sexo. **Una categoría sin sexos indicados no está restringida** y se ofrece en todas: la ausencia significa «sin restricción», no «ninguno». Es un dato del administrador, independiente de los sexos de los productos que contenga. |
| RN-11 | Cada producto tiene un **código interno (SKU) único**, no visible al cliente. |
| RN-12 | Un producto **no puede activarse** sin precio de lista válido, imagen principal y al menos una categoría. |

## 8.2 Variantes y talles

| ID | Regla |
|---|---|
| RN-13 | Una **variante** es la combinación de Producto + Talle. Es la unidad que el cliente selecciona. (Revisado 19/08/2026: se retira el color como eje de la variante — ver `13_CHANGELOG.md`.) |
| RN-14 | Un producto puede tener **0..N talles**. (Revisado 19/08/2026: definía también 0..N colores; ya no existe esa clasificación.) |
| RN-15 | Cada producto define su **tipo de talle**. Los talles ofrecidos deben pertenecer a ese tipo. |
| RN-15b | El **nombre del talle es texto libre** (revisado v1.5.0, pedido explícito del usuario): admite cualquier valor alfanumérico razonable (numérico, decimal, alfabético, alfanumérico, con "/" o "-", "Único"), sin restricción de formato según el tipo de talle. Solo se exige que no quede vacío tras recortar espacios. |
| RN-16 | Si el producto define talles, **su selección es obligatoria** antes de agregarlo al carrito. (Revisado 19/08/2026: antes también cubría color.) |
| RN-17 | Las variantes **no tienen precio propio**. El precio se define a nivel producto. Decisión firme, no diferida (**DN-02**). |
| RN-18 | Las variantes **no tienen disponibilidad propia** en v1: el estado se define a nivel producto. No obstante, la **Variante se modela como entidad propia desde el inicio**, de modo que incorporar disponibilidad por variante en el futuro no exija reestructurar el modelo (**DN-01**). |

## 8.3 Imágenes

| ID | Regla |
|---|---|
| RN-19 | **Todo producto debe tener al menos una imagen.** |
| RN-20 | Exactamente **una imagen es la principal**. |
| RN-21 | **La imagen principal siempre aparece primero**, tanto en el catálogo como en la galería del detalle. |
| RN-22 | Las imágenes secundarias respetan el **orden definido por el administrador**. |

## 8.4 Precios y moneda

| ID | Regla |
|---|---|
| RN-23 | La moneda del sistema es el **guaraní paraguayo (PYG)**, representado como **`Gs.`**. |
| RN-24 | Los importes son **enteros, sin decimales**, con **punto como separador de miles**. Ejemplo: `Gs. 300.000`. |
| RN-25 | Los precios se expresan **con impuestos incluidos**. |
| RN-26 | **Los precios siempre son públicos.** No existe la modalidad "consultar precio". |
| RN-27 | Todo producto activo debe tener **precio de lista mayor a cero**. |
| RN-28 | Los precios publicados son **informativos** y están sujetos a confirmación del vendedor. |
| RN-29 | La moneda es **única en v1**, pero el modelo **no debe impedir la incorporación de otras monedas** en versiones futuras. |

## 8.5 Ofertas y promociones

| ID | Regla |
|---|---|
| RN-30 | **La oferta la define el administrador**, cargando precio de oferta, fecha de inicio y fecha de fin. No se deriva de ningún otro dato. |
| RN-31 | El **precio de oferta debe ser estrictamente menor** al precio de lista. |
| RN-32 | Una oferta está **vigente** si la fecha actual se encuentra dentro de su rango. Fuera de ese rango **no aplica**, aunque el precio esté cargado. |
| RN-33 | Sin fecha de fin, la oferta rige **indefinidamente** mientras el producto esté activo. |
| RN-34 | La vigencia se evalúa según la **zona horaria de la tienda** (Paraguay). |
| RN-35 | Con oferta vigente se muestra: precio de lista **tachado**, precio de oferta y **porcentaje de descuento redondeado hacia abajo**. |
| RN-36 | Una promoción puede aplicarse a **un producto, una categoría, una marca, o a todos los productos** (revisado v2.9.0, pedido explícito del usuario). Sin indicar producto, categoría ni marca, la promoción rige sobre el catálogo entero. |
| RN-37 | Si concurren varias promociones vigentes, se aplica la de **mayor descuento**. |
| RN-38b | Las promociones de v1 son **descuentos simples**. No existen 2x1, combos, topes ni cupones (**DN-03**). |

## 8.6 Disponibilidad

| ID | Regla |
|---|---|
| RN-38 | Los estados son: **`Disponible`**, **`Stock bajo`** y **`No disponible`** (v1.4.0: se retira `Próximamente`, y `Poco stock`/`Sin stock` se renombran; ver `07_PANEL_ADMIN.md` v1.4.0, `RN-38b` del código). |
| RN-39 | **v1 maneja stock numérico por variante** (v1.4.0, revierte la redacción original de este documento): `variants.quantity` es la fuente de verdad, cargada por el administrador. La disponibilidad **se deriva automáticamente** de esa cantidad — más de 5 unidades es `Disponible`, de 1 a 5 es `Stock bajo`, 0 es `No disponible` — y deja de ser un estado que el administrador asigna a mano. |
| RN-40 | **Todos los productos activos pueden agregarse al carrito**, cualquiera sea su disponibilidad. Un producto sin stock hoy puede reponerse la semana siguiente: la consulta genera venta. |
| RN-41 | El estado se muestra en el **catálogo, el detalle, el carrito y el mensaje de WhatsApp**. |
| RN-82 | **El administrador puede registrar una venta sobre una variante**, indicando la cantidad vendida. El sistema **descuenta esa cantidad de `variants.quantity` automáticamente** y dispara el recálculo de disponibilidad de `RN-39`. No se puede registrar una venta por más unidades de las que hay cargadas. Cada venta queda en un registro inmutable (`sales`), igual que `price_history` (`RN-70`) — no se edita ni se borra. |

## 8.7 Destacados y novedades

| ID | Regla |
|---|---|
| RN-42 | **Destacado** es una marca **manual** del administrador. |
| RN-43 | **Nuevo** es una marca **manual** del administrador, **con independencia de la fecha de alta** del producto. |
| RN-44 | Un producto puede ser simultáneamente **destacado, nuevo y estar en oferta**. |
| RN-45 | La cantidad de destacados en la página principal es **configurable**. |

## 8.8 Búsqueda y filtros

| ID | Regla |
|---|---|
| RN-46 | **Los filtros podrán combinarse**: Marca + Categoría + Talle + Sexo + Deporte + rango de precio + oferta + nuevo. |
| RN-47 | Los filtros ofrecen **únicamente opciones que arrojan al menos un producto activo**. |
| RN-48 | La búsqueda por texto opera sobre **nombre, marca, categoría y deporte**. |

## 8.9 Carrito de consulta

| ID | Regla |
|---|---|
| RN-49 | **El carrito nunca genera una venta. Solo una consulta.** |
| RN-50 | **WhatsApp es el único canal de cierre de venta.** |
| RN-51 | El carrito **no reserva stock ni compromete precio**. |
| RN-52 | El carrito reside en el **navegador del cliente**. El servidor no lo almacena. |
| RN-53 | La **unidad del carrito es la variante**. Dos variantes distintas del mismo producto son **ítems distintos**. |
| RN-54 | La cantidad por ítem es un entero entre **1 y 99**. |
| RN-55 | El carrito muestra **subtotal por ítem** y **total estimado**. |
| RN-56 | Los ítems del carrito se **revalidan contra la API en dos momentos**: **al abrir el carrito** y **antes de generar el mensaje de WhatsApp**. Se verifica producto activo, precio vigente y disponibilidad. Los cambios se **notifican al cliente**. El último instante antes del envío debe reflejar la verdad. |
| RN-57 | El carrito **expira a los 30 días** desde su última modificación. |
| RN-75 | El carrito admite un **máximo de 26 productos distintos**. Alcanzado el límite, se informa al cliente con un mensaje claro. La cantidad por ítem sigue rigiéndose por `RN-54`. |
| RN-76 | El mensaje de WhatsApp **nunca debe superar el límite de longitud del cuerpo de mensaje que WhatsApp acepta**, medido en **caracteres del mensaje** —no en la longitud del enlace—. El límite de `RN-75` reduce la frecuencia con que el sistema debe intervenir, pero **no lo garantiza por sí solo**: la garantía es la **validación de la longitud real antes de generar el enlace**. Si el mensaje superara el límite, o si una plantilla editada (`RN-59`) lo acercara, el sistema **advierte y no genera el enlace**. |
| RN-77 | **El carrito nunca se modifica sin que el cliente lo vea.** Todo cambio de precio, de variante o de disponibilidad detectado en la revalidación se muestra explícitamente. |
| RN-78 | **No se genera el mensaje de WhatsApp mientras exista una discrepancia sin confirmar.** El cliente debe confirmar el carrito actualizado antes de que el sistema componga el mensaje. Aplica a discrepancias **detectadas**; el caso de revalidación no completada se rige por `RN-81`. |
| RN-81 | **Si la revalidación no puede completarse por un fallo de red**, el sistema muestra una advertencia indicando que los precios y la disponibilidad podrían haber cambiado, y ofrece al cliente tres opciones: **reintentar**, **cancelar** o **enviar igualmente la consulta**. Un fallo temporal de conectividad **nunca bloquea la consulta por sí solo**. |

## 8.10 Consulta por WhatsApp

| ID | Regla |
|---|---|
| RN-58 | El **número de WhatsApp** destino es configurable desde el panel. |
| RN-59 | **La plantilla del mensaje es editable desde el panel.** El texto no está fijo en el sistema. |
| RN-60 | La plantilla se compone mediante **variables**. El sistema valida la presencia de las obligatorias antes de guardar. |
| RN-61 | El sistema provee una **plantilla por defecto restaurable** en cualquier momento. |
| RN-62 | El envío se realiza mediante enlace `wa.me`. **El cliente confirma el envío desde WhatsApp**, no el sistema. |
| RN-63 | El sistema **no almacena la consulta ni datos personales del cliente**. |
| RN-64 | El mensaje incluye un **código de consulta corto** para facilitar la referencia. |
| RN-65 | El carrito **no se vacía automáticamente** al enviar la consulta. |

## 8.11 Administración

| ID | Regla |
|---|---|
| RN-66 | El panel administrativo requiere **autenticación**. No existe acceso anónimo. |
| RN-67 | Roles en v1: **Superadministrador** y **Administrador**. Solo el Superadministrador gestiona usuarios. |
| RN-68 | **No se puede eliminar** una marca, categoría, deporte o talle con productos asociados. |
| RN-69 | La eliminación de productos es **lógica**, nunca física. |
| RN-70 | Toda **modificación de precio** queda registrada con usuario, valor anterior, valor nuevo y fecha. |
| RN-71 | **No se puede eliminar ni desactivar** al último Superadministrador activo. |
| RN-72 | Un usuario administrador **no puede eliminarse a sí mismo**. |

## 8.12 Banners

| ID | Regla |
|---|---|
| RN-73 | Los banners tienen **orden de aparición**, **vigencia** y **estado activo**. |
| RN-74 | Un banner sin vigencia definida es **permanente** mientras esté activo. |

---

# 9. Casos de Uso

## 9.1 Cliente

| ID | Caso de Uso | Descripción |
|---|---|---|
| CU-C-01 | Ver página principal | Banners, destacados, novedades y ofertas. |
| CU-C-02 | Explorar catálogo | Lista productos activos con paginación. |
| CU-C-03 | Buscar productos | Texto sobre nombre, marca, categoría y deporte. |
| CU-C-04 | Filtrar productos | Combina marca, categoría, talle, sexo, deporte, precio, oferta y novedad. |
| CU-C-05 | Ordenar resultados | Relevancia, precio ascendente/descendente, más recientes. |
| CU-C-06 | Ver detalle de producto | Fotos, descripción, precio, talles, deporte, sexo y disponibilidad. |
| CU-C-07 | Seleccionar variante | Elige talle. |
| CU-C-08 | Agregar al carrito | Agrega la variante con una cantidad. |
| CU-C-09 | Ver carrito | Revisa ítems, subtotales y total estimado, con revalidación previa. |
| CU-C-10 | Modificar cantidad | Ajusta la cantidad de un ítem. |
| CU-C-11 | Eliminar ítem | Quita un ítem del carrito. |
| CU-C-12 | Vaciar carrito | Elimina todos los ítems. |
| CU-C-13 | Enviar consulta por WhatsApp | Genera el mensaje y abre WhatsApp. |
| CU-C-14 | Consultar un producto puntual | Consulta de un solo producto desde su ficha. |
| CU-C-15 | Ver información de la tienda | Dirección, horarios, contacto y redes. |

## 9.2 Administrador

| ID | Caso de Uso | Rol mínimo |
|---|---|---|
| CU-A-01 | Iniciar sesión | Administrador |
| CU-A-02 | Cerrar sesión | Administrador |
| CU-A-03 | Ver dashboard | Administrador |
| CU-A-04 | Crear producto | Administrador |
| CU-A-05 | Editar producto | Administrador |
| CU-A-06 | Activar / desactivar (ocultar) producto | Administrador |
| CU-A-07 | Eliminar producto (lógico) | Administrador |
| CU-A-08 | Cambiar precio | Administrador |
| CU-A-09 | Definir oferta con vigencia | Administrador |
| CU-A-10 | Marcar producto como destacado | Administrador |
| CU-A-11 | Marcar producto como nuevo | Administrador |
| CU-A-12 | Cambiar estado de disponibilidad | Administrador |
| CU-A-13 | Gestionar imágenes del producto | Administrador |
| CU-A-14 | Definir imagen principal y reordenar galería | Administrador |
| CU-A-15 | Gestionar marcas | Administrador |
| CU-A-16 | Gestionar categorías | Administrador |
| CU-A-17 | Gestionar deportes | Administrador |
| CU-A-18 | Ver sexos del catálogo | Administrador |
| CU-A-19 | *Retirado (19/08/2026): gestionar colores.* Ya no existe la clasificación "color". | — |
| CU-A-20 | Gestionar talles y ver tipos de talle | Administrador |
| CU-A-21 | Gestionar promociones | Administrador |
| CU-A-22 | Gestionar banners | Administrador |
| CU-A-23 | Editar configuración de la tienda | Administrador |
| CU-A-24 | Editar la plantilla del mensaje de WhatsApp | Administrador |
| CU-A-25 | Restaurar la plantilla por defecto | Administrador |
| CU-A-26 | Gestionar usuarios administradores | **Superadministrador** |
| CU-A-27 | Cambiar contraseña propia | Administrador |
| CU-A-28 | Consultar historial de cambios de precio | Administrador |

---

# 10. Requisitos Funcionales

## 10.1 Catálogo público

| ID | Requisito |
|---|---|
| RF-01 | Listar los productos activos con paginación. |
| RF-02 | Búsqueda por texto sobre nombre, marca, categoría y deporte. |
| RF-03 | Filtrar por marca, categoría, talle, sexo, deporte, rango de precio, oferta y novedad. |
| RF-04 | Los filtros deben ser **combinables** entre sí. |
| RF-05 | Los filtros deben ofrecer únicamente opciones que arrojen resultados. |
| RF-06 | El estado de búsqueda y filtros debe reflejarse en la **URL**. |
| RF-07 | Permitir ordenar los resultados. |
| RF-08 | Mostrar el detalle completo de un producto mediante su slug. |
| RF-09 | Mostrar la galería con la imagen principal en primer lugar. |
| RF-10 | Mostrar precio de lista, precio de oferta y porcentaje de descuento, en guaraníes. |
| RF-11 | Mostrar el estado de disponibilidad. |
| RF-12 | Mostrar destacados, novedades y ofertas en la página principal. |
| RF-13 | Mostrar los banners activos y vigentes, respetando su orden. |
| RF-14 | Mostrar un mensaje claro cuando una búsqueda no arroja resultados. |
| RF-15 | Mostrar la información institucional de la tienda. |

## 10.2 Carrito

| ID | Requisito |
|---|---|
| RF-16 | Agregar una variante al carrito indicando talle y cantidad. |
| RF-17 | Impedir agregar sin haber seleccionado las variantes obligatorias. |
| RF-18 | Permitir agregar productos en **cualquier estado de disponibilidad**. |
| RF-19 | Agrupar ítems idénticos sumando sus cantidades. |
| RF-20 | Permitir modificar cantidades, eliminar ítems y vaciar el carrito. |
| RF-21 | Persistir el carrito entre sesiones del navegador. |
| RF-22 | Revalidar el carrito contra la API al abrirlo y notificar los cambios. |
| RF-23 | Calcular subtotales y total estimado. |
| RF-24 | Mostrar un indicador con la cantidad de ítems en la cabecera. |
| RF-25 | Generar el mensaje de WhatsApp **según la plantilla configurada**. |
| RF-26 | Abrir WhatsApp con el mensaje pre-cargado, en app o web según el dispositivo. |

## 10.3 Panel administrativo

| ID | Requisito |
|---|---|
| RF-27 | Autenticar administradores mediante usuario y contraseña. |
| RF-28 | Cerrar la sesión por inactividad. |
| RF-29 | ABM completo de productos, marcas, categorías, deportes, talles, promociones, banners y usuarios. Los sexos y los tipos de talle son datos semilla no administrables: solo se consultan. |
| RF-30 | Asignar múltiples categorías y deportes a un producto, y designar la categoría principal. |
| RF-31 | Cargar múltiples imágenes, reordenarlas y definir la principal. |
| RF-32 | Validar formato, peso y dimensiones de las imágenes. |
| RF-33 | Generar versiones optimizadas de cada imagen. |
| RF-34 | Definir precio de oferta con fecha de inicio y fin. |
| RF-35 | Marcar manualmente un producto como destacado y como nuevo. |
| RF-36 | Registrar el historial de cambios de precio. |
| RF-37 | Impedir operaciones que violen RN-68, RN-71 y RN-72, informando el motivo. |
| RF-38 | Dashboard con totales por estado: activos, ocultos, por disponibilidad y en oferta vigente. |
| RF-39 | Dashboard que señale productos incompletos: sin imagen, sin precio o sin categoría. |
| RF-40 | Editar la configuración global, incluido el número de WhatsApp. |
| RF-41 | Editar por completo la plantilla del mensaje de WhatsApp, con listado de variables, vista previa, validación de obligatorias y restauración de la plantilla por defecto. |
| RF-42 | Listados del panel con búsqueda, filtros y paginación. |

---

# 11. Requisitos No Funcionales

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Rendimiento | La página principal debe alcanzar LCP < 2,5 s en 4G. |
| RNF-02 | Rendimiento | Las respuestas de la API de catálogo deben resolverse en < 300 ms (p95). |
| RNF-03 | Rendimiento | Las imágenes deben servirse optimizadas y con carga diferida. |
| RNF-04 | Escalabilidad | **El sistema deberá soportar el crecimiento continuo del catálogo sin afectar la experiencia del usuario.** |
| RNF-05 | Escalabilidad | El diseño no debe requerir rediseño estructural ante el crecimiento del catálogo o nuevas clasificaciones. |
| RNF-06 | Usabilidad | Diseño **mobile-first**. |
| RNF-07 | Usabilidad | Todo producto alcanzable en un máximo de 3 interacciones desde la página principal. |
| RNF-08 | Compatibilidad | Dos últimas versiones estables de Chrome, Firefox, Safari y Edge. |
| RNF-09 | Accesibilidad | Cumplimiento de WCAG 2.1 nivel AA. |
| RNF-10 | SEO | URLs semánticas, metadatos por producto y datos estructurados. |
| RNF-11 | Seguridad | Contraseñas almacenadas con hash robusto. |
| RNF-12 | Seguridad | Todo el tráfico sobre HTTPS. |
| RNF-13 | Seguridad | El panel administrativo no debe ser indexable. |
| RNF-14 | Disponibilidad | Objetivo del 99% mensual. |
| RNF-15 | Mantenibilidad | Arquitectura modular, alta cohesión y bajo acoplamiento. |
| RNF-16 | Respaldo | Respaldo diario automatizado de base de datos e imágenes. |
| RNF-17 | Idioma | Interfaz en español. La arquitectura no debe impedir multiidioma futuro. |
| RNF-18 | Moneda | Formato de guaraníes consistente. El diseño no debe impedir multimoneda futura. |

---

# 12. Consulta por WhatsApp

El mensaje **no es fijo**. El administrador lo edita desde el panel (RN-59). El sistema define las variables disponibles y una plantilla por defecto.

## 12.1 Variables del mensaje

| Variable | Contenido | Obligatoria |
|---|---|---|
| `{{items}}` | Lista completa de ítems, compuesta con la plantilla de ítem. | ✅ |
| `{{total}}` | Total estimado formateado. | ✅ |
| `{{cantidad_items}}` | Cantidad de ítems distintos en el carrito. | — |
| `{{codigo_consulta}}` | Código corto de referencia (`PS-XXXXX`). | — |
| `{{tienda}}` | Nombre de la tienda. | — |
| `{{fecha}}` | Fecha de generación de la consulta. | — |

## 12.2 Variables del ítem

| Variable | Contenido |
|---|---|
| `{{numero}}` | Número de orden dentro de la lista. |
| `{{producto}}` | Nombre del producto. |
| `{{marca}}` | Marca. |
| `{{talle}}` | Talle seleccionado. |
| `{{cantidad}}` | Cantidad solicitada. |
| `{{precio_unitario}}` | Precio vigente por unidad. |
| `{{subtotal}}` | Cantidad × precio unitario. |
| `{{disponibilidad}}` | Estado de disponibilidad del producto. |

## 12.3 Plantillas por defecto

**Mensaje:**

```
Hola {{tienda}}! 👋
Quiero consultar por estos productos:

{{items}}
--------------------------------
Total estimado: {{total}}
(Precios sujetos a confirmación)

Consulta N.º: {{codigo_consulta}}
```

**Ítem:**

```
{{numero}}) {{producto}}
   Marca: {{marca}} | Talle: {{talle}}
   Cantidad: {{cantidad}} x {{precio_unitario}} = {{subtotal}}
   Estado: {{disponibilidad}}
```

## 12.4 Resultado renderizado

```
Hola Pablito Sports! 👋
Quiero consultar por estos productos:

1) Botín Nike Mercurial Vapor 16
   Marca: Nike | Talle: 42
   Cantidad: 1 x Gs. 850.000 = Gs. 850.000
   Estado: Disponible

2) Camiseta Adidas Entrenamiento
   Marca: Adidas | Talle: L
   Cantidad: 2 x Gs. 230.000 = Gs. 460.000
   Estado: Poco stock

3) Pelota Penalty S11 R1
   Marca: Penalty
   Cantidad: 1 x Gs. 340.000 = Gs. 340.000
   Estado: Próximamente

--------------------------------
Total estimado: Gs. 1.650.000
(Precios sujetos a confirmación)

Consulta N.º: PS-7K3M9
```

## 12.5 Reglas de composición

- Las **variables sin valor se omiten junto con su etiqueta**: si el producto no tiene talle, no se imprime `Talle:` (ver ítem 3).
- El total usa el **precio vigente al momento de generar el mensaje**.
- El código de consulta usa el prefijo `PS-` seguido de 5 caracteres alfanuméricos.
- El mensaje se codifica para URL preservando saltos de línea y emojis.
- Al guardar una plantilla, el panel muestra **vista previa con datos de ejemplo**.
- Si falta una variable obligatoria, **el guardado se rechaza** indicando cuál.

---

# 13. Métricas de Éxito

| Métrica | Situación actual | Objetivo v1 |
|---|---|---|
| Mensajes previos a la cotización | 6 a 15 | 1 |
| Tiempo del vendedor por consulta | Alto | Reducción estimada del 70% |
| Consultas con talle especificado | Bajo | > 90% |
| Tiempo de actualización de un precio | Minutos + material gráfico | < 30 segundos |
| Productos publicados con foto y precio | Parcial | 100% del catálogo activo |
| Consultas con más de un producto | Excepcional | Incremento sostenido |
| Consultas por productos `Próximamente` | Inexistente | Canal nuevo de venta anticipada |

> En v1 el sistema no incorpora analítica propia. Estas métricas se evalúan de forma cualitativa o mediante herramientas externas.

---

# 14. Trazabilidad

| Objetivo específico (`00_VISION_PROYECTO.md` §3) | Cubierto por |
|---|---|
| Mostrar el catálogo completo | RF-01, CU-C-02 |
| Permitir búsquedas rápidas | RF-02, RN-48, CU-C-03 |
| Permitir filtros avanzados | RF-03, RF-04, RF-05, RN-46, CU-C-04 |
| Mostrar fotografías de alta calidad | RF-09, RF-33, RN-19 a RN-22, RNF-03 |
| Mostrar precios actualizados | RF-10, RN-23 a RN-29 |
| Administrar todo el contenido | RF-27 a RF-42 |
| Generación automática de consultas por WhatsApp | RF-25, RF-26, RF-41, §13 |
| Arquitectura preparada para expansiones | RNF-04, RNF-05, RNF-17, RNF-18, RN-18 |

## 14.1 Trazabilidad de las reglas incorporadas tras la aprobación

| Regla | Origen | Documento donde se materializa |
|---|---|---|
| `RN-75`, `RN-76` | `DN-11`, `DN-12` — límite del carrito y longitud del mensaje · **revisadas por `DN-17`** | `02` §13.10 · evidencia en [`docs/evidencia/ADP-07/`](evidencia/ADP-07/INFORME_ADP-07.md) |
| `RN-77`, `RN-78` | `DN-13`, `DN-14` — visibilidad y confirmación de cambios | `02` §13.6 · `AD-25`, `AD-28` |
| `RN-79` | Corrección **C-03** — slug en toda entidad de filtro | `00.2` §4.2 · `00.3` §16.5 · `AD-23` |
| `RN-80` | `DN-15` — asignación y consulta por categoría padre | `02` §12.3 · `AD-29` |
| `RN-81` | `DN-16` — revalidación no completada | `02` §13.6 · `AD-30` |

---

# 15. Diagramas

| # | Diagrama | Sección |
|---|---|---|
| D-01 | Proceso de negocio actual | 7.1 |
| D-02 | Proceso de negocio propuesto | 7.2 |
| D-03 | Revalidación del carrito | 7.3 |

Notación: diagramas de flujo en texto plano. Los diagramas estructurados del sistema corresponden a `02_ARQUITECTURA.md`.

---

# 16. Decisiones

Registro de decisiones de negocio. Prefijo `DN-`.

| ID | Decisión | Contexto | Justificación | Consecuencias |
|---|---|---|---|---|
| **DN-01** | **La Variante se modela como entidad propia desde el inicio, pero la disponibilidad se define a nivel producto en v1.** Resuelve `DA-01`. | ¿El estado de stock es del producto o de la variante? Ejemplo: talle 42 agotado, talle 41 disponible. | Asignar disponibilidad por variante multiplicaría la carga del administrador de 1 estado a decenas por producto, y `00_VISION_PROYECTO.md` §11 excluye el inventario de la v1. Modelar la Variante desde el inicio cuesta poco hoy y evita una reestructuración mayor si el negocio la necesita. | RN-18. La Variante existe en el modelo de datos con identidad propia. `04_BASE_DATOS.md` debe preverla como tabla. La migración a disponibilidad por variante será aditiva, no estructural. |
| **DN-02** | **Precio único por producto. Las variantes no tienen precio propio.** Resuelve `DA-02`. | ¿Un talle 46 puede costar más que un talle 40? | Simplifica el carrito, el total estimado, la revalidación y el mensaje de WhatsApp: el precio se resuelve en un solo lugar. El negocio no lo requiere hoy. | RN-17. Decisión firme, no diferida. Reabrirla implicaría revisar el flujo completo del carrito. |
| **DN-03** | **Promociones de descuento simple únicamente.** Resuelve `DA-03`. | ¿2x1, combos, topes, cupones? | RN-30 a RN-37 ya cubren el caso real del negocio: precio de oferta con vigencia sobre producto, categoría o marca. Un motor de reglas ampliaría el MVP sin demanda que lo justifique. | RN-38b. El cálculo del total estimado permanece trivial. |
| **DN-04** | **No se modela sucursal en v1.** Resuelve `DA-04`. | ¿Se prevén múltiples sucursales? | `00_VISION_PROYECTO.md` §11 las excluye explícitamente de la v1 y §13 las contempla como extensión futura. La tienda tiene una sola sucursal (§6). | `02_ARQUITECTURA.md` §21.7 documentará el punto de extensión sin implementarlo. |
| **DN-05** | **Multimoneda no se implementa, pero no se impide.** Resuelve `DA-05`. | RN-29 obliga a no bloquearla. | Guaraní único hoy. Impedirla estructuralmente sería un error; implementarla sin demanda, también. | RN-29, RNF-18. `02_ARQUITECTURA.md` §21.8 documentará el punto de extensión. |
| **DN-06** | **"Nuevo" y "Destacado" son marcas manuales, no cálculos.** | Una versión previa calculaba "Nuevo" por antigüedad. | El control comercial pertenece al administrador: puede querer destacar como nuevo un producto publicado hace meses. | RN-42, RN-43. Reforzado en `00.2_GLOSARIO.md` GL-08 para impedir que el automatismo reaparezca. |
| **DN-07** | **Los productos sin stock pueden agregarse al carrito.** | Una versión previa lo bloqueaba. | Muchos productos se reponen en días. Bloquear la consulta elimina una venta que el vendedor podría concretar con un "la próxima semana llega". | RN-40, RF-18. El estado viaja hasta el mensaje de WhatsApp (RN-41). |
| **DN-08** | **El carrito se revalida contra la API al abrirse.** ⚠️ **Actualizado por `DN-10`.** | El carrito vive hasta 30 días en el navegador. | Sin revalidación, el cliente puede enviar precios vencidos o productos dados de baja, generando conflicto con el vendedor. | RN-56, RF-22. Requiere un endpoint dedicado (`02_ARQUITECTURA.md` §11.8). El contexto de esta decisión se conserva sin modificar; la revalidación pasó a ocurrir en **dos** momentos por `DN-10`. |
| **DN-09** | **La plantilla del mensaje de WhatsApp es editable por el administrador.** | El texto no debe estar fijo en el código. | El vendedor conoce mejor que el sistema cómo quiere recibir las consultas, y el formato cambiará con el uso. | RN-59 a RN-61, RF-41. Riesgo R-07 mitigado con validación de variables obligatorias y restauración por defecto. |
| **DN-10** | **La revalidación ocurre en dos momentos: al abrir el carrito y antes de generar el mensaje.** | La versión anterior de `RN-56` revalidaba solo al abrir. Detectado al descender al nivel arquitectónico: el cliente puede abrir el carrito, dejarlo quince minutos y recién entonces enviar. | El mensaje saldría con precios de hace quince minutos. **El último instante en que el sistema puede evitar enviar un precio incorrecto al vendedor es justo antes de generar el enlace.** | RN-56 ampliada. Requiere que el flujo de envío incluya un paso de revalidación. |
| **DN-11** | **Máximo de 30 productos distintos en el carrito.** ⚠️ **Actualizado por `DN-17`.** | `RN-54` limitaba la cantidad por ítem, pero nada impedía 80 productos distintos. | Comercialmente nadie consulta 80 productos distintos, y un mensaje así es ilegible para el cliente e incotizable para el vendedor. | RN-75. El contexto y la justificación de esta decisión se conservan sin modificar: el criterio comercial sigue siendo válido. Lo que cambia es el **número**, que `DN-17` baja a 26 por evidencia de medición. |
| **DN-12** | **El límite de ítems se define para que el mensaje nunca supere la longitud que WhatsApp acepta.** ⚠️ **Actualizado por `DN-17`.** | El enlace `wa.me` codifica el mensaje en la URL, que tiene un límite práctico. Superarlo produce un mensaje **truncado sin error visible**. | Es una decisión de negocio, no técnica: en lugar de ampliar el límite del mensaje, se acota el carrito. Un fallo silencioso que entrega al vendedor una consulta incompleta es peor que impedir agregar el ítem 31. | RN-76. Obliga a validar la longitud antes de generar el enlace, incluso con plantillas editadas. Su contexto se conserva sin modificar, pero la medición de `ADP-07` demostró **dos supuestos incorrectos**: el factor limitante no es la longitud de la URL sino el cuerpo del mensaje, y el límite de ítems **no puede garantizar** `RN-76` por sí solo. Corregidos en `DN-17`. |
| **DN-17** | **El límite del carrito baja de 30 a 26 productos, y deja de presentarse como garantía de `RN-76`.** | Resolución de `ADP-07`. La medición reproducible del anexo `docs/evidencia/ADP-07/` estableció el techo del cuerpo de mensaje en **4 096 caracteres** y el coste por ítem con la plantilla por defecto en **110 / 142 / 239 caracteres** según la longitud de los datos del producto. Con 30 ítems, un carrito **típico** alcanza 4 432 caracteres: **excede el techo en 336**. No es un caso extremo, es el caso corriente del catálogo. | Un límite que se declara garantía de `RN-76` y no la cumple es peor que no tenerlo: hace confiar en una defensa inexistente. 26 es el máximo que el caso típico sostiene contra el techo de trabajo de 4 000 caracteres, y mantiene el carrito comercialmente holgado. **No cubre el peor caso** —nombres de producto largos—, que queda a cargo de la validación de longitud real, la única defensa que no depende de la composición del carrito. | RN-75 pasa a 26. RN-76 se reformula: se mide en caracteres del mensaje, no en longitud del enlace, y su garantía es la validación previa. Confirma el hallazgo `B-02`. Registrada en `02` §13.10 y en el riesgo `AR-07`. |
| **DN-13** | **El carrito nunca se modifica en silencio.** | La revalidación (`RN-56`) puede detectar cambios de precio, de variante o de disponibilidad. | Un carrito que cambia solo destruye la confianza del cliente justo antes de que consulte. Si el precio subió, debe verlo **antes** de enviar el mensaje, no descubrirlo en la conversación con el vendedor. | RN-77. Excepción: los cambios que no afectan la decisión de compra —nombre o imagen del producto— se actualizan sin aviso. |
| **DN-14** | **No se genera el mensaje mientras exista una discrepancia sin confirmar.** | Combinado con `DN-10`, define el flujo de envío completo. | El sistema nunca debe enviar al vendedor un carrito que el cliente no vio en su estado final. La confirmación explícita es la que convierte una lista revalidada en una consulta. | RN-78. El flujo de envío incorpora un paso de confirmación cuando hay cambios. Complementada por `DN-16` para el caso de revalidación no completada. |
| **DN-15** | **Un producto puede asignarse a una categoría padre o a una hoja; consultar el padre devuelve también los descendientes.** | `AD-24` fijó dos niveles de jerarquía pero no definió si un producto debe ir siempre en la hoja, ni qué devuelve una consulta al padre. | Obligar a asignar siempre en la hoja forzaría categorías artificiales para productos que no encajan en ninguna subcategoría. Y un cliente que filtra por `Calzado` espera ver botines: excluirlos sería contraintuitivo. | RN-80. La consulta por categoría padre incluye a los descendientes. Registrada en `AD-29`. |
| **DN-16** | **Un fallo de red en la revalidación no bloquea la consulta.** | `RN-78` prohíbe generar el mensaje ante discrepancias sin confirmar, pero no distinguía "sin discrepancias" de "no se pudo verificar". | Bloquear convertiría una caída momentánea de red en una venta perdida. El propósito del sistema es reducir fricción antes de la conversación, no agregarla. El riesgo residual es el que `RN-28` ya cubre: el precio lo confirma el vendedor. | RN-81. Se muestra advertencia y se ofrece reintentar, cancelar o enviar igualmente. Registrada en `AD-30`. |

---

# 17. Buenas Prácticas

- **Ninguna regla sin identificador.** Toda restricción del negocio lleva un `RN-xx` y es citable desde cualquier documento.
- **Ninguna decisión sin justificación.** El registro `DN-xx` incluye el porqué; sin él, la decisión se rediscute a los tres meses.
- **El negocio no decide tecnología.** Volúmenes, índices y estrategias de consulta pertenecen a `02_ARQUITECTURA.md` y `04_BASE_DATOS.md`.
- **Ante la duda entre automatizar y dar control, dar control.** El administrador conoce su negocio; el sistema no.
- **Toda automatización debe ser justificable ante el dueño.** Si no puede explicarse en una frase, probablemente deba ser manual.
- **Lo que no se implementa, se documenta como punto de extensión.** No preparar es aceptable; no dejar constancia, no.

---

# 18. Convenciones

- El vocabulario obligatorio es el de **[00.2_GLOSARIO.md](00.2_GLOSARIO.md)**. Ver especialmente la tabla de términos prohibidos (§9.1).
- Prefijos de identificadores usados en este documento: `P-`, `RN-`, `RF-`, `RNF-`, `CU-C-`, `CU-A-`, `R-`, `D-`, **`DN-`**.
- Los importes se escriben `Gs. 300.000` (`00.2_GLOSARIO.md` §9.3).
- Los estados de disponibilidad se escriben tal como se muestran al cliente: `Poco stock`, no `POCO_STOCK`.
- El versionado sigue `00.2_GLOSARIO.md` §9.4.

> **Pendiente para `00.2_GLOSARIO.md`:** incorporar `DN-` a la tabla de prefijos de §4.9.

---

# 19. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | Catálogo desactualizado por falta de carga. | Alto | Panel simple; RF-39 señala productos incompletos. |
| R-02 | Precios desactualizados generan conflicto con el cliente. | Alto | RN-28 (leyenda en plantilla por defecto) + RN-70 (historial). |
| R-03 | Volumen de imágenes degrada el rendimiento. | Medio | RF-33 + RNF-03. |
| R-04 | Cambio en el formato de enlaces de WhatsApp. | Medio | Módulo aislado (`02_ARQUITECTURA.md` §13.11). |
| R-05 | Carga inicial del catálogo lenta o tediosa. | Medio | Ver pendiente DA-10. |
| R-06 | Estados de disponibilidad mal mantenidos generan expectativas equivocadas. | Medio | RN-38 (4 estados comerciales) + RN-41 (visible en todo el flujo). |
| R-07 | Una plantilla de WhatsApp mal editada rompe el mensaje. | Medio | RN-60 (validación) + RN-61 (restauración) + vista previa. |
| R-08 | Marcas "nuevo" y "destacado" quedan activas por olvido. | Bajo | Dashboard con antigüedad de la marca. Ver pendiente DA-14. |
| R-09 | Credenciales administrativas débiles. | Alto | Política de contraseñas en `03_SEGURIDAD.md`. |
| R-10 | Pérdida de imágenes del sistema de archivos. | Alto | RNF-16. |

---

# 20. Pendientes

## 20.1 Decisiones resueltas

| ID | Estado |
|---|---|
| DA-01 | ✅ Resuelta por **DN-01** |
| DA-02 | ✅ Resuelta por **DN-02** |
| DA-03 | ✅ Resuelta por **DN-03** |
| DA-04 | ✅ Resuelta por **DN-04** |
| DA-05 | ✅ Resuelta por **DN-05** |
| DA-06 | ✅ Resuelta por **AD-24** — jerarquía de categorías de **dos niveles** en la v1. Complementada por `DN-15` y `RN-80`. |

## 20.2 Decisiones abiertas

Ninguna bloquea la aprobación de este documento ni el inicio de `02_ARQUITECTURA.md`.

| ID | Decisión pendiente | Impacto | Se resuelve en |
|---|---|---|---|
| DA-07 | ¿Los productos `Próximamente` aparecen mezclados en el catálogo o en sección propia? | Medio | 06 |
| DA-08 | ¿Existirá más de un número de WhatsApp? | Medio | 07 |
| DA-09 | ¿El cliente podrá agregar una nota libre antes de enviar la consulta? | Medio | 06 |
| DA-10 | ¿Se requerirá carga masiva de productos para el lanzamiento? | Medio | 07 |
| DA-11 | ¿Los talles de calzado usan numeración local o internacional? | Medio | 04 |
| DA-12 | ¿El historial de precios será consultable en el panel o solo auditoría interna? | Bajo | 07 |
| DA-13 | ¿Se guardará registro anónimo de consultas para métricas? | Bajo | 02 |
| DA-14 | ¿La marca "Nuevo" tendrá vencimiento automático opcional? | Bajo | 07 |

## 20.3 Supuestos vigentes

Aceptados con la aprobación de este documento.

| ID | Supuesto |
|---|---|
| S-01 | La tienda opera en Paraguay, zona horaria `America/Asuncion`. |
| S-02 | Entre 1 y 3 usuarios administradores. |
| S-03 | Retiro en el local y coordinación de envío por WhatsApp. |
| S-04 | Sitio publicado en dominio propio con HTTPS. |
| S-05 | Un único número de WhatsApp. Relacionado con DA-08. |
| S-06 | Sexos del catálogo: Hombre, Mujer, Unisex, Niño, Niña. |
| S-07 | Tipos de talle iniciales: Calzado numérico, Indumentaria alfanumérica, Único. |
| S-08 | Interfaz en un único idioma: español. |

> **Aclaración:** `S-06` y `S-07` definen enumeraciones del sistema. Los sexos y los tipos de talle son **datos semilla no administrables**: el panel puede consultarlos, pero no crearlos, editarlos ni eliminarlos. Sus valores están fijos en la versión 1.

---

# 21. Historial de Cambios

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| 1.0.0 | 05/08/2026 | 🟡 EN REVISIÓN | Versión inicial. |
| 1.1.0 | 05/08/2026 | 🟡 EN REVISIÓN | Moneda guaraní. Se elimina el límite de volumen de catálogo. "Nuevo" y "Oferta" pasan a control manual. Estados de disponibilidad comerciales. Productos sin stock agregables al carrito. Múltiples categorías por producto. Entidades Variante, Deporte y Sexo. Plantilla de WhatsApp editable. Sección de decisiones abiertas. |
| **2.0.0** | 05/08/2026 | ✅ **APROBADO** | Reestructuración completa según la plantilla estándar de secciones del proyecto. Se incorpora el registro de decisiones `DN-01` a `DN-09`. Se resuelven `DA-01` a `DA-05`. Nueva RN-38b (promociones simples). RN-17 pasa de provisoria a firme. RN-18 incorpora el modelado de Variante como entidad propia. **La numeración de `RN-`, `RF-`, `RNF-`, `CU-` y `R-` se mantiene sin cambios respecto de 1.1.0.** |

| **2.1.0** | 05/08/2026 | ✅ APROBADO | Tres vacíos detectados al descender al nivel arquitectónico y aprobados por el responsable del proyecto. **`RN-56` ampliada:** la revalidación ocurre al abrir el carrito **y** antes de generar el mensaje (`DN-10`). **`RN-75` nueva:** máximo de 30 productos distintos (`DN-11`). **`RN-76` nueva:** el mensaje no puede superar la longitud que WhatsApp acepta de forma fiable; el límite de ítems se define para garantizarlo (`DN-12`). Ninguna contradice lo aprobado en 2.0.0: las tres completan huecos. Numeración de identificadores previos sin cambios. |

| **2.2.0** | 05/08/2026 | ✅ APROBADO | **`RN-77` nueva:** el carrito nunca se modifica sin que el cliente lo vea (`DN-13`). **`RN-78` nueva:** no se genera el mensaje mientras exista una discrepancia sin confirmar (`DN-14`). Ambas derivan de la matriz de resolución de discrepancias aprobada en `AD-25`. |

| **2.4.0** | 06/08/2026 | ✅ APROBADO | **Resolución de `ADP-07` — evidencia de medición.** `RN-75` baja de **30 a 26** productos distintos. `RN-76` reformulada: el límite se mide en **caracteres del cuerpo del mensaje**, no en la longitud del enlace, y su garantía es la **validación de longitud real antes de generar el enlace**, no el límite de ítems. **`DN-17` nueva**, con la decisión y su evidencia. `DN-11` y `DN-12` marcadas como **actualizadas por `DN-17`**, sin modificar su contexto (`ADR-02`); se registra que `DN-12` partía de dos supuestos que la medición refutó. Motivo: con 30 ítems un carrito típico alcanza 4 432 caracteres frente a un techo de 4 096. Evidencia reproducible en [`docs/evidencia/ADP-07/`](evidencia/ADP-07/INFORME_ADP-07.md). Aprobado por el responsable del proyecto. **Numeración previa intacta.** |

| **2.9.0** | 22/09/2026 | 🟡 EN REVISIÓN | **Promoción "todos los productos".** Pedido explícito del usuario: poder aplicar una promoción a todo el catálogo, no solo a un producto, categoría o marca. **`RN-36` revisada**: pasa de "un producto, una categoría o una marca" a "un producto, una categoría, una marca, o todos los productos" — sin ninguno de los tres, la promoción rige sobre el catálogo entero. **Numeración previa intacta.** |
| **2.8.0** | 22/09/2026 | 🟡 EN REVISIÓN | **Talle como texto libre.** Pedido explícito del usuario: el talle debe aceptar cualquier valor alfanumérico razonable (numérico, decimal, alfabético, con "/" o "-", "Único"), sin la restricción de formato que hasta ahora exigía dígitos puros en Calzado y prohibía dígitos puros en Indumentaria. **`RN-15b` nueva** (antes documentada solo en `07_PANEL_ADMIN.md`): el nombre del talle es texto libre. **Numeración previa intacta.** |
| **2.7.0** | 10/09/2026 | 🟡 EN REVISIÓN | **Sexos por categoría.** Pedido explícito del usuario: ordenar la navegación de la tienda desde el panel, en lugar de que cada categoría nueva aparezca automáticamente bajo Hombres, Mujeres e Infantil a la vez. **`RN-83` nueva**: la categoría declara a qué sexos aplica, y no indicar ninguno significa «sin restricción». Es un eje de presentación que el administrador controla, no una propiedad derivada de los productos que la categoría contenga. **Numeración previa intacta.** |
| **2.6.0** | 18/08/2026 | 🟡 EN REVISIÓN | **Registro de ventas y sincronización de stock.** `RN-38`/`RN-39` se corrigen para reflejar lo que v1.4.0 ya tiene implementado y aprobado en `07_PANEL_ADMIN.md`/`04_BASE_DATOS.md`: v1 sí maneja stock numérico por variante (`variants.quantity`), y la disponibilidad se deriva automáticamente de esa cantidad — este documento nunca se había actualizado para reflejarlo. **`RN-82` nueva**: el administrador registra una venta sobre una variante y el sistema descuenta la cantidad automáticamente, con un registro inmutable (`sales`), igual que `price_history`. Pedido explícito del usuario. |
| **2.5.0** | 07/08/2026 | ✅ APROBADO | **Aclaración de enumeraciones del sistema.** `CU-A-18` y `CU-A-20` ajustados: sexos y tipos de talle se consultan, no se administran. `RF-29` reformulada para excluir el ABM de sexos y tipos de talle. Se añade nota en `S-06`/`S-07`: son **datos semilla no administrables**. No se modifican identificadores previos. |

| **2.3.0** | 05/08/2026 | ✅ APROBADO | **Correcciones C-03, C-04 y C-07, más las decisiones G-01 y G-02.** `RN-79` nueva: toda entidad usada como filtro público tiene slug único, permanente y no reutilizable — cierra el vacío que `AD-23` dejaba al depender de una regla inexistente. `RN-80` nueva: un producto puede asignarse a categoría padre o hoja, y consultar el padre devuelve los descendientes (`DN-15`). `RN-81` nueva: un fallo de red en la revalidación no bloquea la consulta (`DN-16`). `RN-78` precisada: aplica a discrepancias **detectadas**. `DA-06` retirada de decisiones abiertas y registrada como resuelta por `AD-24`. `DN-08` marcada como **actualizada por `DN-10`**, sin modificar su contexto (`ADR-02`). Nueva §15.1 de trazabilidad de reglas posteriores a la aprobación. **Numeración previa intacta.** |
| **2.7.0** | 19/08/2026 | 🟡 EN REVISIÓN | **Eliminación completa de "color" como clasificación del catálogo.** Pedido explícito del administrador. `RN-13` reformulada: la variante pasa a ser Producto + Talle (antes Producto + Color + Talle). `RN-14` reformulada a solo talle (perdía su mención a 0..N colores). `RN-16` reformulada a solo talle. `RN-79`, `RN-46`, `RN-68`, `RF-03`, `RF-16`, `RF-29`, `CU-C-04`, `CU-C-06`, `CU-C-07` pierden su mención a color. `CU-A-19` (gestionar colores) retirado. Glosario: se retira la entidad "Color". §12.2/12.3/12.4 de la plantilla de WhatsApp pierden la variable `{{color}}`. Cambio de esquema irreversible en la base de datos (migraciones `add2a263a249` y `d20b530ad8a6`). **Numeración previa intacta**, salvo las reformulaciones señaladas. |

---

**Estado:** ✅ APROBADO — base vinculante para `02_ARQUITECTURA.md`.
