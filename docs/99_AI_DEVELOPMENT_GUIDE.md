# 99_AI_DEVELOPMENT_GUIDE.md

---

# 1. Información

| Campo | Valor |
|---|---|
| **Proyecto** | Pablito Sports |
| **Sistema** | Plataforma de Catálogo Comercial |
| **Documento** | Guía de Desarrollo con Inteligencia Artificial |
| **Código** | 99 |
| **Versión** | 1.4.0 |
| **Estado** | 🟡 EN REVISIÓN |
| **Fecha** | 18/08/2026 |
| **Documentos previos** | [00_VISION_PROYECTO.md](00_VISION_PROYECTO.md) ✅ · [00.2_GLOSARIO.md](00.2_GLOSARIO.md) ✅ · [00.3_NOMENCLATURA.md](00.3_NOMENCLATURA.md) ✅ · [01_ANALISIS_NEGOCIO.md](01_ANALISIS_NEGOCIO.md) ✅ · [02_ARQUITECTURA.md](02_ARQUITECTURA.md) ✅ · [02.1_DECISIONES_ARQUITECTONICAS.md](02.1_DECISIONES_ARQUITECTONICAS.md) ✅ · [03_SEGURIDAD.md](03_SEGURIDAD.md) ✅ · [04_BASE_DATOS.md](04_BASE_DATOS.md) ✅ · [05_API.md](05_API.md) ✅ · [06_FRONTEND.md](06_FRONTEND.md) ✅ · [07_PANEL_ADMIN.md](07_PANEL_ADMIN.md) ✅ · [08_UI_SYSTEM.md](08_UI_SYSTEM.md) ✅ · [09_COMPONENTES.md](09_COMPONENTES.md) ✅ · [10_BACKEND.md](10_BACKEND.md) ✅ · [11_TESTING.md](11_TESTING.md) ✅ · [12_DEPLOY.md](12_DEPLOY.md) ✅ · [99.0_AI_DEVELOPMENT_GUIDE_ANALISIS_PREVIO.md](99.0_AI_DEVELOPMENT_GUIDE_ANALISIS_PREVIO.md) ✅ |
| **Documentos dependientes** | `IMPLEMENTATION_ROADMAP.md`, `13_CHANGELOG.md` |

---

# 2. Objetivo

## 2.1 Propósito

Este documento es el **manual de instrucciones** para cualquier agente de IA (Claude, GPT, OpenCode, Cursor, etc.) que escriba, modifique o revise código de Pablito Sports. Su función es garantizar que la IA:

1. Opere dentro de los límites del **Architecture Freeze**.
2. No modifique documentos de definición aprobados.
3. No invente reglas de negocio, contratos de API ni modelos de datos.
4. Escriba código consistente con las decisiones aprobadas.
5. Verifique su trabajo antes de declarar una tarea como completada.

## 2.2 Qué decide este documento y qué deja a otros

| Este documento decide | Se detalla en |
|---|---|
| Orden de lectura obligatorio | — |
| Archivos que la IA puede y no puede modificar | `00.3_NOMENCLATURA.md` |
| Cómo crear migraciones | `04_BASE_DATOS.md` |
| Cómo crear endpoints | `05_API.md`, `10_BACKEND.md` |
| Cómo crear DTOs y mappers | `10_BACKEND.md` |
| Cómo crear componentes React | `06_FRONTEND.md`, `07_PANEL_ADMIN.md`, `08_UI_SYSTEM.md`, `09_COMPONENTES.md` |
| Cómo escribir tests | `11_TESTING.md` |
| Cómo escribir commits | — |
| Definition of Done para tareas de IA | — |
| Formato de prompts de implementación | — |
| Qué hacer ante documentación insuficiente | — |

## 2.3 Principios rectores

1. **Solo implementar lo aprobado.** Si algo no está definido, no se implementa.
2. **No inferir negocio ni arquitectura.** Las lagunas se registran o se preguntan; no se completan con suposiciones.
3. **Mínima sorpresa.** El código nuevo debe parecer escrito por el equipo humano.
4. **Verificación antes de entrega.** Una tarea no está completa hasta que pasa el DoD y el checklist final.
5. **Trazabilidad.** Cada cambio debe poder rastrearse a un documento aprobado.

---

# 3. Alcance

## 3.1 Incluye

- Orden de lectura obligatorio de documentos aprobados.
- Lista de archivos permitidos y prohibidos para un agente de IA.
- Guías por tipo de cambio: migración, endpoint, DTO, mapper, componente React, test.
- Convenciones de commits.
- Definition of Done para tareas de IA.
- Formato de prompts de implementación.
- Checklist de verificación antes de responder "completado".
- Reglas para cuando la documentación es insuficiente.

## 3.2 No incluye (v1)

| Fuera de alcance v1 | Razón |
|---|---|
| Configuración de proveedores de IA | Competitivo/técnico, no del sistema. |
| Reglas de precios o límites de uso de IA | Operativa del equipo, no del código. |
| Políticas legales de uso de IA | Cubierto por políticas organizacionales. |
| Prompts específicos de negocio | Van en cada tarea, no en la guía general. |

## 3.3 Relación con el Architecture Freeze

`02_ARQUITECTURA.md` v1.0.0 está congelado. Este documento **no introduce arquitectura nueva**; solo regula cómo los agentes de IA deben operar dentro de los límites aprobados.

---

# 4. Definiciones

| Término | Definición en este documento |
|---|---|
| **Agente de IA** | Cualquier sistema automatizado que genere o modifique código bajo estas reglas. |
| **Documento de definición** | Documento que define negocio, arquitectura, API, datos o diseño (`00_*.md` a `09_*.md`). |
| **Documento de implementación** | Documento que concreta cómo se ejecuta una decisión (`10_BACKEND.md`, `11_TESTING.md`, `12_DEPLOY.md`, `99_AI_DEVELOPMENT_GUIDE.md`). |
| **DoD** | Definition of Done. |
| **Prompt** | Instrucción dada al agente de IA para ejecutar una tarea. |
| **Placeholder** | Implementación temporal que señala una decisión pendiente sin inventarla. |

---

# 5. Orden de lectura obligatorio

Antes de escribir o modificar código, el agente de IA debe leer, en este orden, **solo los documentos aprobados**:

1. `00_VISION_PROYECTO.md` — propósito y alcance del sistema.
2. `00.2_GLOSARIO.md` — lenguaje común del negocio.
3. `00.3_NOMENCLATURA.md` — convenciones de nombres.
4. `01_ANALISIS_NEGOCIO.md` — reglas de negocio y flujos.
5. `02_ARQUITECTURA.md` — arquitectura y componentes aprobados.
6. `02.1_DECISIONES_ARQUITECTONICAS.md` — razones de las decisiones.
7. `03_SEGURIDAD.md` — controles de seguridad.
8. `04_BASE_DATOS.md` — modelo de datos y migraciones.
9. `05_API.md` — contratos de API.
10. `05.1_API_DATABASE_CROSS_REVIEW.md` — revisión cruzada API/base de datos.
11. `06_FRONTEND.md` — estructura del frontend.
12. `07_PANEL_ADMIN.md` — panel administrativo.
13. `08_UI_SYSTEM.md` — sistema de diseño.
14. `09_COMPONENTES.md` — componentes reutilizables.
15. `10_BACKEND.md` — estructura y convenciones del backend.
16. `11_TESTING.md` — estrategia y convenciones de testing.
17. `12_DEPLOY.md` — despliegue y operación.
18. `99_AI_DEVELOPMENT_GUIDE.md` — este documento.

## 5.1 Reglas

- **Solo se exige la lectura de documentos aprobados.** Si un documento aún no existe o no está aprobado, no es obligatorio; se aplica §6.
- Si un documento de la lista cambia, el agente debe releerlo antes de continuar con tareas relacionadas.
- No se puede omitir un documento por "ya lo conozco"; el contexto completo es obligatorio.
- Si un documento no existe o está incompleto, aplicar §6.

## 5.2 Precedencia entre documentos

Si dos documentos parecen entrar en conflicto, prevalece el más cercano a la fuente de verdad:

| Conflicto | Gana |
|---|---|
| Negocio vs API | `01_ANALISIS_NEGOCIO.md` |
| Arquitectura vs Backend | `02_ARQUITECTURA.md` |
| UI System vs Componentes | `08_UI_SYSTEM.md` |
| API vs Frontend | `05_API.md` |
| Base de datos vs Backend | `04_BASE_DATOS.md` |
| Seguridad vs cualquier otro | `03_SEGURIDAD.md` |

Cuando persiste la duda, se registra y se solicita aclaración (§6.4).

---

# 6. Qué hacer cuando la documentación es insuficiente

## 6.1 Regla fundamental

**El agente no debe inferir arquitectura, negocio, contratos de API ni modelos de datos faltantes.**

## 6.2 Acciones permitidas

| Situación | Acción |
|---|---|
| Falta un detalle menor y está cubierto por una convención aprobada. | Aplicar la convención y documentar la suposición en la respuesta. |
| Falta información necesaria para continuar. | Registrar una duda explícita y pedir aclaración. |
| El cambio requiere una nueva regla de negocio o decisión arquitectónica. | No implementar. Solicitar aprobación del equipo humano. |

## 6.3 Lo que nunca se debe hacer

El agente **no** puede:

- Crear nuevos requisitos de negocio (`RN-xx`, `RF-xx`, `RNF-xx`).
- Crear nuevas decisiones arquitectónicas (`AD-xx`).
- Crear nuevas decisiones de implementación (`BK-xx`, `DPL-xx`, `AI-xx`).
- Crear nuevos componentes del UI System (`UDS-xx`) sin aprobación.
- Crear nuevos componentes reutilizables (`COMP-xx`) sin aprobación.
- Modificar contratos de API o modelos de datos para "completar" una tarea.
- Asumir comportamientos de usuario o reglas de precios no definidas.

## 6.4 Formato para registrar dudas

```markdown
## Duda registrada
- **Documento(s) consultado(s):** <lista>
- **Sección o decisión faltante:** <descripción>
- **Impacto:** <qué no se puede implementar sin aclaración>
- **Propuesta del agente (opcional):** <solo si hay una alternativa obvia y segura>
```

---

# 7. Fronteras: qué puede y no puede modificar un agente

## 7.1 Archivos que el agente NUNCA debe modificar

| Categoría | Ejemplos | Razón |
|---|---|---|
| Documentos de definición aprobados | `00_*.md`, `01_*.md`, `02_*.md`, `02.1_*.md`, `03_*.md`, `04_*.md`, `05_*.md`, `06_*.md`, `07_*.md`, `08_*.md`, `09_*.md` | Son la autoridad del sistema. |
| Documentos de implementación aprobados | `10_BACKEND.md`, `11_TESTING.md`, `12_DEPLOY.md`, `99_AI_DEVELOPMENT_GUIDE.md` | Solo el equipo humano las actualiza. |
| Análisis previos aprobados | `*.0_*_ANALISIS_PREVIO.md` | Solo el equipo humano los actualiza. |
| Configuración de despliegue productivo | `.env.production`, certificados, secretos | Riesgo operativo y de seguridad. |
| Datos de producción | Base de datos real, imágenes de usuarios | Privacidad e integridad. |

## 7.2 Archivos que el agente PUEDE modificar

| Categoría | Ejemplos |
|---|---|
| Código fuente del backend | `backend/app/**/*.py` |
| Código fuente del frontend | `frontend/src/**/*.{ts,tsx,css}` |
| Tests | `backend/tests/**/*.py`, `frontend/src/**/*.test.{ts,tsx}` |
| Migraciones | `backend/migrations/versions/*.py` |
| Scripts de utilidad | `scripts/*.py`, `scripts/*.sh` |
| Configuración de desarrollo | `.env.example`, `docker-compose.yml` (con precaución) |
| Documentación técnica operativa | `README.md`, `docs/CONTRIBUTING.md` (solo si se indica) |

## 7.3 Archivos que requieren aprobación explícita

| Categoría | Ejemplos |
|---|---|
| Cambios en contratos de API | Rutas, DTOs, códigos de respuesta. |
| Cambios en modelo de datos | Nuevas tablas, columnas, índices, relaciones. |
| Cambios en seguridad | Middleware, permisos, headers, cookies. |
| Cambios en despliegue | `docker-compose.prod.yml`, configuración de Nginx. |
| Cambios en dependencias principales | Flask, SQLAlchemy, React, etc. |

## 7.4 Reglas para refactors

Muchos agentes realizan refactors "útiles" que pueden introducir riesgo. Aplica las siguientes reglas:

### Refactors permitidos sin aprobación

- Mejorar legibilidad de funciones pequeñas.
- Extraer funciones privadas dentro del mismo módulo.
- Eliminar duplicación local sin cambiar interfaces.
- Agregar tests.
- Renombrar variables privadas para claridad.

### Refactors prohibidos sin aprobación

- Cambiar la estructura de carpetas.
- Cambiar contratos públicos (rutas, DTOs, respuestas).
- Cambiar límites entre capas (por ejemplo, que un controlador acceda directamente a la base de datos).
- Cambiar dependencias entre módulos.
- Introducir nuevas librerías base.
- Mover archivos entre dominios.

---

# 8. Cómo crear migraciones

## 8.1 Proceso

1. Revisar `04_BASE_DATOS.md` y el esquema actual.
2. Si el cambio es destructivo, solicitar aprobación explícita.
3. Generar la migración con Alembic:
   ```bash
   cd backend
   flask db migrate -m "descripcion_corta_del_cambio"
   ```
4. Revisar el archivo generado manualmente.
5. Asegurar que la migración sea reversible salvo aprobación en contra.
6. Aplicar en local y ejecutar tests.
7. Aplicar en staging y verificar.

## 8.2 Convenciones

- Nombre del archivo: versión Alembic + descripción en `snake_case`.
- Incluir docstring con propósito y dependencias.
- Usar `op.execute` para SQL crudo cuando sea necesario.
- No modificar migraciones ya aplicadas en staging o producción.
- Las migraciones irreversibles requieren justificación y backup verificado (`12_DEPLOY.md` §9.4).

## 8.3 Ejemplo mínimo

```python
"""Agregar columna destacado a products.

Depende de: 20260801_001_inicial.py
"""
from alembic import op
import sqlalchemy as sa

revision = '20260809_001'
down_revision = '20260801_001'


def upgrade():
    op.add_column('products', sa.Column('destacado', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('products', 'destacado')
```

---

# 9. Cómo crear endpoints

## 9.1 Proceso

1. Revisar `05_API.md` para confirmar que el endpoint esté definido.
2. Si no está definido, no crearlo. Solicitar aprobación del contrato.
3. Ubicar el endpoint en el blueprint correspondiente (`backend/app/api/v1/`).
4. Implementar el DTO de request/response.
5. Implementar el mapper entre DTO y modelo.
6. Implementar el caso de uso o servicio.
7. Agregar tests de contrato e integración.
8. Actualizar `05_API.md` solo si el equipo humano autoriza el cambio de contrato.

## 9.2 Convenciones

- Rutas RESTful y pluralización consistente con `05_API.md`.
- Nombres de funciones en español descriptivo (`obtener_producto`, `crear_pedido`).
- DTOs con validación explícita.
- Mappers sin lógica de negocio.
- Servicios con lógica de negocio; controladores delegan.
- Respuestas de error consistentes con `05_API.md`.

## 9.3 Contratos públicos: no cambiar sin aprobación

> **Importante:** No modificar contratos públicos sin aprobación explícita.

Prohibido sin aprobación:

- Renombrar campos de respuesta.
- Cambiar tipos de campos.
- Cambiar la semántica de estados o códigos de respuesta.
- Cambiar rutas públicas.
- Cambiar la envoltura de respuesta definida en `05_API.md` (`AD-16`).

Los cambios en contratos públicos deben pasar por revisión y actualización de `05_API.md` por el equipo humano.

## 9.4 Ejemplo mínimo

```python
# backend/app/api/v1/products/routes.py
from flask import Blueprint, jsonify
from .dtos import ProductoResponseDTO
from .mappers import producto_a_dto
from .services import obtener_producto_por_slug

bp = Blueprint('products', __name__, url_prefix='/products')


@bp.get('/<string:slug>')
def obtener_producto(slug: str):
    producto = obtener_producto_por_slug(slug)
    if producto is None:
        return jsonify({"error": "Producto no encontrado"}), 404
    return jsonify(producto_a_dto(producto).model_dump()), 200
```

---

# 10. Cómo crear DTOs y mappers

## 10.1 DTOs

- Un DTO por request y por response.
- Ubicación: `backend/app/api/v1/<dominio>/dtos/`.
- Validar tipos, longitudes, obligatoriedad y reglas de formato.
- No incluir lógica de negocio.

```python
# backend/app/api/v1/products/dtos.py
from pydantic import BaseModel


class ProductoResponseDTO(BaseModel):
    id: int
    nombre: str
    slug: str
    precio: int
    activo: bool
```

## 10.2 Mappers

- Ubicación: `backend/app/api/v1/<dominio>/mappers/`.
- Funciones puras: `entidad_a_dto` y `dto_a_entidad`.
- No acceden a base de datos ni a servicios externos.
- Manejan conversiones de tipo y nombres de campos.

```python
# backend/app/api/v1/products/mappers.py
from ..dtos import ProductoResponseDTO
from ....models import Product


def producto_a_dto(producto: Product) -> ProductoResponseDTO:
    return ProductoResponseDTO(
        id=producto.id,
        nombre=producto.nombre,
        slug=producto.slug,
        precio=producto.precio,
        activo=producto.activo,
    )
```

---

# 11. Cómo crear componentes React

## 11.1 Proceso

1. Revisar `08_UI_SYSTEM.md` y `09_COMPONENTES.md`.
2. Reutilizar componentes existentes del UI System.
3. Si se necesita uno nuevo, evaluar si pertenece al UI System o a una página específica.
4. Implementar en TypeScript.
5. Agregar props tipadas y documentación breve.
6. Incluir test de componente si aplica (`11_TESTING.md`).
7. Verificar accesibilidad (ARIA, contraste, navegación por teclado).

## 11.2 Ubicaciones

| Tipo | Ruta |
|---|---|
| Componentes del UI System | `frontend/src/components/ui/` |
| Componentes de dominio | `frontend/src/components/` |
| Páginas | `frontend/src/pages/` |
| Hooks | `frontend/src/hooks/` |
| Servicios/API | `frontend/src/services/` |
| Stores/estado | `frontend/src/stores/` |

## 11.3 Convenciones

- Nombres en PascalCase para componentes, camelCase para hooks y funciones.
- Props tipadas con TypeScript.
- CSS modules o Tailwind según `08_UI_SYSTEM.md`.
- Componentes pequeños, enfocados y reutilizables.
- Manejo de estados de carga y error explícito.

## 11.4 Ejemplo mínimo

```tsx
// frontend/src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = 'button',
}) => {
  return (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
```

---

# 12. Cómo escribir tests

## 12.1 Tipos de tests y ubicaciones

| Tipo | Dónde | Cuándo usar |
|---|---|---|
| Unitario | Cerca del código probado | Funciones puras, utilidades, mappers. |
| Integración | `backend/tests/integration/` | Repositorios, servicios con base de datos. |
| Contrato API | `backend/tests/contract/` | Endpoints y DTOs. |
| Componente | `frontend/src/**/*.test.tsx` | Componentes React. |
| E2E | `frontend/tests/e2e/` | Flujos críticos. |

## 12.2 Convenciones

- Nombre descriptivo: `test_<funcionalidad>_<condicion>_<resultado_esperado>`.
- Un assert por test conceptual; múltiples asserts permitidos si verifican un mismo resultado.
- Usar fixtures para datos de prueba.
- Aislar tests de base de datos con transacciones.
- No mocks innecesarios en integración.
- Cubrir casos críticos obligatorios de `11_TESTING.md`.

## 12.3 Ejemplo mínimo

```python
# backend/tests/integration/test_products.py
def test_obtener_producto_por_slug_existente(client, producto_factory):
    producto = producto_factory(nombre="Zapatillas", slug="zapatillas")

    response = client.get(f"/api/v1/products/{producto.slug}")

    assert response.status_code == 200
    assert response.json["nombre"] == "Zapatillas"
```

---

# 13. Cómo escribir commits

## 13.1 Formato

```
<tipo>(<alcance>): <descripción corta>

<cuerpo opcional con detalles>

Refs: <ticket o issue opcional>
```

## 13.2 Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad. |
| `fix` | Corrección de bug. |
| `docs` | Documentación. |
| `test` | Tests. |
| `refactor` | Refactor sin cambio funcional. |
| `chore` | Tareas de mantenimiento. |
| `security` | Controles de seguridad. |

## 13.3 Reglas

- Commits atómicos y enfocados.
- Descripción en español o inglés, pero consistente con el proyecto.
- No incluir secretos en mensajes de commit.
- Si el cambio modifica un contrato o modelo de datos, mencionarlo explícitamente.
- Referenciar decisiones aprobadas cuando aplique (`Refs: AD-04`).

## 13.4 Ejemplo

```
feat(api): add cart revalidation endpoint

- Implements POST /api/v1/cart/revalidate
- Adds CartService.revalidate method
- Adds contract and integration tests

Refs: RN-75, AD-32
```

---

# 14. Definition of Done para tareas de IA

Una tarea se considera **completada** cuando **todas** las siguientes condiciones se cumplen:

- [ ] El código cumple con los documentos aprobados.
- [ ] Se respetaron las fronteras de archivos (§7).
- [ ] Los tests nuevos pasan.
- [ ] Los tests existentes no se rompen.
- [ ] No hay secretos, tokens o contraseñas hardcodeadas.
- [ ] No se modificaron documentos de definición sin aprobación.
- [ ] Se actualizó documentación técnica si fue necesario.
- [ ] El código sigue las convenciones de `00.3_NOMENCLATURA.md`.
- [ ] Se ejecutaron linting y formateo.
- [ ] Se verificó manualmente el flujo afectado.

---

# 15. Formato de prompts de implementación

## 15.1 Estructura recomendada

```markdown
## Contexto
<qué se quiere lograr y por qué>

## Documentos de referencia
<lista de archivos md relevantes>

## Alcance
<qué incluye y qué no incluye la tarea>

## Criterios de aceptación
<lista verificable>

## Restricciones
<qué no debe hacer el agente>

## Notas técnicas
<detalles adicionales>
```

## 15.2 Ejemplo

```markdown
## Contexto
Agregar endpoint para marcar un producto como destacado desde el panel admin.

## Documentos de referencia
- docs/05_API.md
- docs/10_BACKEND.md
- docs/11_TESTING.md

## Alcance
- Crear endpoint PATCH /api/v1/admin/products/{id}/featured.
- Actualizar campo `destacado` en la base de datos.
- No modificar el catálogo público.

## Criterios de aceptación
- [ ] Endpoint responde 200 con producto actualizado.
- [ ] Solo administradores pueden ejecutarlo.
- [ ] Tests de contrato e integración pasan.

## Restricciones
- No modificar `05_API.md` sin aprobación.
- No crear nuevas tablas.

## Notas técnicas
- Usar el servicio de productos existente.
```

---

# 16. Checklist de verificación antes de responder "completado"

El agente debe ejecutar este checklist antes de finalizar cualquier tarea:

- [ ] Releer los documentos de referencia relevantes.
- [ ] Verificar que solo se tocaron archivos permitidos (§7).
- [ ] Ejecutar tests del área modificada.
- [ ] Ejecutar linting y formateo.
- [ ] Revisar que no haya secretos, tokens o contraseñas en el código.
- [ ] Revisar que no haya prints de debug olvidados.
- [ ] Verificar que las migraciones sean reversibles.
- [ ] Confirmar que los contratos de API no cambiaron sin aprobación.
- [ ] Confirmar que el modelo de datos no cambió sin aprobación.
- [ ] Confirmar que no se rompió el build del frontend.
- [ ] Confirmar que no se rompió el build del backend.
- [ ] Responder con resumen de cambios, tests ejecutados y decisiones tomadas.

---

# 17. Decisiones

## AI-01 — Documentos de definición son de solo lectura para la IA

| Campo | Valor |
|---|---|
| **Identificador** | `AI-01` |
| **Decisión** | Los agentes de IA no pueden modificar documentos de definición aprobados (`00_*.md` a `09_*.md`, decisiones y guías aprobadas). |
| **Justificación** | Preserva el Architecture Freeze y evita deriva no controlada del sistema. |
| **Consecuencias** | Cualquier cambio en definiciones requiere intervención humana. |

## AI-02 — Cambios en API y modelo requieren aprobación explícita

| Campo | Valor |
|---|---|
| **Identificador** | `AI-02` |
| **Decisión** | La IA no puede crear endpoints, DTOs, tablas, columnas o relaciones nuevas si no están definidos en los documentos aprobados. |
| **Justificación** | Garantiza que los contratos y el modelo de datos permanezcan estables. |
| **Consecuencias** | La IA debe solicitar aprobación o trabajar con placeholders. |

## AI-03 — Toda migración debe ser reversible salvo aprobación

| Campo | Valor |
|---|---|
| **Identificador** | `AI-03` |
| **Decisión** | La IA debe generar migraciones con `downgrade()` probado. Las migraciones irreversibles requieren aprobación humana. |
| **Justificación** | `12_DEPLOY.md` §9.4 y `02_ARQUITECTURA.md` §12.12. |
| **Consecuencias** | Mayor cuidado en migraciones destructivas. |

## AI-04 — La IA debe seguir el orden de lectura obligatorio

| Campo | Valor |
|---|---|
| **Identificador** | `AI-04` |
| **Decisión** | Antes de cualquier tarea de código, la IA debe leer los documentos de referencia en el orden definido en §5. |
| **Justificación** | Reduce errores por contexto incompleto. |
| **Consecuencias** | Tareas iniciales requieren lectura previa de varios documentos. |

## AI-05 — Definition of Done aplicable a toda tarea de IA

| Campo | Valor |
|---|---|
| **Identificador** | `AI-05` |
| **Decisión** | Ninguna tarea se marca como completada sin cumplir el DoD de §14 y el checklist de §16. |
| **Justificación** | Asegura calidad y trazabilidad. |
| **Consecuencias** | La IA debe invertir tiempo en verificación antes de entregar. |

## AI-06 — Dimensiones y nomenclatura de las imágenes derivadas

| Campo | Valor |
|---|---|
| **Identificador** | `AI-06` |
| **Decisión** | Se fijan anchos, formatos, nomenclatura, ubicación y derivado canónico de las imágenes derivadas, para los espacios de nombres `products` y `banners`. El detalle está en §17.1. |
| **Justificación** | Cierra `ADP-16`. §15.5 nombra los tres derivados por su consumidor pero no da dimensiones; sin ellas el backend no puede generarlos y el frontend no puede construir `srcset` sin depender de una convención oculta. |
| **Consecuencias** | Backend y frontend comparten una convención publicada. Cambiar un ancho o una ubicación invalida los derivados existentes: hay que regenerarlos desde el original, que `AD-38` conserva precisamente para eso. |

---

# 17.1 Convención de imágenes derivadas

**Materializa** `02_ARQUITECTURA.md` §15.2 a §15.7. No sustituye ni altera esas
secciones: aporta los valores concretos que allí se dejaron sin fijar.

Cubre los **dos** consumidores de imágenes del sistema: productos y banners.
§15 se redactó pensando en el catálogo y agrupa por producto; los banners
(`RN-73`, `RN-74`) también cargan imagen y necesitaban una ubicación. Se les da
un espacio de nombres hermano en lugar de una arquitectura aparte.

## 17.1.1 Espacios de nombres

| Espacio | Agrupación | Origen |
|---|---|---|
| `products` | Por identificador de producto | §15.2 |
| `banners` | Plano; un banner es una pieza suelta, sin agregado que lo agrupe | `RN-73` |
| `brands` | Por identificador de marca; agrupa el logotipo y el collage de la misma marca | `04_BASE_DATOS.md` §9.2.3, §9.2.17 (v1.1.0) |
| `store` | Plano; hoy solo la foto de «Nuestra historia» | `04_BASE_DATOS.md` §9.2.13 (v1.1.0) |

## 17.1.2 Anchos

**Productos.** Los tres derivados de §15.5, con su consumidor ya aprobado:

| Derivado (§15.5) | Consumidor (§15.5) | Ancho |
|---|---|---|
| Miniatura | Listados del panel | **400 px** |
| Catálogo | Tarjeta de producto | **800 px** |
| Detalle | Ficha y galería | **1600 px** |

**Banners.** Una pieza de portada se muestra a ancho completo, de modo que sus
tamaños son mayores que los de una tarjeta de producto:

| Derivado | Consumidor | Ancho |
|---|---|---|
| Miniatura | Listado del panel | **800 px** |
| Estándar | Portada en escritorio | **1600 px** |
| Ancho | Pantallas anchas y alta densidad | **2400 px** |

**Marcas (v1.1.0).** El logotipo se dibuja pequeño y el collage ocupa media
pantalla, de modo que el espacio necesita cubrir los dos usos:

| Derivado | Consumidor | Ancho |
|---|---|---|
| Miniatura | Listado del panel y franja de marcas | **400 px** |
| Estándar | Logotipo del bloque de portada y piezas del collage | **800 px** |
| Detalle | Pieza grande del collage y alta densidad | **1600 px** |

**Tienda (v1.1.0).** La foto de «Nuestra historia» se muestra a media pantalla:

| Derivado | Consumidor | Ancho |
|---|---|---|
| Miniatura | Vista previa del panel | **800 px** |
| Estándar | Sección de historia | **1600 px** |

**La altura conserva siempre la proporción del original**, en todos los espacios. No
se recorta: el encuadre lo decide quien carga la imagen, no el sistema. Una
imagen más estrecha que el ancho objetivo **no se amplía**; agrandar no añade
información.

Son **como máximo** tres por espacio, conforme al criterio de §15.5: no se
generan tamaños adicionales (`PA-11`). El espacio `store` usa dos porque tiene
un solo consumidor y una vista previa; inventarle un tercero sería generar un
archivo que nadie pide.

## 17.1.3 Formatos

| Papel | Formato | Origen |
|---|---|---|
| Original | El de origen, sin alterar | §15.6, `AD-38` |
| Derivado principal | **WebP** | §15.6 |
| Derivado de respaldo | **JPEG** | §15.6 ("respaldo en formato tradicional") |

Cada ancho existe en los dos formatos: seis archivos derivados por imagen, en
ambos espacios.

## 17.1.4 Nomenclatura

`<huella>` es la huella del contenido del original exigida por §15.3 regla 2, que
es lo que habilita el cacheo indefinido de §15.7.

```
productos:  <huella>-400.webp    <huella>-800.webp    <huella>-1600.webp
            <huella>-400.jpg     <huella>-800.jpg     <huella>-1600.jpg

banners:    <huella>-800.webp    <huella>-1600.webp   <huella>-2400.webp
            <huella>-800.jpg     <huella>-1600.jpg    <huella>-2400.jpg
```

Esto satisface §15.3 regla 3 —el derivado se nombra como el original más el
tamaño— y hace la relación reconstruible sin consultar la base de datos.

## 17.1.5 Ubicación

Conforme a §15.2, ramas separadas para original y derivados:

```
<UPLOAD_FOLDER>/
├── originals/
│   ├── products/<product_id>/<huella>.<ext>
│   └── banners/<huella>.<ext>
└── derivatives/
    ├── products/<product_id>/<huella>-<ancho>.<formato>
    └── banners/<huella>-<ancho>.<formato>
```

Nginx publica **exclusivamente** `derivatives/`, con lo que los dos espacios de
nombres quedan accesibles y ninguna rama de originales lo está (`AD-04`,
`AD-38`). El cambio no amplía la superficie pública: solo añade una subcarpeta
dentro de la rama que ya se publicaba.

## 17.1.6 Derivado canónico

Lo que se almacena en la base es **WebP**, expresado relativo a la rama que
Nginx publica — con una excepción (`brands`, ver más abajo):

| Entidad | Columna | Canónico | Por qué |
|---|---|---|---|
| Producto | `images.file_path` | `products/<product_id>/<huella>-800.webp` | La tarjeta de producto es el consumidor más frecuente del catálogo |
| Banner | `banners.image_path` | `banners/<huella>-1600.webp` | La portada en escritorio es la vista principal; el de 2400 px solo lo pide una pantalla ancha |
| Marca | `brands.image_path` | `brands/<brand_id>/<huella>-800.**jpg**` | Excepción de fiabilidad, v1.4.0 — ver abajo |
| Imagen de marca | `brand_images.file_path` | `brands/<brand_id>/<huella>-800.**jpg**` | Misma excepción que el logotipo, mismo espacio de nombres |
| Historia | `store_settings.about_image_path` | `store/<huella>-1600.webp` | La sección ocupa media pantalla en escritorio (v1.1.0) |

En todos los casos el canónico es el **intermedio** cuando hay tres, y el mayor
cuando hay dos: es el que más se sirve, y los otros se deducen del nombre.

**Excepción `brands` (v1.4.0):** el logotipo y el collage de marca publican el
respaldo JPEG como canónico, no WebP, pese a que el respaldo (§17.1.3) nace
pensado como *fallback* de compatibilidad, no como formato principal. El WebP
con alfa se sigue generando —queda en disco, `JPEG_CANONICAL_NAMESPACES` en
`local_storage.py`— pero se encontró en producción una franja real de
navegadores (confirmado con Brave, aceleración por GPU) que decodifican mal
el canal alfa de WebP y muestran el logotipo como un rectángulo negro sólido.
El archivo es válido —confirmado con Pillow y con otro motor de renderizado—:
es un problema del decodificador del cliente, no del dato, y no tiene arreglo
del lado del servidor. El JPEG no tiene canal alfa, así que no hay nada que
decodificar mal. Se acota a `brands` porque hoy es el único espacio cuyo
contenido son casi siempre logotipos con transparencia real mostrados sobre
fondo claro (`MediaTile`, tono `light` en todos sus usos desde v1.4.0 — ver
`09_COMPONENTES.md`), donde el respaldo compuesto sobre blanco (§15.6) se ve
idéntico al WebP. Si en el futuro se necesita un logotipo sobre fondo oscuro,
hay que revisar esta decisión, no reintroducir WebP sin más.

`ImageDTO.image_url` (`05_API.md` §10.6), `BannerDTO.image_url` (§10.3) y
`BannerAdminDTO.image_url` (§10.3) son la URL pública del canónico
correspondiente. **Los contratos no cambian**: siguen siendo un campo único.

## 17.1.7 Construcción de `srcset`

El frontend arma las imágenes adaptativas de `06_FRONTEND.md` §577 y
`02_ARQUITECTURA.md` §15.7 sustituyendo el sufijo de ancho en la URL canónica,
usando los anchos de §17.1.2 que correspondan al espacio de nombres de la ruta.
Esta convención es **pública y estable**: forma parte del contrato entre backend
y frontend, y no puede cambiarse sin actualizar esta sección.

Para el respaldo en JPEG se sustituye además la extensión, dentro de un
elemento `<picture>`.

## 17.1.8 Reglas

| # | Regla |
|---|---|
| 1 | Los anchos y formatos de cada espacio son un conjunto cerrado. Añadir uno exige modificar esta sección. |
| 2 | Si falla la generación de **cualquier** derivado, falla la carga completa (§15.4). No se registra una fila cuyos derivados no existen. |
| 3 | La huella se calcula sobre el contenido del original. Dos cargas idénticas producen el mismo nombre. |
| 4 | Los derivados son caché regenerable (`AD-38`); el original nunca se sirve. |
| 5 | Un espacio de nombres nuevo exige ampliar §17.1.1 y §17.1.2 antes de escribir código. |

---

# 18. Trazabilidad

| Elemento aprobado | Se respeta en |
|---|---|
| `00.3_NOMENCLATURA.md` | Convenciones de nombres en código, commits, tests. |
| `01_ANALISIS_NEGOCIO.md` | Reglas de negocio inmutables; no se inventan nuevas. |
| `02_ARQUITECTURA.md` | Límites arquitectónicos; no se introducen componentes nuevos. |
| `03_SEGURIDAD.md` | Headers, secretos, permisos, validaciones. |
| `04_BASE_DATOS.md` | Modelo de datos y reglas de migración. |
| `05_API.md` | Contratos de API; endpoints, DTOs y respuestas. |
| `06_FRONTEND.md` / `07_PANEL_ADMIN.md` | Estructura de carpetas y páginas. |
| `08_UI_SYSTEM.md` / `09_COMPONENTES.md` | Componentes y estilos reutilizables. |
| `10_BACKEND.md` | Capas, DTOs, mappers, servicios, configuración. |
| `11_TESTING.md` | Tipos, ubicaciones y convenciones de tests. |
| `12_DEPLOY.md` | Entornos, variables de entorno, health checks. |

---

# 19. Glosario de acciones para la IA

| Acción | Significado |
|---|---|
| **Leer** | Cargar el documento en contexto antes de actuar. |
| **Implementar** | Escribir código dentro de las fronteras aprobadas. |
| **Solicitar aprobación** | Pausar la tarea y pedir intervención humana. |
| **Registrar duda** | Documentar una incertidumbre sin asumir. |
| **Verificar** | Ejecutar tests, linting y checks antes de entregar. |
| **Prohibido** | Acción que la IA no debe realizar bajo ninguna circunstancia. |

---

# 20. Ejemplo de interacción completa

### Prompt del usuario

```markdown
## Contexto
Necesito agregar un campo "destacado" a los productos y mostrar los productos destacados primero en el catálogo.

## Documentos de referencia
- docs/04_BASE_DATOS.md
- docs/05_API.md
- docs/06_FRONTEND.md
- docs/10_BACKEND.md
- docs/11_TESTING.md

## Alcance
- Agregar columna booleana `destacado` a `products`.
- Modificar el endpoint de listado para ordenar destacados primero.
- Mostrar un badge "Destacado" en las tarjetas del catálogo.

## Criterios de aceptación
- [ ] Los productos destacados aparecen primero en /catalogo.
- [ ] El badge se muestra solo en productos destacados.
- [ ] Tests de integración y componente pasan.

## Restricciones
- No modificar `04_BASE_DATOS.md`, `05_API.md` ni `06_FRONTEND.md` sin aprobación.
- No crear nuevos componentes del UI System; reutilizar los existentes.
```

### Respuesta esperada del agente

```markdown
He completado la tarea. Resumen:

## Cambios realizados
- Migración `20260809_001_agregar_destacado_a_products.py` (reversible).
- Actualización de `ProductRepository.listar()` para ordenar por `destacado DESC`.
- Actualización de `ProductoResponseDTO` y mapper.
- Modificación de `ProductCard.tsx` para mostrar badge usando `Badge` del UI System.
- Tests de integración y componente agregados.

## Verificaciones
- [x] Tests pasan: `pytest backend/tests/integration/test_products.py`
- [x] Tests de componente pasan: `npm test ProductCard`
- [x] Linting sin errores.
- [x] No se modificaron documentos de definición.
- [x] No se agregaron secretos.

## Notas
- El campo se agregó con `server_default='false'` para mantener integridad.
- No se crearon nuevos componentes del UI System.
```

---

# 21. Historial de cambios

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| **1.4.0** | 18/08/2026 | 🟡 EN REVISIÓN | **§17.1.6 — excepción de fiabilidad para `brands`.** El logotipo y el collage de marca (`brands.image_path`, `brand_images.file_path`) pasan a publicar el respaldo JPEG como canónico en vez de WebP. El WebP con alfa se sigue generando pero deja de ser el que se sirve. Motivo: se encontró en producción una franja real de navegadores (confirmado con Brave, aceleración por GPU) que decodifican mal el canal alfa de WebP y muestran el logotipo como un rectángulo negro sólido — el archivo es válido, confirmado con Pillow y con otro motor de renderizado; es un problema del decodificador del cliente. Se acota a `brands` porque hoy es el único espacio con este tipo de contenido (logotipos de transparencia real, siempre sobre fondo claro tras retirar `tone="inverse"` de `MegaMenu`/drawer móvil, `09_COMPONENTES.md`). `local_storage.py`: nuevo `JPEG_CANONICAL_NAMESPACES`. Reportado por el usuario como *"al subir estos aparecen con fondo negro"*, diagnosticado en vivo comparando WebP lossy, WebP lossless y JPEG en su navegador. |
| **1.0.0** | 09/08/2026 | ✅ APROBADO | Guía formal de desarrollo con IA: orden de lectura, archivos permitidos/prohibidos, migraciones, endpoints, DTOs, mappers, componentes React, tests, commits, DoD, prompts, checklist final, manejo de documentación insuficiente y decisiones `AI-01` a `AI-05`. |
| **1.1.0** | 10/08/2026 | ✅ APROBADO | **Decisión `AI-06` y §17.1: convención de imágenes derivadas.** Fija los tres anchos de `02_ARQUITECTURA.md` §15.5 —Miniatura 400 px, Catálogo 800 px, Detalle 1600 px, altura proporcional—, los formatos WebP y respaldo JPEG (§15.6), la nomenclatura `<huella>-<ancho>.<formato>` (§15.3 regla 3), la ubicación en ramas separadas (§15.2), el derivado canónico que almacena `images.file_path` y la construcción de `srcset` como convención pública. Cierra `ADP-16`. **Materializa §15; no altera arquitectura congelada.** |
| **1.3.0** | 13/08/2026 | ✅ APROBADO | **§17.1 ampliada a cuatro espacios de nombres.** La portada administrable (`04_BASE_DATOS.md` v1.1.0) suma dos consumidores de imágenes que no tenían ubicación: el logotipo y el collage de marca, y la foto de «Nuestra historia». Se añaden los espacios `brands` —agrupado por identificador de marca, como productos, porque logotipo y collage pertenecen a la misma marca— y `store` —plano, con un solo consumidor—. `brands` usa 400/800/1600 px y canónico de 800 px; `store` usa 800/1600 px y canónico de 1600 px. La regla 5 de §17.1.8 queda satisfecha: los espacios se declaran acá **antes** de escribir código. Nginx no cambia: ambos cuelgan de `derivatives/`, que ya se publicaba. |
| **1.2.0** | 11/08/2026 | ✅ APROBADO | **§17.1 ampliada a dos espacios de nombres.** `02_ARQUITECTURA.md` §15 agrupa las imágenes por producto, pero los banners (`RN-73`) también cargan imagen y carecían de ubicación. Se añade el espacio `banners` junto a `products`, con anchos propios —800, 1600 y 2400 px, mayores porque una pieza de portada se muestra a ancho completo— y canónico `banners/<huella>-1600.webp`. Las rutas de producto pasan a `products/<product_id>/…` por simetría. Nginx no cambia: ambos espacios cuelgan de `derivatives/`, que ya publicaba. `AI-06` amplía su alcance sin alterar arquitectura congelada. |

---
