"""PostgreSQL technical details (10_BACKEND.md §8.11).

Holds the connectivity and schema-state probes used by readiness. It contains no
business logic and no data access: repositories own that.
"""

import logging

from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from flask import current_app
from sqlalchemy import text

from ..extensions import db

logger = logging.getLogger("app.infrastructure.database")


def check_connection() -> bool:
    """Runs a trivial query to prove the PostgreSQL connection is usable."""
    try:
        db.session.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001 - readiness reports a boolean, never a stacktrace
        logger.exception("database connectivity check failed")
        return False
    finally:
        db.session.remove()


def check_schema_is_current() -> bool:
    """Compares the revision applied in the database with the head on disk.

    Returns False when the deployed code expects a schema the database does not
    have (12_DEPLOY.md §10.2, §17).
    """
    try:
        script = ScriptDirectory(str(current_app.extensions["migrate"].directory))
        expected = set(script.get_heads())
        with db.engine.connect() as connection:
            applied = set(MigrationContext.configure(connection).get_current_heads())
        return applied == expected
    except Exception:  # noqa: BLE001
        logger.exception("schema revision check failed")
        return False
