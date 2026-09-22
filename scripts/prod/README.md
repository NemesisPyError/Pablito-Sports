# scripts/prod — operación de producción (Fase 0)

Scripts para `docker-compose.prod.yml`. **Fase 0 = preparación**: se prueban en
local con certificado autofirmado; el despliegue en un VPS real es una fase
posterior.

En Windows/Git-Bash (`core.filemode=false`) invocar con `bash`:

```bash
bash scripts/prod/<script>.sh
```

## Preparación (una vez)

```bash
cp .env.production.example .env.production      # y completar TODOS los valores
bash nginx/certs/generate-selfsigned.sh localhost   # solo para prueba local
```

## Ciclo

| Script | Qué hace |
|---|---|
| `build.sh` | Compila el SPA a `frontend/dist/` (contenedor Node efímero) + construye la imagen del backend (`requirements/prod.txt`, tag = SHA de git). |
| `deploy.sh` | Recreate (12_DEPLOY.md §12): `backup-db` → `migrate` (`flask db upgrade`) → `up -d` → espera `/health/ready` estable → smoke tests HTTPS. Falla → `rollback`. |
| `backup-db.sh` | `pg_dump -Fc` a `./backups/`. Escribe a un temporal y valida antes de renombrar: una falla no deja un `.dump` vacío o cortado. Recordar copia off-site. |
| `backup-uploads.sh` | Empaqueta `originals/` (las fotos de productos, banners y marcas) a `./backups/pablito-originals-*.tar.gz`. Los derivados no van: se regeneran con `scripts/rebuild_image_derivatives.py`. Sin este respaldo, restaurar la base tras perder el servidor deja el catálogo sin fotos. Recordar copia off-site. |
| `restore-db.sh <dump> [db]` | `pg_restore`. Sin `db` → sobre producción (pide confirmación). Con `db` → base de prueba. |
| `verify-backup.sh <dump> [originals.tar.gz]` | Restaura a una base efímera + chequeos de humo + limpia (también si falla). Falla si el dump no trae administradores; avisa si no trae productos. Con el segundo argumento valida además el respaldo de imágenes. Semanal (§13.2). |
| `rollback.sh <IMAGE_TAG_anterior>` | Redeploy de la imagen anterior + guía para la base de datos. |

## Variables

- `ENV_FILE` (por defecto `.env.production`)
- `IMAGE_TAG` (por defecto SHA corto de git, o `latest`)
- `BACKUP_DIR` (por defecto `./backups`)

## Migraciones

**Nunca automáticas.** El servicio `migrate` tiene `profiles: ["tools"]` y solo
corre cuando `deploy.sh` (o el operador) lo invoca con `run --rm migrate`.
Migraciones destructivas/irreversibles: aprobación explícita + backup verificado
(12_DEPLOY.md §12, §13).
