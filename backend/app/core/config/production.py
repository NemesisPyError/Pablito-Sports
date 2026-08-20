"""Production environment configuration."""

import os

from .base import BaseConfig, ConfigError

# 03_SEGURIDAD.md §18.2: valores de ejemplo que jamás deben firmar sesiones ni
# tokens CSRF reales. Arrancar producción con cualquiera de ellos es un fallo de
# despliegue, no una advertencia.
_PLACEHOLDER_SECRETS = frozenset(
    {"", "cambiar-en-cada-entorno", "change-me", "changeme", "secret", "placeholder"}
)

# Un `SECRET_KEY` corto es forjable por fuerza bruta. §18.2 pide generarlo con
# `secrets.token_urlsafe(64)`, que produce ~86 caracteres; se exige un mínimo
# holgado sin atarlo a esa longitud exacta.
_MIN_SECRET_KEY_LENGTH = 32


class ProductionConfig(BaseConfig):
    ENV_NAME = "production"
    DEBUG = False
    TESTING = False
    # RNF-12: HTTPS is mandatory, so the session cookie is always Secure.
    SESSION_COOKIE_SECURE = True

    @classmethod
    def validate(cls) -> None:
        """Además de las obligatorias (CFG-02), rechaza secretos de ejemplo.

        La aplicación se **niega a arrancar** en producción con un `SECRET_KEY`
        placeholder o demasiado corto: firma las sesiones de servidor y los
        tokens CSRF, de modo que un valor conocido o débil los vuelve forjables.
        """
        super().validate()

        secret = os.environ.get("SECRET_KEY", "")
        if secret.lower() in _PLACEHOLDER_SECRETS or len(secret) < _MIN_SECRET_KEY_LENGTH:
            raise ConfigError(
                "SECRET_KEY must be a strong, unique value in production "
                f"(at least {_MIN_SECRET_KEY_LENGTH} characters and not a placeholder). "
                'Generate it with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
