# 03_SEGURIDAD.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Seguridad |
| **Código** | 03 |
| **Versión** | 1.2.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 28/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [03.0_SEGURIDAD_ANALISIS_PREVIO.md](03.0_SEGURIDAD_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `10_BACKEND.md`, `12_DEPLOY.md`, `99_AI_DEVELOPMENT_GUIDE.md` |

---

# 2. Objetivo

## 2.1 Propósito

Materializar las decisiones de seguridad ya aprobadas en `02_ARQUITECTURA.md` y `02.1_DECISIONES_ARQUITECTONICAS.md`, y definir las políticas, configuraciones y controles necesarios para proteger Pablito Sports.

Este documento no introduce nuevas reglas de negocio `RN-xx` ni decisiones arquitectónicas `AD-xx`.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Mecanismos de autenticación y autorización | `05_API.md`, `07_PANEL_ADMIN.md` |
| Configuración de sesiones, cookies y headers | — |
| Políticas contra CSRF, XSS, SQL Injection | — |
| Seguridad de uploads | `09_COMPONENTES.md` (componente `ImageUploader`) |
| Gestión de secretos | `12_DEPLOY.md` |
| Política de errores seguros | `05_API.md`, `10_BACKEND.md` |
| Auditoría y logs de seguridad | `04_BASE_DATOS.md`, `07_PANEL_ADMIN.md` |
| Pentesting y hardening avanzado | Fuera de alcance de v1 |

---

# 3. Alcance

## 3.1 Incluye

- Autenticación y autorización del panel.
- Gestión de sesiones y cookies.
- Protección contra CSRF, XSS y SQL Injection.
- Seguridad de archivos subidos.
- Headers HTTP y Content Security Policy.
- Auditoría y logs de seguridad.
- Rate limiting.
- Password hashing.
- Gestión de secretos.
- Política de dependencias de terceros.
- Política de errores seguros.
- Principio de mínimo privilegio.
- Amenazas fuera del alcance de v1.

## 3.2 No incluye

- Decisiones de arquitectura → `02_ARQUITECTURA.md`.
- Reglas de negocio → `01_ANALISIS_NEGOCIO.md`.
- Contratos de API → `05_API.md`.
- Especificación de implementación backend → `10_BACKEND.md`.
- Despliegue e infraestructura → `12_DEPLOY.md`.

## 3.3 Fuera de alcance de la v1

| Capacidad | Razón |
|---|---|
| WAF propio (appliance / módulo Nginx) | Infraestructura adicional no justificada. El WAF gestionado de Cloudflare cubre este rol en el *edge* (§23). |
| IDS/IPS | Sobredimensión para una sola instancia. |
| MFA / 2FA | Sin requisito de onboarding seguro en v1. |
| SSO / OAuth | Sin integración con proveedores de identidad. |
| Hardware Security Keys | Fuera de alcance comercial. |
| SIEM | Centralización de logs no requerida. |
| Antivirus de archivos | Validación por MIME/magic bytes es suficiente. |
| Escaneo automático de imágenes | Moderación de contenido no requerida. |
| Recuperación de contraseña por email | Gestión centralizada por superadministrador. |
| Pentesting profesional | No presupuestado; recomendado antes de escalar. |

---

# 4. Decisiones de seguridad

## SEG-01 — Expiración de sesiones

| Campo | Valor |
|---|---|
| **Identificador** | SEG-01 |
| **Título** | Las sesiones del panel tienen expiración por inactividad y expiración absoluta |
| **Contexto** | `RF-28` exige cierre por inactividad; `AD-37` define sesión de servidor con cookie. |
| **Decisión** | Expiración por inactividad: **30 minutos**. Expiración absoluta: **12 horas**. |
| **Consecuencias** | Balance entre seguridad y usabilidad administrativa. |

## SEG-02 — Sesiones simultáneas

| Campo | Valor |
|---|---|
| **Identificador** | SEG-02 |
| **Título** | Se permiten múltiples sesiones simultáneas del mismo administrador |
| **Contexto** | Restringir a una sola sesión dificulta soporte y administración. |
| **Decisión** | **Sí**, se permiten. Cada sesión tiene identificador propio. El superadministrador puede invalidar sesiones de otros usuarios. |
| **Consecuencias** | Requiere almacenar sesiones activas en servidor o base de datos. |

---

# 5. Autenticación

## 5.1 Mecanismo

- Sesión de servidor gestionada por Flask (`AD-37`).
- Cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- Transporte exclusivo por HTTPS (`RNF-12`).

## 5.2 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | Valida credenciales y crea sesión. |
| `POST` | `/api/v1/admin/auth/logout` | Invalida sesión actual. |
| `GET` | `/api/v1/admin/auth/me` | Devuelve perfil del administrador autenticado. |

## 5.3 Flujo de login

1. El cliente envía `username` y `password`.
2. El backend verifica el hash de contraseña.
3. Si es válido, se crea la sesión en servidor y se envía la cookie.
4. Si es inválido, se registra el intento fallido.

## 5.4 Flujo de logout

1. El cliente llama a `POST /api/v1/admin/auth/logout`.
2. El servidor invalida la sesión.
3. La cookie se destruye en el cliente.

## 5.5 Password hashing

| Aspecto | Valor |
|---|---|
| **Algoritmo** | bcrypt con costo ≥ 12, o Argon2id. |
| **Sal** | Generada automáticamente por el algoritmo. |
| **Política mínima** | 8 caracteres; se recomienda mayúscula, minúscula y número. |
| **Almacenamiento** | Solo el hash; nunca la contraseña en texto plano ni en logs. |

## 5.6 Recuperación de contraseña

- **Fuera de alcance en v1.**
- El superadministrador puede cambiar la contraseña de otro usuario (`05_API.md` §9.14).
- En versiones futuras se evaluará recuperación por email.

## 5.7 Gestión de credenciales y cuentas administrativas

No introduce reglas nuevas: consolida en un solo lugar cómo se administran las
cuentas del panel con los mecanismos ya definidos.

### 5.7.1 Principios

| Principio | Cómo se cumple |
|---|---|
| La contraseña **nunca** se muestra ni se devuelve | Ningún DTO expone `password_hash`; los mapeadores lo omiten explícitamente. |
| La contraseña **nunca** se almacena en claro ni se registra | Solo se persiste el hash bcrypt (§5.5); la auditoría registra *que* cambió, no *a qué*. |
| Un solo sistema de hash | `core/security/password.py` es el único punto que hashea o verifica. No hay un mecanismo paralelo. |
| Cambio de contraseña con confirmación | La propia exige `current_password` (§7.3, `05_API.md` §9.14); la UI pide la nueva dos veces antes de enviarla. |
| Mínimo privilegio de roles | El backend impone `super_administrator` en todo `/api/v1/admin/users` salvo `change-password` (`RN-67`, `PA-06`). |
| No dejar la instalación sin superadministrador | `RN-71`: no se puede eliminar, desactivar ni degradar de rol al último superadministrador activo. Se comprueba antes de escribir. |
| Un usuario no se elimina a sí mismo | `RN-72`. |

### 5.7.2 Operaciones disponibles (panel → `05_API.md` §9.14)

| Operación | Rol | Efecto de seguridad |
|---|---|---|
| Listar / ver administradores | `super_administrator` | Lectura. Sin `password_hash`. |
| Crear administrador | `super_administrator` | Alta activa; contraseña inicial sujeta a la política §5.5. |
| Editar usuario / correo / rol / estado | `super_administrator` | Reemplazo completo del perfil; sin contraseña. Desactivar cierra las sesiones del usuario (§7.3). |
| Eliminar (lógico) | `super_administrator` | `AD-18`; cierra las sesiones del usuario. Sujeto a `RN-71` / `RN-72`. |
| Cambiar la propia contraseña | `administrator` y `super_administrator` | Exige `current_password`; invalida **todas** las sesiones propias, incluida la de la petición (§7.3). |
| Cambiar la contraseña de otro | `super_administrator` | `current_password` se ignora; invalida las sesiones de ese usuario. |

### 5.7.3 Límites actuales (documentados, no defectos)

- El modelo `Administrator` no tiene «nombre completo»: la identidad es `username` + `email`. Añadirlo requeriría migración y no aporta a la seguridad.
- No hay auto-registro ni invitación por email: el alta la hace siempre un superadministrador (§3.3).
- El *rate limit* de `change-password` es de 3 intentos / 15 min **por sesión** (§14.1): un superadministrador que fije varias contraseñas seguidas puede toparse con el `429` y debe esperar la ventana. Es intencional.

---

# 6. Autorización

## 6.1 Roles

| Rol | Descripción | Origen |
|---|---|---|
| `administrator` | Gestiona catálogo, precios, promociones, configuración. | `RN-66` |
| `super_administrator` | Todo lo anterior, más gestión de usuarios. | `RN-67` |

## 6.2 Matriz de permisos

La matriz completa de permisos por módulo y pantalla se define en `07_PANEL_ADMIN.md` §8.

## 6.3 Reglas de autorización

- La autorización real la impone el backend en cada endpoint (`PA-06`).
- La guarda de ruta del frontend es solo una conveniencia de UI (`06_FRONTEND.md` §8.3).
- Un Administrador que intente acceder a un endpoint de Superadministrador recibe `403`.

## 6.4 Restricciones especiales

| Regla | Origen |
|---|---|
| No se puede eliminar ni desactivar al último superadministrador activo. | `RN-71` |
| Un usuario no puede eliminarse a sí mismo. | `RN-72` |

---

# 7. Gestión de sesiones

## 7.1 Atributos de la cookie

| Atributo | Valor |
|---|---|
| `Name` | `session` |
| `HttpOnly` | `true` |
| `Secure` | `true` |
| `SameSite` | `Strict` |
| `Path` | `/api/v1/admin` |
| `Max-Age` | 12 horas (expiración absoluta, `SEG-01`). |

## 7.2 Expiración

| Tipo | Tiempo | Comportamiento |
|---|---|---|
| **Por inactividad** | 30 minutos | Se invalida si no hay peticiones autenticadas. |
| **Absoluta** | 12 horas | Se invalida transcurrido el tiempo desde el login. |

## 7.3 Invalidación

La sesión se invalida en los siguientes casos:

- Logout explícito.
- Cambio de contraseña del usuario.
- Eliminación o desactivación del usuario.
- Expiración por inactividad o absoluta.
- Invalidación manual por superadministrador (`SEG-02`).

## 7.4 Sesiones simultáneas

- Cada login crea una sesión con identificador único (`SEG-02`).
- El superadministrador puede listar e invalidar sesiones activas de cualquier usuario.
- El usuario puede cerrar su propia sesión actual.

---

# 8. CSRF

## 8.1 Riesgo

`AD-37` usa cookies de sesión, lo que habilita ataques CSRF en endpoints de escritura del panel.

## 8.2 Mitigación

- Token CSRF en todos los endpoints de escritura del panel (`POST`, `PUT`, `DELETE`, `PATCH` bajo `/api/v1/admin/*`).
- El token se genera en el servidor y se envía al frontend en el login o mediante endpoint dedicado.
- El frontend debe incluir el token en el header `X-CSRF-Token` o en el cuerpo de la petición.
- El backend valida que el token coincida con el de la sesión.

## 8.3 Excepción

La API pública es anónima y de solo lectura; no requiere protección CSRF.

---

# 9. XSS

## 9.1 Superficies de ataque

- Descripciones de producto (`ADP-14` pendiente de decisión de negocio).
- Nombres de productos, categorías, marcas.
- Mensajes de error o notificaciones.

## 9.2 Mitigación

- **Escaping:** todo contenido dinámico se escapa antes de renderizarse en el DOM.
- **CSP:** política restrictiva que limita fuentes de scripts.
- **Sanitización:** si se permite HTML enriquecido, usar librería de sanitización con lista blanca.
- **Cookies `HttpOnly`:** impiden el robo de sesión mediante XSS.

## 9.3 Reglas del frontend

- Nunca usar `dangerouslySetInnerHTML` con contenido no sanitizado.
- No insertar valores de usuario en `innerHTML`, `eval`, ni `document.write`.
- Validar URLs antes de asignarlas a `href` o `src`.

---

# 10. SQL Injection

## 10.1 Prevención

- Uso obligatorio de SQLAlchemy ORM o consultas parametrizadas.
- Prohibición absoluta de concatenar valores de usuario en consultas SQL.
- Uso de funciones de agregación y búsqueda de PostgreSQL a través del ORM.

## 10.2 Búsqueda de texto

- La búsqueda insensible a acentos (`AD-21`) se implementa mediante funciones del ORM o `unaccent` de PostgreSQL, nunca concatenando términos.

## 10.3 Ordenamiento y filtros

- Los parámetros de ordenamiento son valores cerrados (`AD-16`, `05_API.md`).
- Los filtros se validan contra DTOs antes de aplicarse.

---

# 11. Upload seguro de archivos

## 11.1 Política de archivos

| Aspecto | Valor |
|---|---|
| **MIME permitidos** | `image/jpeg`, `image/png`, `image/webp` |
| **Extensiones permitidas** | `.jpg`, `.jpeg`, `.png`, `.webp` |
| **Tamaño máximo** | 5 MB por archivo |
| **Dimensiones mínimas** | 200x200 px |
| **Dimensiones máximas** | 4000x4000 px |

## 11.2 Validaciones

- Validación de MIME por magic bytes, no solo por extensión.
- Rechazo de doble extensión (`foto.jpg.php`).
- Rechazo de archivos ejecutables.
- Rechazo si el archivo no es una imagen válida.

## 11.3 Almacenamiento

- Nombre de archivo aleatorio (UUID) + extensión validada.
- Ubicación fuera del directorio raíz web.
- Servido como estático por Nginx, nunca por el proceso de aplicación.
- Permisos de solo lectura para el proceso web.

## 11.4 Procesamiento

- Generación de versiones optimizadas en el servidor.
- El archivo original se conserva como autoritativo (`AD-38`).

## 11.5 Límite de tamaño en dos capas

El tamaño máximo por archivo (§11.1, **5 MB**) lo impone Flask con
`MAX_CONTENT_LENGTH`, que corta la petición con `413` antes de materializar
nada. Nginx pone además `client_max_body_size` en **6 MB** (5 MB + holgura para
el sobre multipart), de modo que una subida en ese margen llega a Flask y recibe
su `413`, y por encima la corta el *edge*. Ambas capas responden el mismo sobre
`AD-16` con `code: "payload_too_large"`. Detalle operativo en `12_DEPLOY.md`
§19.3.

---

# 12. Headers HTTP

## 12.1 Headers obligatorios

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=86400` en el primer despliegue, subiendo por escalones hasta `max-age=31536000`. El valor vigente y el plan de escalado viven en `nginx/hsts`. `includeSubDomains` y `preload` quedan pendientes de que exista DNS y TLS estable. |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Deniega **todas** las capacidades potentes del navegador (`camera`, `microphone`, `geolocation`, `payment`, `usb`, `bluetooth`, sensores, portapapeles, `fullscreen`, `autoplay`… 24 en total, cada una con `=()`). La aplicación no usa ninguna; el valor vigente y el criterio están en `nginx/security_headers`. |

**Fuente única: Nginx (S-10).** Las cinco las emite Nginx y solo Nginx. Hasta
S-09 el middleware de Flask añadía además `X-Frame-Options`,
`X-Content-Type-Options` y `Referrer-Policy` «por defensa en profundidad»; como
`add_header` de Nginx **suma** a lo que envía el upstream en vez de
reemplazarlo, las respuestas proxyadas salían con **dos** de cada una (medido:
`n=2` en `/api/v1/*`). Se retiraron de Flask.

La regla que reparte las cabeceras entre las dos capas: la que es **constante
para toda respuesta** la emite el borde —un solo sitio, y así cubre también lo
que Flask nunca ve: estáticos y errores generados por el propio Nginx—; la que
**depende de la ruta** (`Cache-Control`, §12.3) la emite la aplicación, que es la
única que conoce la semántica del endpoint.

Se emiten con `always`, de modo que **también acompañan a las respuestas de
error** (4xx/5xx). Nginx corre con `server_tokens off`: el header `Server` queda
en `nginx` sin versión y las páginas de error por defecto tampoco la muestran.
Los errores que genera Nginx (413, 502/503/504, `404` de `/uploads/*`) responden
JSON `AD-16`, no HTML genérico; los 4xx/5xx del backend pasan sin tocarse.

## 12.2 Content Security Policy

**Fuente única (S-13).** El valor vive en `nginx/csp`, no en línea en el bloque
`server`. Motivo: `add_header` no se acumula entre niveles, y las cuatro
localizaciones que declaran cabecera propia —`/uploads/`, `/assets/` y sus dos
404— **perdían la CSP en silencio**. Medido antes y después: ahora las 12 rutas
de producción la llevan con `n=1`. La política es la misma cadena de antes; sólo
cambió dónde está escrita. Mismo patrón que `nginx/hsts` (S-07).


| Directiva | Valor |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` |
| `style-src` | `'self'` (con `'unsafe-inline'` solo si Bootstrap lo requiere; preferir hashes). |
| `img-src` | `'self'`, `data:`, dominio de imágenes. |
| `connect-src` | `'self'` |
| `font-src` | `'self'` |
| `frame-ancestors` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |

---

## 12.3 Cache-Control

Regla de reparto —**una sola fuente por respuesta**, para que nunca salgan dos
cabeceras: Flask emite `Cache-Control` en todo lo que Nginx **proxya**; Nginx,
solo en lo que sirve **desde disco**. Los dos conjuntos son disjuntos.

| Clase | Rutas | Valor | Lo emite |
|---|---|---|---|
| Documento HTML del SPA | `/`, `/catalogo`, `/producto/*` y el resto de rutas de cliente | `no-cache` | Nginx (`expires epoch`) |
| Assets con huella de contenido | `/assets/*` | `public, max-age=31536000, immutable` | Nginx |
| Derivados de imagen | `/uploads/*` | `public, max-age=31536000, immutable` | Nginx |
| Estáticos sin huella | `/fonts/*`, `/banks/*` | `max-age=2592000` (30 días) | Nginx (`expires 30d`) |
| API pública | `/api/v1/*` | `no-store, no-cache, must-revalidate` (BK-06) | Flask |
| API administrativa | `/api/v1/admin/*` | `no-store, private` | Flask |
| Sonda operativa | `/health/*` | `no-store` | Flask |
| Documentos de rastreo | `/robots.txt`, `/sitemap.xml`, `/_seo/*` | `public, max-age=300` | Flask |
| 404 de estáticos | `/uploads/*`, `/assets/*` inexistentes | `no-store` | Nginx |
| 413 y 503 de Nginx | `@error_413`, `@error_upstream` | *(ninguno, a propósito)* | — |

**Por qué el HTML no se cachea indefinidamente.** Un `ETag` **no** obliga a
revalidar: sin `Cache-Control`, una caché aplica frescura heurística sobre
`Last-Modified` (RFC 9111 §4.2.2) y sirve el HTML viejo sin preguntar. Ese HTML
referencia `/assets/<huella>.js` que el despliegue nuevo ya borró, y el SPA
queda roto hasta que la entrada caduque. Además esas URLs devuelven **dos
representaciones** según el `User-Agent` (persona / rastreador, `AD-09`) y no
hay `Vary: User-Agent`: sin `no-cache`, una caché compartida podría entregarle a
una persona el documento del rastreador.

**Por qué `expires` y no `add_header`.** En Nginx, `add_header` **se suma** a lo
que ya envía el upstream (dos cabeceras) y **descarta** todos los `add_header`
heredados del `server` —CSP, HSTS y Permissions-Policy incluidos—. `expires`
reemplaza y no rompe la herencia. Por eso las rutas del SPA usan `expires`, y
las que ya rompían la herencia por su propio `Cache-Control` (`/assets/`,
`/uploads/`) siguen con `add_header`, que es el único que sabe decir `immutable`.
Contrapartida de `expires`: **solo actúa sobre 2xx/3xx**, así que en los 404 hay
que volver a `add_header ... always`.

**Por qué 413 y 503 van sin cabecera.** RFC 9111 §4.2.2 no los lista como
heurísticamente cacheables: ninguna caché conforme los almacena sin frescura
explícita. Ponerles `add_header` costaría la CSP heredada a cambio de nada. El
404 **sí** es heurísticamente cacheable, y por eso es el único error que la
lleva.

**`/uploads/` es contenido público, comprobado.** El volumen solo contiene los
cuatro espacios de `99_AI_DEVELOPMENT_GUIDE.md` §17.1 —`products`, `banners`,
`brands`, `store`—: imágenes de catálogo y de portada. No hay subidas por parte
de clientes, ni documentos, ni datos personales, y la ruta nunca pasa por
autenticación. Por eso `public` es correcto. **Salvedad registrada**: los
archivos sobreviven a la visibilidad de su entidad —`Product` e `Image` tienen
borrado lógico y bandera de activo, y nada del código de aplicación llama a
`purge_*`—, de modo que la foto de un producto desactivado sigue siendo
alcanzable y, con `max-age` de un año, una caché compartida podría servirla
durante ese plazo sin forma de purgarla. La URL lleva 16 hexadecimales de huella
del contenido y no hay índice de directorio: es **no listada**, no protegida.

---

## 12.4 CORS

**No se habilita, y la ausencia es la política.** Auditado y medido en S-11:
ninguna respuesta —de desarrollo ni de producción-equivalente— lleva ninguna
cabecera `Access-Control-*`, con ningún `Origin`.

| Comprobación | Resultado medido |
|---|---|
| `Origin` externo, ruta pública | sin `Access-Control-Allow-Origin` |
| `Origin` externo, ruta administrativa | sin `Access-Control-Allow-Origin` |
| `Origin: null` | sin concesión |
| Sin cabecera `Origin` | sin concesión |
| Preflight `OPTIONS` con `Access-Control-Request-Method` | 200 sin cabeceras CORS: el navegador no llega a enviar la petición real |
| Comodín `*` | no aparece en ninguna respuesta |
| Credenciales | no se conceden |

**Por qué no hace falta.** `AD-04`: Nginx sirve el SPA y la API bajo el mismo
origen, y el frontend llama a `/api/v1` con **ruta relativa**
(`VITE_API_BASE_URL: /api/v1`, idéntico en los dos compose). No existe ninguna
petición cross-origin en el producto. Habilitar CORS solo abriría una superficie
que hoy nadie usa. Solo Nginx publica puerto: el backend (8000) y el servidor de
Vite (5173) son internos, así que el navegador no puede alcanzarlos por otra vía.

**Segunda barrera, independiente de CORS.** La cookie de sesión es
`SameSite=Strict`, `HttpOnly`, `Secure` en producción y `Path=/api/v1/admin`. Con
`Strict` el navegador no la envía en **ninguna** petición cross-site: aunque
alguien habilitara CORS con credenciales, no habría sesión que arrastrar.

**`CORS_ORIGINS` se retiró (S-11).** Existía en `.env.example` y en el compose de
desarrollo, pero **ningún código la leía**: Flask-CORS no está instalado y no hay
implementación propia. Una variable que aparenta ser un control de seguridad sin
serlo es peor que no tenerla. `12_DEPLOY.md` §14.2 ya la marcaba como «no usar»;
ahora la configuración coincide con la documentación.

**Si algún día se sirve el frontend desde otro dominio**, hay que decidirlo
explícitamente: lista de orígenes cerrada, sin reflejo del `Origin` recibido, sin
comodín, métodos y cabeceras acotados, `Vary: Origin`, y revisar antes el
`SameSite` de la cookie —con `Strict` el panel no funcionaría cross-site—.

---

## 12.5 Redirección HTTP → HTTPS

El destino es el nombre **configurado** (`NGINX_SERVER_NAME`), no el `Host`
recibido. Con `$host`, medido en S-13, `Host: evil.example` devolvía
`Location: https://evil.example/...`. Un navegador no falsifica su propio `Host`,
pero un 301 **sí es heurísticamente cacheable** (RFC 9111 §4.2.2): una sola
petición del atacante bastaba para que una caché compartida guardara la
redirección hacia su sitio. Por eso, además, el 301 va con `Cache-Control:
no-store`. `NGINX_SERVER_NAME` pasó a ser obligatoria en el compose de
producción.

---

# 13. Auditoría

## 13.1 Registro de auditoría

- Toda operación de escritura del panel se registra en `audit_logs` (`AD-20`).
- La tabla es inmutable (`04_BASE_DATOS.md`).

## 13.2 Campos registrados

| Campo | Descripción |
|---|---|
| `administrator_id` | Usuario que realiza la acción. |
| `action` | `create`, `update`, `delete`, `activate`, `deactivate`. |
| `entity_type` | Tipo de entidad afectada. |
| `entity_id` | Identificador de la entidad. |
| `old_values` | Valores anteriores (JSONB). |
| `new_values` | Valores nuevos (JSONB). |
| `ip_address` | Dirección IP del administrador. |
| `timestamp` | Fecha y hora en UTC. |

## 13.3 Lectores

- Superadministrador.
- Administradores con permiso `view_audit_logs` (`07_PANEL_ADMIN.md`).

## 13.4 Inmutabilidad

- No se permite actualizar ni eliminar registros de auditoría.
- El respaldo de la base de datos preserva `audit_logs`.

---

# 14. Rate limiting

## 14.1 Límites por endpoint

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /api/v1/admin/auth/login` | 5 intentos | 15 minutos por IP |
| `POST /api/v1/admin/users/{id}/change-password` | 3 intentos | 15 minutos por sesión |
| API pública (`GET /api/v1/*`) | 100 peticiones | 1 minuto por IP |
| Subida de imágenes | 10 archivos | 1 minuto por sesión |

## 14.2 Comportamiento

- Al superar el límite, el backend devuelve `429 Too Many Requests`.
- La respuesta al `429` **no revela** si un usuario existe ni por qué falló el intento previo (§16.1): es la misma para cualquier nombre.
- Los intentos fallidos de login se registran en logs de seguridad.
- **No hay bloqueo permanente por IP.** Todos los límites son ventanas deslizantes; pasada la ventana, la IP vuelve a poder operar.

## 14.3 Rate limiting frente a DDoS

Son cosas distintas y se resuelven en capas distintas. Este documento **no**
afirma que el sitio esté «protegido contra DDoS» por tener Flask-Limiter.

| | Rate limiting aplicativo (Flask-Limiter) | Protección DDoS / flood L7 |
|---|---|---|
| **Qué frena** | Abuso puntual: fuerza bruta al login, *scraping*, spam de escritura, automatización contra la API. | Volumen: miles de peticiones/segundo desde muchas IPs para agotar CPU, memoria, conexiones o ancho de banda. |
| **Dónde actúa** | Dentro de Gunicorn, **después** de aceptar la conexión y ejecutar el *middleware*. La petición ya consumió *socket*, *worker* y, a veces, una consulta. |  En el *edge* (Cloudflare), **antes** de que el tráfico llegue al VPS. |
| **Efectividad ante volumen** | Nula: si el *worker* está ocupado respondiendo `429`, el recurso ya se gastó. | Es la única capa que puede absorber o descartar el volumen. |
| **Responsable** | Backend (§14.1). | Cloudflare (§23). |

Regla operativa: **Cloudflare es la primera barrera en producción**; Flask-Limiter
es la segunda (abuso que igual atraviesa el *edge*, o tráfico interno); los
controles de aplicación (§14.5) son la tercera.

## 14.4 Almacenamiento del contador y límite efectivo

- El contador de Flask-Limiter vive en un **almacén compartido fuera del proceso**, declarado por la variable de entorno `RATELIMIT_STORAGE_URI` (Compose lo apunta a `redis://redis:6379/0`).
- Todos los *workers* de Gunicorn consultan ese mismo contador, de modo que **el límite efectivo por IP es el límite declarado**, no un múltiplo del número de *workers*.
- `limits` no ofrece backend de PostgreSQL: usarlo habría exigido escribir una clase `Storage` propia, una tabla nueva y una escritura por petición sobre la base transaccional. Por eso el almacén es externo y dedicado.
- **Sin vuelta atrás silenciosa:** `RATELIMIT_IN_MEMORY_FALLBACK_ENABLED` y `RATELIMIT_SWALLOW_ERRORS` están en `False`. Si el almacén no responde, el límite falla de forma visible en lugar de dejar pasar peticiones sin contarlas.
- **Producción no arranca** con `RATELIMIT_STORAGE_URI` ausente o apuntando a `memory://`: `ProductionConfig.validate` lo rechaza (§18.2, mismo criterio que `SECRET_KEY`).
- En **desarrollo** el almacén no persiste; en **producción** sí (`--appendonly yes`), para que reiniciar el contenedor no regale cupo nuevo a quien esté probando contraseñas.
- **Sigue pendiente** la barrera de volumen del *edge* (§23): estos límites frenan abuso, no un DDoS volumétrico.

## 14.5 Endpoints costosos (capa de aplicación)

Independientemente del *rate limit*, las operaciones caras tienen controles propios:

| Operación | Control |
|---|---|
| Listados y búsquedas | Paginación obligatoria; no existe ningún endpoint que devuelva «todo» (`AD-31`). `per_page` acotado (`05_API.md` §4.4). |
| Ordenamiento y filtros | Valores cerrados validados contra DTO (§10.3). |
| Subida de imágenes | `MAX_CONTENT_LENGTH` = 5 MB; validación por *magic bytes*; derivados generados una sola vez (§11). |
| Escrituras del panel | Sesión válida + rol + token CSRF antes de tocar la base. |
| API pública | Anónima y de solo lectura; `Cache-Control: no-store` pero sin coste de sesión. |

Pendiente menor: `03_SEGURIDAD.md` §14.1 lista un límite específico para subida de
imágenes («10 archivos / 1 min por sesión») que hoy **no** está implementado como
límite dedicado — los *uploads* caen bajo el límite global de 100/min por IP. Se
puede añadir con un `@limiter.limit(...)` por endpoint si el abuso lo justifica;
`MAX_CONTENT_LENGTH` y la validación ya acotan el daño por petición.

---

# 15. Logs de seguridad

## 15.1 Eventos registrados

| Evento | Destino |
|---|---|
| Login exitoso | `audit_logs` |
| Login fallido | Logs de aplicación + `audit_logs` |
| Logout | `audit_logs` |
| Cambio de contraseña | `audit_logs` |
| Creación, edición, eliminación de entidad | `audit_logs` |
| Subida de imagen | `audit_logs` |
| Acceso denegado (`403`) | Logs de aplicación |
| Intento de acceso sin autenticar (`401`) | Logs de aplicación |
| Rate limit excedido | Logs de aplicación |

## 15.2 Contenido de los logs

- Timestamp en UTC.
- Identificador de sesión (sin datos sensibles).
- IP del cliente.
- Acción intentada.
- Resultado.
- Código de error (sin stacktrace ni SQL).

---

# 16. Política de errores seguros

## 16.1 Qué nunca devolver

| Información | Razón |
|---|---|
| Stacktraces | Puede revelar estructura interna. |
| Consultas SQL | Filtra detalles de base de datos. |
| Rutas internas del servidor | Facilita reconocimiento. |
| Información de otros usuarios | Privacidad y confidencialidad. |
| Contraseñas o hashes | Nunca, ni en error. |
| Mensajes de excepción de bibliotecas | Puede contener detalles internos. |

## 16.2 Qué devolver en su lugar

- Código de error genérico: `internal_error`, `validation_error`, `not_found`.
- Identificador `RN-xx` cuando aplica una violación de regla de negocio (`05_API.md`).
- `request_id` para correlación sin exponer detalles.
- Mensaje amigable en español para el usuario final.

## 16.3 Logging interno

- Los detalles técnicos van a logs de servidor, no a la respuesta.
- Los logs nunca contienen contraseñas, tokens ni datos sensibles.

**Cómo se garantiza (S-10).** Tres capas, porque los tres caminos por los que un
secreto llega a un log son distintos:

| Camino | Defensa | Dónde |
|---|---|---|
| Un valor que el código pasa por `extra=` | Redacción **recursiva** por nombre de clave: diccionarios, listas, tuplas y conjuntos, a cualquier profundidad | `core/logging/redaction.py` |
| Un objeto arbitrario serializado por su `repr` | Solo se admite el `str()` de tipos conocidos (fecha, decimal, UUID, ruta); cualquier otro se reduce a su clase | `redaction.py` |
| Valores de fila dentro del mensaje de una excepción de base de datos | `hide_parameters=True` en el motor, y recorte del `DETAIL: Failing row contains (...)` que emite PostgreSQL | `core/config/base.py` + `redaction.py` |

Lo que **no** se registra, a propósito: cuerpo de la petición, cabeceras,
cookies y **query string**. El registro de peticiones guarda `request.path`, que
excluye la parte de consulta: un `?token=...` no llega al log porque no se
escribe, no porque se sanee. Sí se guardan método, ruta, estado, duración e IP —
la IP es el único dato personal, y es lo que permite investigar un abuso y
correlacionar con el rate limiting (§14).

El stacktrace **sí** se conserva (ERR-05): sin él un 500 no se puede
diagnosticar. Lo que se corta son los volcados de fila que traía dentro.

**Advertencia.** La redacción es por **nombre de clave**, no por valor. Si algún
día un mensaje de excepción o una cadena de formato incorporan un secreto, no
hay nada que lo detecte. La regla sigue siendo no ponerlos ahí.

---

# 17. Principio de mínimo privilegio

## 17.1 Usuarios

- Roles con permisos mínimos necesarios (`RN-66`, `RN-67`).
- Un Administrador no gestiona usuarios.

## 17.2 Base de datos

- Usuario de aplicación con permisos solo sobre las tablas necesarias.
- Sin permisos de `DROP`, `CREATE` ni acceso a esquemas de sistema.

## 17.3 Archivos y directorios

- Uploads aislados del código fuente.
- Servidor web sin permisos de escritura en código fuente.
- Logs con permisos de solo lectura para operadores.

## 17.4 Procesos

- Gunicorn ejecuta con usuario no root.
- Nginx ejecuta con usuario dedicado.

---

# 18. Gestión de secretos

## 18.1 Secretos obligatorios

| Secreto | Ubicación | Rotación |
|---|---|---|
| `SECRET_KEY` | Variable de entorno | Cada despliegue mayor o compromiso. |
| Credenciales PostgreSQL | Variable de entorno | Periódicamente o ante rotación. |
| Tokens CSRF | Derivados de `SECRET_KEY` | Con `SECRET_KEY`. |
| Credenciales futuras (SMTP, S3, Cloudinary) | Variables de entorno | Según política del servicio. |

## 18.2 Qué nunca se versiona

- Archivos `.env`.
- Claves privadas y certificados.
- Credenciales de base de datos.
- Tokens de servicios externos.
- Backups de datos.

## 18.3 Buenas prácticas

- Usar archivos `.env.example` con valores ficticios para desarrollo.
- En producción, inyectar secretos mediante el sistema de orquestación.
- No imprimir secretos en logs ni en mensajes de error.

---

# 19. Dependencias de terceros

## 19.1 Política

| Aspecto | Regla |
|---|---|
| **Versiones fijas** | `requirements.txt` y `package.json` con versiones exactas. |
| **Actualización** | Revisión trimestral de dependencias. |
| **Vulnerabilidades** | Verificar advisories (`safety`, `npm audit`) antes de actualizar. |
| **Eliminación** | Auditar dependencias sin uso cada 3 meses. |
| **Nuevas dependencias** | Justificación obligatoria; preferir librerías maduras y mantenidas. |

## 19.2 Proceso

1. Identificar necesidad.
2. Evaluar alternativas.
3. Revisar mantenimiento, licencia y vulnerabilidades conocidas.
4. Aprobar antes de incorporar.
5. Documentar en `99_AI_DEVELOPMENT_GUIDE.md`.

---

# 20. Dependencias con otros documentos

| Documento | Qué aporta a `03_SEGURIDAD.md` |
|---|---|
| `01_ANALISIS_NEGOCIO.md` | Roles (`RN-66`, `RN-67`), reglas de negocio con impacto de seguridad (`RN-71`, `RN-72`, `RNF-11`, `RNF-12`, `RF-28`). |
| `02_ARQUITECTURA.md` | Sección §16 de seguridad, organización de capas, principios de diseño. |
| `02.1_DECISIONES_ARQUITECTONICAS.md` | `AD-37` (sesión con cookie), `AD-20` (auditoría), `AD-18` (soft delete), `AD-39` (limpieza física), `AD-40` (archivo antes que fila). |
| `04_BASE_DATOS.md` | Esquema de `audit_logs`, `administrators`, inmutabilidad, tipos de datos. |
| `05_API.md` | Endpoints de autenticación, contrato de errores, códigos HTTP. |
| `06_FRONTEND.md` | Guardas de ruta, manejo de `401`/`403`, protección de rutas públicas. |
| `07_PANEL_ADMIN.md` | Matriz de permisos, operaciones críticas con confirmación, layout del panel. |

---

# 21. Pendientes de otros documentos

| ID | Descripción | Documento responsable |
|---|---|---|
| `ADP-14` | ¿La descripción del producto admite formato enriquecido o es texto plano? Impacta en XSS. | `01_ANALISIS_NEGOCIO.md` |
| `ADP-15` | ¿Quién consulta el registro de auditoría general? Impacta en permisos del panel. | `01_ANALISIS_NEGOCIO.md` / `07_PANEL_ADMIN.md` |

---

# 22. Checklist de seguridad para implementación

- [ ] Todas las cookies de sesión usan `HttpOnly`, `Secure` y `SameSite=Strict`.
- [ ] Todos los endpoints de escritura del panel validan token CSRF.
- [ ] No hay concatenación de valores de usuario en SQL.
- [ ] Las respuestas de error no exponen stacktraces, SQL ni rutas internas.
- [ ] Los headers de seguridad están configurados en Nginx y acompañan también a las respuestas de error.
- [ ] La CSP está activa y restrictiva.
- [ ] `server_tokens off` en Nginx: el header `Server` y las páginas de error no exponen la versión.
- [ ] `client_max_body_size` de Nginx (6 MB) alineado con `MAX_CONTENT_LENGTH` de Flask (5 MB).
- [ ] Los errores de Nginx (413, 5xx, 404 de `/uploads/*`) responden JSON `AD-16`, no HTML genérico.
- [ ] Los uploads validan MIME, extensión, tamaño y magic bytes.
- [ ] Las contraseñas se almacenan hasheadas.
- [ ] El rate limiting está activo en login y API pública.
- [ ] La respuesta al `429` no distingue si un usuario existe.
- [ ] La auditoría registra toda escritura del panel.
- [ ] Los secretos viven en variables de entorno y no en el repositorio.
- [ ] El servidor ejecuta procesos con usuarios no root.
- [ ] En producción: `TRUSTED_PROXY_COUNT=2`, Cloudflare en modo *proxy* y con la IP real restaurada (§23).
- [ ] En producción: reglas de *rate limiting* y WAF de Cloudflare activas para el login y `/api/v1/admin/*` (§23).
- [ ] El panel de administración de Cloudflare y el token de API están protegidos con 2FA y se guardan como secretos.

---

# 23. Protección de borde (Cloudflare)

## 23.1 Rol de esta capa

Cloudflare se sitúa **delante** de Nginx (`Cliente → Cloudflare → Nginx →
Gunicorn`). Es la **primera barrera** y la única que puede con el volumen: WAF
gestionado, mitigación DDoS L3/L4 automática, *rate limiting* en el *edge*,
*challenges* y bloqueo por reputación/país antes de que el tráfico toque el VPS.

Lo que Cloudflare hace y Flask **no** puede hacer:

- Absorber o descartar *floods* volumétricos y L7 antes del origen.
- Aplicar reglas de firewall gestionadas (OWASP core, CVEs conocidos) sin desplegar nada.
- Emitir *managed challenge* / JS challenge para separar navegadores de bots.
- Ocultar la IP del origen (que debe quedar **solo** accesible vía Cloudflare).

## 23.2 Configuración requerida (se aplica en el panel de Cloudflare, no en el repo)

| Área | Configuración | Valor recomendado v1 |
|---|---|---|
| **DNS** | Registro `A`/`AAAA` del dominio | *Proxied* (nube naranja). El origen nunca se expone directo. |
| **SSL/TLS** | Modo de cifrado | **Full (strict)** — Cloudflare valida el certificado del origen. |
| **SSL/TLS** | *Always Use HTTPS*, *HSTS* | Activado (coherente con §12.1). |
| **Network** | *Restore original visitor IP* | Cloudflare ya envía `CF-Connecting-IP` / `X-Forwarded-For`; el origen debe leer la IP real de esa cadena → `TRUSTED_PROXY_COUNT=2` en el backend (`12_DEPLOY.md` §14). |
| **Firewall de origen** | Reglas de red del VPS | Aceptar `:443` **solo** desde los rangos IP publicados de Cloudflare; rechazar el resto. |
| **WAF** | *Managed Ruleset* (Cloudflare + OWASP core) | Activado en modo *Block* para reglas de alta confianza; *Log* para el resto al principio, revisar y endurecer. |
| **WAF** | *Bot Fight Mode* (o *Super Bot Fight Mode* si el plan lo permite) | Activado. |
| **Rate limiting rules** | Login del panel | `POST` a `*/api/v1/admin/auth/login` → más de **10 req / min por IP** ⇒ *Block* 15 min (o *Managed Challenge*). Complementa el `5/15 min` del backend. |
| **Rate limiting rules** | Escrituras del panel | Métodos `POST/PUT/PATCH/DELETE` a `*/api/v1/admin/*` → más de **60 req / min por IP** ⇒ *Managed Challenge*. |
| **Rate limiting rules** | API pública | `GET` a `*/api/v1/*` (excluyendo `/admin`) → más de **300 req / min por IP** ⇒ *Managed Challenge*. Holgado sobre el `100/min` del backend para no romper navegación real. |
| **Custom rules (WAF)** | Rutas sensibles | *Challenge* a peticiones a `/api/v1/admin/*` sin cabecera `Referer`/`Origin` del propio dominio, y a *user-agents* vacíos. |
| **Custom rules (WAF)** | Métodos raros | Bloquear `TRACE`, `CONNECT` y métodos no usados por la API. |
| **Caching** | `/api/v1/*` y `/api/v1/admin/*` | *Bypass cache* — el backend ya envía `no-store` (§12.3) y las respuestas del panel son privadas. |
| **Scrape Shield** | *Email Obfuscation*, *Hotlink Protection* | Opcional; sin impacto negativo. |
| **"Under Attack Mode"** | Interruptor de emergencia | **No** permanente. Se activa a mano solo durante un ataque en curso (mete un JS challenge a todo el tráfico). Documentar quién puede activarlo. |

## 23.3 Diferencia edge ↔ servidor (resumen)

| Amenaza | Capa que responde |
|---|---|
| DDoS volumétrico (L3/L4), flood L7 masivo | **Cloudflare** (única capaz). |
| Bots de *scraping* y automatización a escala | Cloudflare (WAF/Bot Mode); Flask-Limiter como red de respaldo. |
| Fuerza bruta al login | Cloudflare (*rate limiting rule*) **y** Flask-Limiter (`5/15 min`, §14.1). Defensa en dos capas. |
| Abuso de un endpoint concreto por pocas IPs | Flask-Limiter (§14.1) y controles de aplicación (§14.5). |
| Inyección, XSS, *path traversal*, CVEs de librerías conocidas | WAF gestionado de Cloudflare **y** validación/ORM/escaping del backend (§9, §10). |
| CSRF, autorización, reglas de negocio | **Solo** el backend (§6, §8). Cloudflare no las conoce. |

## 23.4 Riesgos y tareas manuales pendientes

- **La configuración de Cloudflare no vive en este repositorio.** Todo §23.2 se aplica a mano en el panel (o vía Terraform/API en una iteración futura) y debe quedar registrado en el runbook de operaciones.
- Si el firewall de origen **no** se restringe a los rangos de Cloudflare, un atacante que descubra la IP del VPS puentea toda esta capa.
- Las *rate limiting rules* de Cloudflare consumen cuota del plan; verificar el plan contratado antes de definirlas.
- Tras activar el WAF en *Block*, vigilar falsos positivos los primeros días (subidas de imágenes, panel) y crear excepciones si hace falta.
- `TRUSTED_PROXY_COUNT` debe pasar a `2` **en el mismo despliegue** en que se pone Cloudflare en modo *proxy*; si no, el backend registra la IP de Cloudflare como cliente y el *rate limiting* por IP deja de discriminar.

---

# 24. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Redacción inicial del documento de seguridad. Deriva de `03.0_SEGURIDAD_ANALISIS_PREVIO.md` aprobado. Materializa `AD-37`, `AD-20`, `RN-66`, `RN-67`, `RNF-11`, `RNF-12`, `RF-28`. Incluye autenticación, autorización, sesiones, CSRF, XSS, SQL Injection, uploads, headers, CSP, auditoría, rate limiting, password hashing, gestión de secretos y amenazas fuera de alcance. |
| **1.1.0** | 28/08/2026 | 🟡 EN REVISIÓN | Se añade §5.7 (gestión de credenciales y cuentas administrativas, sin nuevas reglas de negocio), §14.3–§14.5 (rate limiting frente a DDoS, límite efectivo con varios *workers*, endpoints costosos) y §23 (protección de borde con Cloudflare). Se aclara que el WAF y el *rate limiting* volumétrico son responsabilidad del *edge*, no del proceso Flask. No cambia ningún mecanismo ya implementado. |
| **1.2.0** | 28/08/2026 | 🟡 EN REVISIÓN | **Hardening de Nginx (auditoría E-4).** Nueva §11.5 (límite de subida en dos capas: Flask 5 MB / Nginx 6 MB). §12: los headers de seguridad acompañan a las respuestas de error (`always`), `server_tokens off` oculta la versión, y los errores que genera Nginx responden JSON `AD-16`. Checklist §22 ampliada. Cambios solo en `nginx/*`; sin tocar backend, frontend, sesiones ni Flask-Limiter. |
