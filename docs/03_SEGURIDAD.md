# 03_SEGURIDAD.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Seguridad |
| **Código** | 03 |
| **Versión** | 1.0.0 |
| **Estado** | ✅ APROBADO |
| **Fecha** | 07/08/2026 |
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
| WAF | Infraestructura adicional no justificada. |
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

---

# 12. Headers HTTP

## 12.1 Headers obligatorios

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

## 12.2 Content Security Policy

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
- Los intentos fallidos de login se registran en logs de seguridad.

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
- [ ] Los headers de seguridad están configurados en Nginx.
- [ ] La CSP está activa y restrictiva.
- [ ] Los uploads validan MIME, extensión, tamaño y magic bytes.
- [ ] Las contraseñas se almacenan hasheadas.
- [ ] El rate limiting está activo en login y API pública.
- [ ] La auditoría registra toda escritura del panel.
- [ ] Los secretos viven en variables de entorno y no en el repositorio.
- [ ] El servidor ejecuta procesos con usuarios no root.

---

# 23. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.0.0** | 07/08/2026 | ✅ APROBADO | Redacción inicial del documento de seguridad. Deriva de `03.0_SEGURIDAD_ANALISIS_PREVIO.md` aprobado. Materializa `AD-37`, `AD-20`, `RN-66`, `RN-67`, `RNF-11`, `RNF-12`, `RF-28`. Incluye autenticación, autorización, sesiones, CSRF, XSS, SQL Injection, uploads, headers, CSP, auditoría, rate limiting, password hashing, gestión de secretos y amenazas fuera de alcance. |
