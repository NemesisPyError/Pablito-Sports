"""Flask extension instances.

Extensions are declared here and initialised inside the application factory
(10_BACKEND.md §6). Nothing in this module touches the application at import time.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from sqlalchemy import MetaData

# Deterministic constraint names so Alembic can autogenerate and, above all,
# downgrade them (04_BASE_DATOS.md §11.2, rule 2). Indexes declared explicitly in
# the models keep the `idx_*` names published in §9.6.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

db = SQLAlchemy(metadata=MetaData(naming_convention=NAMING_CONVENTION))
migrate = Migrate()

# AD-37: la sesión vive en el servidor; la cookie solo transporta su identificador.
server_session = Session()

# 03_SEGURIDAD.md §8: token CSRF en los métodos de escritura del panel.
csrf = CSRFProtect()

# 03_SEGURIDAD.md §14: límite por IP en la API pública y en el login.
limiter = Limiter(
    key_func=get_remote_address,
    # §14.1: API pública 100 peticiones por minuto por IP.
    default_limits=["100 per minute"],
)
