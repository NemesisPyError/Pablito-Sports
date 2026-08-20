# tests/

Pruebas transversales al repositorio (E2E y smoke) según `docs/11_TESTING.md`.

| Ubicación | Alcance | Documento |
|---|---|---|
| `backend/tests/unit/` | Servicios, repositorios, mappers, validators, core. | `11_TESTING.md` §12, `99_AI_DEVELOPMENT_GUIDE.md` §12.1 |
| `backend/tests/integration/` | API y servicios contra PostgreSQL de pruebas. | `11_TESTING.md` §12 |
| `frontend/src/**/*.test.jsx` | Componentes y hooks. | `99_AI_DEVELOPMENT_GUIDE.md` §12.1 |
| `tests/` (esta carpeta) | E2E y smoke tests que cruzan frontend y backend. | `11_TESTING.md` §20.2, `12_DEPLOY.md` §11 |

En la Fase 0 esta carpeta queda creada y vacía: los flujos E2E se escriben a
partir de la Fase 4, cuando existe un recorrido completo que probar.
