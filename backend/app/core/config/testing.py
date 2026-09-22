"""Testing environment configuration."""

import os
import tempfile

from .base import BaseConfig


class TestingConfig(BaseConfig):
    ENV_NAME = "testing"
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL")
    # La suite carga imágenes de verdad. Sin esto escribiría en el volumen
    # persistente que comparte con desarrollo, ensuciándolo en cada ejecución
    # (11_TESTING.md §14.3: los datos de prueba no contaminan otros entornos).
    UPLOAD_FOLDER = os.environ.get(
        "TEST_UPLOAD_FOLDER", os.path.join(tempfile.gettempdir(), "pablito-test-uploads")
    )
    SESSION_COOKIE_SECURE = False
    # 10_BACKEND.md §12: CSRF is disabled so tests can exercise write endpoints.
    # Its behaviour is covered by dedicated tests that re-enable it.
    WTF_CSRF_ENABLED = False
    # Rate limiting would make the suite order-dependent; §14 is verified by
    # dedicated tests that turn it back on.
    RATELIMIT_ENABLED = False

    # Los tests que sí lo encienden necesitan un almacén propio: comparten
    # proceso con el resto de la suite y `limiter.reset()` vacía lo que
    # encuentre. Apuntan a otra base del mismo Redis (`/1` en Compose) para no
    # borrar los contadores reales de desarrollo. Sin la variable se queda en
    # `memory://`, de modo que la suite sigue corriendo sin Redis delante — los
    # tests que exigen almacén compartido se saltan solos en ese caso.
    RATELIMIT_STORAGE_URI = os.environ.get("TEST_RATELIMIT_STORAGE_URI", "memory://")

    REQUIRED_VARS = ("SECRET_KEY", "TEST_DATABASE_URL", "UPLOAD_FOLDER", "LOG_LEVEL")
