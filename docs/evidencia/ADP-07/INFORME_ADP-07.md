# Anexo de evidencia — ADP-07

**Presupuesto de longitud del mensaje de WhatsApp**

| Campo | Valor |
|---|---|
| Pendiente | `ADP-07` — ✅ **CERRADO** el 06/08/2026 |
| Estado | ✅ APROBADO — evidencia completa y decisión aplicada |
| Fecha de medición | 06/08/2026 |
| Versión | 1.1.0 |
| Naturaleza | **Anexo de evidencia**, no documento de la serie `NN_*.md` |
| Documentos actualizados | `01` v2.4.0 · `02` v0.9.1 · `02.1` v1.9.0 · `00` |
| Caso base para | `11_TESTING.md` |

> **Decisión del responsable del proyecto, 06/08/2026:** `RN-75` pasa a **26 productos** (opción B de §12.1). Se aprueban las tres actualizaciones documentales: cierre de `ADP-07`, reevaluación de `AR-07` y corrección de §13.10 y `RN-76`. Aplicadas.

---

# 1. Objetivo

`ADP-07` quedó abierto porque ningún documento establecía dos datos:

| Dato | Por qué hacía falta |
|---|---|
| Límite práctico de longitud que WhatsApp acepta de forma fiable | Es el techo contra el que se compara |
| Coste en caracteres de un ítem con la plantilla por defecto | Convierte el techo en un número de ítems |

Este anexo obtiene ambos con evidencia reproducible, sin asumir límites ni documentar valores sin medición o fuente.

---

# 2. Alcance — qué se midió y qué no

| Se midió | Método |
|---|---|
| Longitud real del mensaje renderizado, en caracteres y en bytes UTF-8 | Medición local determinista |
| Longitud del mensaje codificado con `encodeURIComponent` | Medición local determinista |
| Longitud total del enlace `wa.me` | Medición local determinista |
| Techo del transporte del enlace `wa.me` | Sonda HTTP contra el servidor real |
| Techo del cuerpo de un mensaje de texto de WhatsApp | Documentación oficial de Meta |

| **No** se midió | Por qué |
|---|---|
| Si WhatsApp coloca íntegro el texto en el cuadro de redacción | Requiere WhatsApp instalado y sesión iniciada. No reproducible en el entorno de medición |
| Comportamiento en WhatsApp Web frente a la aplicación móvil | Ídem |
| Punto exacto de truncamiento observable por el usuario | Ídem — es precisamente lo que la arquitectura decide **no** arriesgar |

Esta separación es deliberada. `AR-07` describe un truncamiento **silencioso**: la evidencia debe acotar el techo por arriba, no descubrir empíricamente dónde el mensaje se rompe.

---

# 3. Método y reproducibilidad

Dos artefactos, ambos sin dependencias externas:

| Artefacto | Qué hace |
|---|---|
| [`medir_longitud_mensaje.py`](medir_longitud_mensaje.py) | Compone el mensaje con las plantillas por defecto y mide las tres longitudes para N = 1..40 en tres escenarios |
| [`probar_limite_wa_me.py`](probar_limite_wa_me.py) | Sonda el techo de transporte del servidor `wa.me` |

```bash
python medir_longitud_mensaje.py
```

```bash
python probar_limite_wa_me.py
```

Salidas registradas: [`resultado_medicion.txt`](resultado_medicion.txt) · [`resultado_transporte.txt`](resultado_transporte.txt).

## 3.1 Verificación del codificador

La medición carece de valor si el codificador no reproduce `encodeURIComponent` de JavaScript, que es lo que ejecutará el frontend. El script incorpora un autotest de 13 casos —espacio, salto de línea, `|`, `:`, los seis caracteres no codificados `! ~ * ' ( )`, vocal acentuada, ordinal `º` y emoji de 4 bytes— que debe pasar antes de emitir cualquier número.

```
Autotest encodeURIComponent: 13/13 OK
```

## 3.2 Entradas

| Entrada | Valor |
|---|---|
| Plantillas | Copia literal de `01_ANALISIS_NEGOCIO.md` §12.3 |
| Regla de omisión | §13.9 de `02_ARQUITECTURA.md`: etiqueta y valor se omiten juntos |
| Número de destino | 12 dígitos, formato internacional paraguayo |
| Prefijo `https://wa.me/<12 dígitos>?text=` | 32 caracteres |
| Código de consulta | `PS-48213`, formato `RN-64` |

## 3.3 Escenarios

| Escenario | Definición |
|---|---|
| `corto` | Producto sin variante — §13.9 omite `Talle` y `Color`. Nombre y marca breves |
| `tipico` | Variante completa, nombre y marca de longitud habitual del catálogo |
| `extenso` | Peor caso razonable: nombre largo, marca compuesta, color descriptivo, cantidad de dos dígitos, estado largo |

El ítem se repite N veces a propósito: el objetivo es un **coste por ítem estable y auditable**, no simular un carrito real.

---

# 4. Evidencia 1 — longitud real del mensaje

## 4.1 Coste fijo de la envoltura

| Medida | Valor |
|---|---|
| Caracteres | **174** |
| Bytes UTF-8 | 178 |
| Codificado | 242 |

## 4.2 Coste marginal por ítem

Medido como diferencia entre N = 10 y N = 11, con el separador entre ítems incluido.

| Escenario | Caracteres | Bytes UTF-8 | Codificado | Expansión |
|---|---|---|---|---|
| `corto` | **110** | 110 | 172 | 1,56× |
| `tipico` | **142** | 143 | 231 | 1,63× |
| `extenso` | **239** | 242 | 360 | 1,51× |

**La codificación multiplica la longitud por ~1,5–1,6.** No es un detalle: la plantilla usa `|`, `:`, `=`, saltos de línea y sangrías de tres espacios, y cada uno cuesta tres caracteres codificados.

## 4.3 Longitudes en los puntos de interés

| N | `corto` | `tipico` | `extenso` |
|---|---|---|---|
| 10 | 1 271 | 1 591 | 2 563 |
| 20 | 2 371 | 3 012 | 4 953 |
| **30** | **3 472** | **4 432** | **7 343** |
| 40 | 4 572 | 5 852 | 9 733 |

Caracteres del mensaje. Tabla completa en `resultado_medicion.txt`.

---

# 5. Evidencia 2 — longitud de la URL codificada

| N | `corto` | `tipico` | `extenso` |
|---|---|---|---|
| 10 | 1 987 | 2 577 | 3 869 |
| 20 | 3 707 | 4 888 | 7 469 |
| **30** | **5 428** | **7 198** | **11 069** |
| 40 | 7 148 | 9 508 | 14 669 |

Se incluye en `resultado_medicion.txt` una URL completa de muestra (N = 3, `tipico`), verificable carácter a carácter a mano.

---

# 6. Evidencia 3 — techo del transporte (medido)

Sonda `GET` contra el servidor real de `wa.me` con URLs de longitud creciente. Solo peticiones de lectura a un endpoint público de redirección: no envía mensajes, no requiere sesión, no crea estado.

| Longitud de URL | HTTP |
|---|---|
| 500 · 1 000 · 2 000 · 4 000 | `302` |
| 8 000 · 8 192 · 12 000 · 16 000 · 20 000 | `302` |
| 32 768 · **40 000** | **`302`** |
| 65 536 y superiores | fallo de transporte, **no** `414` |

## 6.1 Lectura

**El transporte no es el factor limitante.** `wa.me` aceptó y redirigió URLs de 40 000 caracteres, un orden de magnitud por encima de cualquier mensaje plausible del sistema.

Los fallos desde 65 536 **no son un rechazo del servidor**: no hubo `414 URI Too Long`, sino errores de la capa TLS del cliente. No se documentan como techo porque no está establecido si el límite es de `wa.me`, del intermediario TLS o de la biblioteca local. **No hace falta resolverlo**: 40 000 ya excede holgadamente el techo vinculante de §7.

## 6.2 Dos falsos negativos descartados durante la medición

Se registran porque cualquiera de los dos habría producido un número inventado:

| Falso negativo | Causa real | Corrección |
|---|---|---|
| Fallo a partir de ~33 000 con `curl` invocado desde el shell | Límite de argumentos del proceso local, no del servidor | URL pasada por fichero de configuración (`curl -K`) |
| Fallo en **todas** las longitudes con `http.client` de Python | El tráfico TLS del equipo pasa por un intermediario que reemplaza el certificado; la validación propia de Python lo rechaza | `curl`, que usa el almacén de certificados del sistema |

---

# 7. Evidencia 4 — techo del cuerpo del mensaje (fuente oficial)

La documentación oficial de Meta para mensajes de texto de WhatsApp establece para el cuerpo del mensaje:

> "Maximum 4096 characters."

Fuente: [Text messages — WhatsApp Cloud API, Meta for Developers](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages).

## 7.1 Alcance de la cita — declarado explícitamente

La cifra procede de la referencia de la **Cloud API**, no de la documentación de *click to chat*. Meta **no publica** un límite para el parámetro `?text=` de `wa.me`: se verificó la página de referencia de mensajes y la del FAQ de click to chat, y ninguna lo declara.

Se adopta 4096 igualmente, por tres razones:

1. Es el único límite **oficial** que WhatsApp publica sobre el cuerpo de un mensaje de texto, y el texto pre-cargado termina siendo exactamente eso.
2. Es **conservador** respecto del techo medido en §6: 4096 caracteres de mensaje producen como mucho ~6 600 caracteres de URL en el peor escenario, muy por debajo de los 40 000 aceptados.
3. Adoptarlo **no depende** de que sea el límite exacto: `RN-76` la garantiza la validación de longitud real, no el número.

**Esta es la limitación principal de la evidencia** y queda registrada como tal en §11.

---

# 8. Cuál techo es vinculante

| Techo | Valor | Origen | ¿Vinculante? |
|---|---|---|---|
| Transporte de la URL | ≥ 40 000 caracteres | Medido (§6) | ❌ No |
| Cuerpo del mensaje | **4 096 caracteres** | Oficial (§7) | ✅ **Sí** |

**Consecuencia relevante para la arquitectura:** el presupuesto se mide sobre **los caracteres del mensaje, no sobre la URL codificada**. §13.10 planteaba el control de longitud como un problema de longitud de URL; la evidencia muestra que la URL sobra y lo que escasea es el cuerpo del mensaje.

La expansión ~1,5× de la codificación es entonces **irrelevante para el presupuesto**. Sigue siendo correcto medirla, pero no restringe.

---

# 9. Margen de seguridad

El margen no se elige: se deriva de dos incertidumbres medibles.

## 9.1 Caracteres frente a bytes

Meta dice "characters". Si alguna implementación contase bytes UTF-8, el mensaje —con emoji, tildes y el ordinal `º`— ocuparía más de lo previsto. Relación medida a N = 30:

| Escenario | Caracteres | Bytes | Ratio |
|---|---|---|---|
| `corto` | 3 472 | 3 476 | 1,0012 |
| `tipico` | 4 432 | 4 466 | 1,0077 |
| `extenso` | 7 343 | 7 437 | **1,0128** |

Peor ratio medido: **1,0128**. Techo equivalente en caracteres si 4096 fuesen bytes:

```
4096 / 1,0128 = 4044 caracteres
```

## 9.2 Plantilla editable

`RN-59` permite al administrador editar ambas plantillas. Una envoltura más larga o una plantilla de ítem con más etiquetas desplaza el presupuesto. El margen debe absorber una variación moderada sin recalcular el límite de ítems.

## 9.3 Techo de trabajo propuesto

```
4 096  techo oficial
4 044  corregido por la peor relación bytes/caracteres medida
4 000  techo de trabajo  (redondeo a la baja; margen residual 96 caracteres = 2,3 %)
```

**Techo de trabajo: 4 000 caracteres de mensaje.**

---

# 10. Cantidad máxima segura de productos

Máximo N cuyo mensaje no supera el techo:

| Techo | `corto` | `tipico` | `extenso` |
|---|---|---|---|
| 4 096 (oficial) | 35 | 27 | **16** |
| **4 000 (de trabajo)** | 34 | **26** | **16** |
| 3 500 | 30 | 23 | 13 |

## 10.1 Hallazgo principal

> **El límite de 30 productos de `RN-75` no es seguro con la plantilla por defecto.**

| Escenario | N = 30 | Techo 4 096 | Exceso |
|---|---|---|---|
| `corto` | 3 472 | ✅ cabe | — |
| `tipico` | 4 432 | ❌ **no cabe** | **+336 caracteres** |
| `extenso` | 7 343 | ❌ **no cabe** | **+3 247 caracteres** |

Un carrito de 30 productos **típicos** —variante completa, nombres de longitud corriente— excede el techo oficial. No es un caso extremo: es el caso normal del catálogo.

Esto confirma el hallazgo `B-02` con números: 30 era un criterio comercial y, medido, **contradice `RN-76`**.

## 10.2 Cantidad segura

**16 productos** es la única cifra que se sostiene sin depender de la composición del carrito: es el máximo del peor escenario tanto contra el techo oficial como contra el de trabajo.

**26 productos** es el máximo del caso típico contra el techo de trabajo, pero no protege un carrito con nombres largos.

## 10.3 Esto no sustituye a la segunda defensa

§13.10 estableció que `RN-76` la garantiza **la validación de longitud real antes de generar el enlace**, no el límite de ítems. La evidencia lo refuerza:

- el coste por ítem varía **más del doble** entre `corto` (110) y `extenso` (239);
- ningún límite fijo de ítems puede cubrir esa dispersión;
- `RN-59` permite además cambiar la plantilla.

**El límite de ítems reduce la frecuencia con que la validación tiene que intervenir. No la reemplaza.**

---

# 11. Limitaciones de la evidencia

| Limitación | Efecto |
|---|---|
| El techo de 4096 procede de la Cloud API, no de la documentación de click to chat, que no publica límite | El techo vinculante es el dato **menos firme** de este anexo. Es una cifra oficial aplicada por analogía |
| No se verificó en WhatsApp real que el texto llegue íntegro al cuadro de redacción | No se conoce el comportamiento observable al superar el techo. `11_TESTING.md` debería cubrirlo con dispositivo real |
| El techo de transporte se midió a través de un intermediario TLS | No afecta a la conclusión: el margen entre 40 000 y ~6 600 es de más de 6× |
| Los escenarios repiten un ítem representativo | Deliberado. Un carrito real mezcla ítems y quedará **entre** `corto` y `extenso` |

Ninguna limitación afecta a los datos medidos de §4 y §5, que son deterministas y verificables a mano.

---

# 12. Actualizaciones aplicadas

> **Aprobadas por el responsable del proyecto el 06/08/2026.** Ninguna se aplicó antes de la decisión.

## 12.1 `RN-75` — decisión de negocio

La evidencia demostró que 30 no era seguro, pero **no elegía el reemplazo**: el número de productos que el carrito admite es una decisión comercial.

| Opción | Valor | A favor | En contra | |
|---|---|---|---|---|
| A | 16 | Seguro en todos los escenarios medidos, sin depender de la composición | Recorta a la mitad el límite comercial aprobado | |
| **B** | **26** | Seguro en el caso típico con el techo de trabajo | Un carrito con nombres largos excede el techo y depende de la validación | ✅ **Elegida** |
| C | 30 sin cambio | No reabre una decisión comercial aprobada | El caso típico excede el techo y queda enteramente a cargo de la validación | |

Aplicado en `01_ANALISIS_NEGOCIO.md` v2.4.0: `RN-75` pasa a 26, `RN-76` se reformula sobre el techo en **caracteres de mensaje**, y **`DN-17`** registra la decisión. `DN-11` y `DN-12` quedan marcadas como *actualizadas por `DN-17`* **sin modificar su contexto**, conforme a `ADR-02`.

**Riesgo residual aceptado con la opción B:** un carrito de 26 productos con nombres largos supera el techo. Queda a cargo de la validación de longitud real, que es la defensa que no depende de la composición.

## 12.2 `ADP-07` — cerrado

Cerrado en `02.1_DECISIONES_ARQUITECTONICAS.md` v1.9.0 §14. Los dos datos que faltaban están establecidos —techo vinculante de 4 096 caracteres de cuerpo de mensaje y coste por ítem de 110 / 142 / 239 caracteres—, con el alcance de §7.1 y las limitaciones de §11 declarados en el propio cierre.

Deja de ser bloqueante para la implementación (`02` §26.3). Restan **dos** bloqueantes: `ADP-08` y `ADP-09`.

## 12.3 `AR-07` — reevaluado

Actualizado en `02_ARQUITECTURA.md` §25.3. Mantiene impacto **Alto** —el modo de fallo sigue siendo silencioso— pero cambia de naturaleza: deja de ser un riesgo **desconocido** y pasa a **cuantificado y demostrado**. La mitigación queda en dos partes: `DN-17` reduce la frecuencia, la validación de longitud real la garantiza.

## 12.4 `02_ARQUITECTURA.md` §13.10 — corregida

§13.10 razonaba el control de longitud como problema de **longitud de URL**. Corregido: el factor limitante es el **cuerpo del mensaje**. Es una precisión sobre la magnitud a medir, no una decisión arquitectónica nueva —la defensa y su ubicación no cambian—, por lo que **el Freeze se respeta**: la sección se desarrolla, no se altera. `02` pasa a v0.9.1.

## 12.5 Efecto colateral en `AD-32`

`AD-32` —la revalidación del carrito usa `POST`— justifica su contexto por analogía con *"el mismo problema de longitud de URL"* del enlace de WhatsApp. La medición refutó esa analogía.

**`AD-32` se mantiene aceptada y sin cambios.** Sus otros fundamentos —cuerpo estructurado, ausencia de caché deseable, simetría con la revalidación y fragilidad de una lista de identificadores en la URL— no dependen de la analogía refutada. Registrado como **nota de revisión** en `02.1` §`AD-32` y en `02` §11.9, sin reescribir el contexto original (`ADR-02`).

---

# 13. Caso base para `11_TESTING.md`

| Caso | Entrada | Resultado esperado |
|---|---|---|
| `T-ADP07-01` | Autotest de `encodeURIComponent`, 13 casos | 13/13 correctos |
| `T-ADP07-02` | Envoltura sin ítems | 174 caracteres |
| `T-ADP07-03` | Coste marginal por ítem, escenario `tipico` | 142 caracteres |
| `T-ADP07-04` | Coste marginal por ítem, escenario `extenso` | 239 caracteres |
| `T-ADP07-05` | Mensaje con 26 ítems típicos — límite de `RN-75` | ≤ 4 000 caracteres |
| `T-ADP07-06` | Mensaje que supera el techo | La validación **bloquea** y avisa; no se genera el enlace |
| `T-ADP07-07` | Plantilla editada que acerca el mensaje al techo | Advertencia antes de abrir WhatsApp (`RN-76`) |
| `T-ADP07-08` | Verificación en dispositivo real con WhatsApp instalado | El texto llega íntegro al cuadro de redacción |

`T-ADP07-08` cubre la limitación principal de §11 y **no puede ejecutarse en el entorno de medición**.

---

# 14. Pendientes que este anexo deja abiertos

| ID | Pendiente | Dónde se resuelve |
|---|---|---|
| `T-ADP07-08` | Verificación en dispositivo real con WhatsApp instalado | `11_TESTING.md` |
| — | Confirmación de si el límite se cuenta en caracteres o en bytes | `11_TESTING.md`; mientras tanto lo absorbe el margen de §9.1 |
| — | Comportamiento del caso `extenso` con 26 ítems, riesgo residual aceptado en §12.1 | Cubierto por la validación de longitud real; sin acción documental |

La elección entre las opciones A, B y C de §12.1 quedó resuelta: **opción B**.

---

# 15. Historial de cambios

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| **1.1.0** | 06/08/2026 | ✅ **APROBADO** | **Decisión del responsable del proyecto aplicada.** `RN-75` = **26** (opción B de §12.1). Aprobadas y aplicadas las tres actualizaciones: cierre de `ADP-07` en `02.1` v1.9.0, reevaluación de `AR-07` y corrección de §13.10 en `02` v0.9.1, y `RN-75`/`RN-76`/`DN-17` en `01` v2.4.0. Se registra el **efecto colateral en `AD-32`** (§12.5): la analogía de longitud de URL de su contexto quedó refutada, pero la decisión se mantiene sin cambios. Riesgo residual de la opción B declarado. |
| 1.0.0 | 06/08/2026 | 🟡 EN REVISIÓN | Versión inicial. Medición reproducible de longitud de mensaje, longitud codificada y enlace `wa.me` en tres escenarios; sonda del techo de transporte contra el servidor real; techo del cuerpo de mensaje obtenido de documentación oficial. Hallazgo principal: el límite de 30 de `RN-75` excede el techo en el escenario típico. Propuesta de actualización de `RN-75`, `ADP-07` y `AR-07` sin aplicar, a la espera de decisión del responsable. |
