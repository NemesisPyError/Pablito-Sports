# 00_VISION_PROYECTO.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Visión del Proyecto |
| **Código** | 00 |
| **Versión** | 1.2.1 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 05/08/2026 |
| **Documento previo** | — (documento inicial del proyecto) |
| **Documentos dependientes** | Todos |

Este documento es la **referencia conceptual principal** del proyecto. Ninguna decisión técnica posterior puede contradecir lo aquí definido.

---

# 2. Objetivo

## 2.1 Objetivo general

Desarrollar Pablito Sports como una plataforma de catálogo comercial moderna, escalable y administrable que permita exhibir productos deportivos y simplifique el proceso de consulta mediante WhatsApp.

## 2.2 Objetivos específicos

- Mostrar el catálogo completo de productos.
- Permitir búsquedas rápidas.
- Permitir filtros avanzados.
- Mostrar fotografías de alta calidad.
- Mostrar precios actualizados.
- Permitir administrar todo el contenido desde un panel administrativo.
- Facilitar la generación automática de consultas por WhatsApp.
- Mantener una arquitectura preparada para futuras expansiones.

---

# 3. Alcance

## 3.1 Catálogo público

- Página principal.
- Catálogo de productos.
- Detalle de producto.
- Buscador.
- Filtros.
- Productos destacados.
- Productos nuevos.
- Productos en oferta.
- Marcas.
- Categorías.

## 3.2 Carrito

- Agregar productos.
- Eliminar productos.
- Modificar cantidades.
- Persistencia mediante LocalStorage.
- Generación automática del mensaje para WhatsApp.

## 3.3 Panel administrativo

- Login.
- Dashboard.
- Gestión de productos.
- Gestión de marcas.
- Gestión de categorías.
- Gestión de colores.
- Gestión de talles.
- Gestión de promociones.
- Gestión de banners.
- Gestión de imágenes.
- Gestión de usuarios administradores.

## 3.4 Restricciones de la versión 1

La versión 1 **NO** incluirá:

- Pasarela de pagos.
- Registro de clientes.
- Compras online.
- Facturación electrónica.
- Gestión de múltiples sucursales.
- Aplicación móvil.
- ERP.
- Inventario entre sucursales.

---

# 4. Definiciones

El vocabulario del proyecto se define en **[00.2_GLOSARIO.md](00.2_GLOSARIO.md)**, de aplicación obligatoria.

La equivalencia entre el lenguaje del negocio y el del código se define en **[00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md)**.

---

# 5. Responsabilidades

## 5.1 Cliente

El cliente podrá:

- Navegar por el catálogo.
- Buscar productos.
- Filtrar resultados.
- Visualizar precios.
- Ver disponibilidad.
- Ver fotografías.
- Agregar productos al carrito.
- Enviar el carrito completo mediante WhatsApp.

## 5.2 Administrador

El administrador podrá:

- Crear productos.
- Editar productos.
- Eliminar productos.
- Activar o desactivar productos.
- Administrar categorías.
- Administrar marcas.
- Administrar promociones.
- Administrar banners.
- Cambiar precios.
- Gestionar imágenes.
- Gestionar usuarios.

---

# 6. Visión del Proyecto

Pablito Sports es una plataforma web de catálogo comercial diseñada para permitir a los clientes explorar el catálogo completo de la tienda, consultar precios, filtrar productos, agregarlos a un carrito de consulta y enviar una solicitud de compra mediante WhatsApp.

El sistema incluye un panel administrativo para la gestión integral del catálogo, precios, imágenes, marcas, categorías y promociones.

El sistema no será una tienda online con pagos electrónicos en su primera versión.

El objetivo es facilitar la comunicación entre el cliente y la tienda, ofreciendo una experiencia rápida, intuitiva y profesional.

---

# 7. Tipo de Negocio

Pablito Sports es una tienda deportiva que comercializa:

- Ropa deportiva.
- Calzados.
- Pelotas.
- Guantes.
- Accesorios.
- Equipamiento deportivo.

La tienda posee una única sucursal.

---

# 8. Arquitectura General

El sistema estará compuesto por:

```
Frontend
   ↓
API REST
   ↓
Backend
   ↓
Base de Datos
   ↓
Sistema de Archivos
```

La arquitectura completa se define en `02_ARQUITECTURA.md`.

---

# 9. Tecnologías Seleccionadas

| Capa | Tecnología |
|---|---|
| **Frontend** | React, Vite, Bootstrap 5.3, Axios |
| **Backend** | Flask |
| **ORM** | SQLAlchemy |
| **Migraciones** | Alembic |
| **Base de datos** | PostgreSQL |
| **Servidor** | Gunicorn, Nginx |

---

# 10. Escalabilidad

La arquitectura deberá permitir incorporar en futuras versiones:

- Compras online.
- Pasarela de pagos.
- Clientes registrados.
- Favoritos.
- Historial de pedidos.
- Inventario.
- Múltiples sucursales.
- Multiidioma.
- Multimoneda.
- API pública.
- Aplicación móvil.

Sin modificar la arquitectura principal.

---

# 11. Metodología de Trabajo

El proyecto se desarrolla siguiendo la metodología **"Documentation First"**:

```
Primero se documenta
   ↓
Luego se aprueba
   ↓
Finalmente se implementa
```

Ninguna funcionalidad será desarrollada sin existir previamente una especificación técnica aprobada.

Cada documento deberá ser aprobado antes de iniciar el siguiente.

## 11.1 Secuencia de documentos

```
00_VISION_PROYECTO.md
   ↓
00.2_GLOSARIO.md
   ↓
00.3_NOMENCLATURA.md
   ↓
01_ANALISIS_NEGOCIO.md
   ↓
02_ARQUITECTURA.md
   ↓
02.1_DECISIONES_ARQUITECTONICAS.md  (documento vivo)
   ↓
03_SEGURIDAD.md
   ↓
04_BASE_DATOS.md
   ↓
05_API.md
   ↓
06_FRONTEND.md
   ↓
07_PANEL_ADMIN.md
   ↓
08_UI_SYSTEM.md
   ↓
09_COMPONENTES.md
   ↓
10_IMPLEMENTACION.md
   ↓
11_TESTING.md
   ↓
12_DEPLOY.md
   ↓
99_AI_DEVELOPMENT_GUIDE.md
```

## 11.2 Congelación de la arquitectura

A partir de la **Architecture Freeze Review** —aprobada el 05/08/2026— la metodología cambia de fase:

```
Visión → Negocio → Arquitectura        (fase de definición, cerrada)
                        ↓
              ARCHITECTURE FREEZE
                        ↓
Modelo de Datos → Contrato API → Seguridad → Frontend → Backend → Implementación
                        (fase de desarrollo)
```

**Regla de congelación:**

> Ningún documento posterior a la congelación puede introducir arquitectura nueva. Únicamente **desarrolla o implementa** decisiones ya aprobadas.

Un documento que necesite una decisión de arquitectura **no la toma**: la registra como pendiente y exige una nueva versión mayor de `02_ARQUITECTURA.md`, conforme a §5.3 de ese documento.

La verificación de esta regla se apoya en las tablas «Frontera con…» que cada sección de `02_ARQUITECTURA.md` declara, y su incumplimiento está registrado como riesgo `AR-12`.

### Orden de redacción posterior a la congelación

La numeración de §11.1 establece el **orden del índice**, no el orden de redacción. Tras la congelación, el orden de trabajo aprobado es:

```
1.  Resolver ADP-07            ✅ cerrado 06/08/2026 — presupuesto medido
2.  04_BASE_DATOS.md           cierra ADP-08          ← trabajo actual
3.  05_API.md                  cierra ADP-09
4.  02_ARQUITECTURA.md v1.0.0  arquitectura congelada
5.  03_SEGURIDAD.md y los documentos restantes
6.  Implementación
```

**Por qué el modelo de datos y el contrato de la API van primero.** Son las piezas que más cuesta cambiar una vez que existe código, y son las que cierran los dos pendientes que quedan abiertos al congelar. `03_SEGURIDAD.md` desarrolla §16 de la arquitectura, que ya está definida: no bloquea a los anteriores y sí depende del modelo de datos para detallar sus controles.

## 11.3 Guías de implementación

Las convenciones de implementación —cómo escribir endpoints y migraciones, estructura de solicitudes de fusión, criterio de terminado y lista de verificación previa a fusionar— viven **exclusivamente en `99_AI_DEVELOPMENT_GUIDE.md`**.

No existe un documento separado de guías de implementación. Un segundo documento sobre la misma materia divergiría del primero, que es el problema que el proyecto ya resolvió centralizando la nomenclatura en `00.3_NOMENCLATURA.md` y el registro de decisiones en `02.1_DECISIONES_ARQUITECTONICAS.md`.

`99_AI_DEVELOPMENT_GUIDE.md` remite a `02_ARQUITECTURA.md` §24.3 para convenciones de commits y a `11_TESTING.md` para estrategia de pruebas, en lugar de reenunciarlas.

## 11.4 Estructura estándar de los documentos

Todo documento del proyecto sigue la misma estructura de secciones: **Información, Objetivo, Alcance, Definiciones, Responsabilidades, Diagramas, Decisiones, Buenas Prácticas, Convenciones, Riesgos, Pendientes e Historial de Cambios.** Las secciones propias de cada dominio se insertan entre Responsabilidades y Diagramas.

---

# 12. Diagramas

| # | Diagrama | Sección |
|---|---|---|
| D-01 | Capas del sistema | 8 |
| D-02 | Ciclo Documentation First | 11 |
| D-03 | Secuencia de documentos | 11.1 |

Los diagramas estructurales del sistema corresponden a `02_ARQUITECTURA.md`.

---

# 13. Decisiones

Registro de decisiones de visión. Prefijo `DV-`.

| ID | Decisión | Justificación |
|---|---|---|
| **DV-01** | **La v1 no incluye pagos electrónicos ni compras online.** | El objetivo es reducir la fricción previa a la conversación con el vendedor, no reemplazarla. La venta se concreta por WhatsApp. |
| **DV-02** | **WhatsApp es el canal de cierre.** | Es el canal que la tienda ya usa y en el que sus clientes ya están. |
| **DV-03** | **El cliente no se registra.** | El registro es fricción sin contrapartida cuando no hay compra online, historial ni favoritos. |
| **DV-04** | **Stack: React + Flask + PostgreSQL.** | Tecnologías maduras, ampliamente documentadas y adecuadas al tamaño del proyecto. El detalle y las alternativas evaluadas se registran en `02_ARQUITECTURA.md` §22. |
| **DV-05** | **Metodología Documentation First.** | Ninguna funcionalidad se implementa sin especificación aprobada. Evita reinterpretar decisiones fundamentales durante la implementación. |
| **DV-06** | **Una sola sucursal en v1.** | Es la realidad del negocio. Las sucursales múltiples quedan como punto de extensión (§11). |

---

# 14. Buenas Prácticas

## 14.1 Filosofía del proyecto

Este proyecto prioriza:

- Simplicidad.
- Escalabilidad.
- Seguridad.
- Mantenibilidad.
- Alto rendimiento.
- Código limpio.
- Arquitectura modular.

Toda nueva funcionalidad deberá respetar estos principios.

## 14.2 Objetivos de calidad

Todo el sistema deberá cumplir con:

- Código limpio.
- Alta cohesión.
- Bajo acoplamiento.
- Arquitectura modular.
- Seguridad por defecto.
- Alto rendimiento.
- Diseño responsive.
- Accesibilidad.
- Escalabilidad.

---

# 15. Convenciones

- Vocabulario obligatorio: [00.2_GLOSARIO.md](00.2_GLOSARIO.md).
- Nomenclatura técnica: [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md).
- Estructura de documentos: §11.4.
- Versionado de documentos: `00.2_GLOSARIO.md` §9.4.
- Prefijo de decisiones de este documento: `DV-`.

---

# 16. Riesgos

Los riesgos del negocio se registran en `01_ANALISIS_NEGOCIO.md` §19. Los riesgos técnicos, en `02_ARQUITECTURA.md` §25.

A nivel de visión:

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| RV-01 | El alcance del MVP crece durante la implementación. | Alto | §3.4 define explícitamente lo que la v1 no incluye. |
| RV-02 | Una decisión técnica contradice la visión sin que nadie lo advierta. | Alto | Este documento es vinculante para todos los posteriores; la trazabilidad se verifica en `01` §14. |

---

# 17. Pendientes

Ninguno. Este documento está aprobado y cerrado.

Las decisiones abiertas del proyecto se registran en `01_ANALISIS_NEGOCIO.md` §20 y en `02_ARQUITECTURA.md` §26.

---

# 18. Historial de Cambios

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| 1.0.0 | 05/08/2026 | ✅ APROBADO | Versión inicial. Identidad Pablito Sports, visión, objetivos, alcance del MVP, tipo de negocio, filosofía, arquitectura general, tecnologías, restricciones, escalabilidad, objetivos de calidad y metodología. |
| **1.1.0** | 05/08/2026 | ✅ APROBADO | **Reestructuración a la plantilla estándar de secciones del proyecto.** Se incorporan las secciones Definiciones, Diagramas, Decisiones (`DV-01` a `DV-06`), Convenciones, Riesgos y Pendientes. Se agregan `00.2_GLOSARIO.md` y `00.3_NOMENCLATURA.md` a la secuencia de documentos (§11.1) y se documenta la estructura estándar (§11.2). **La visión, los objetivos, el alcance y las restricciones no se modificaron:** el cambio es estructural. |
| **1.2.1** | 06/08/2026 | ✅ APROBADO | **`ADP-07` cerrado.** El orden de trabajo posterior a la congelación (§11.2) refleja el primer paso como resuelto: el presupuesto de longitud del mensaje quedó establecido con evidencia reproducible en [`docs/evidencia/ADP-07/`](evidencia/ADP-07/INFORME_ADP-07.md). El trabajo actual pasa a `04_BASE_DATOS.md`. Sin cambios en la visión, los objetivos, el alcance ni las restricciones. |
| **1.2.0** | 05/08/2026 | ✅ APROBADO | **Hito de proyecto: Architecture Freeze Candidate.** `02_ARQUITECTURA.md` alcanza la versión `0.9.0` con sus 27 secciones completas y 40 decisiones registradas. **Retirado `02.2_DECISIONES_PREVIAS_BLOQUE_C.md`:** documento de trabajo transitorio cuyo contenido fue **absorbido** por `01_ANALISIS_NEGOCIO.md`, `02_ARQUITECTURA.md` y `02.1_DECISIONES_ARQUITECTONICAS.md`. Se elimina para que nadie consulte una fuente obsoleta; ningún documento lo referenciaba. Se incorpora `02.1` a la secuencia (§12.1). |

---

**Estado:** ✅ APROBADO — base conceptual vinculante para todo el proyecto.
