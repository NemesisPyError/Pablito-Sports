"""Base configuration shared by every environment.

CFG-01: only `core/config` reads environment variables (AD-11).
CFG-02: required values are validated at startup; the app refuses to boot without them.
CFG-04: a value is declared once, in one place.
"""

import os


class ConfigError(RuntimeError):
    """Raised when the environment does not provide a required configuration value."""


class BaseConfig:
    ENV_NAME = "base"

    # CFG-02: every name listed here must be present or the application will not start.
    REQUIRED_VARS = ("SECRET_KEY", "DATABASE_URL", "UPLOAD_FOLDER", "LOG_LEVEL")

    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 03_SEGURIDAD.md §16.3 (S-10). Sin esto, SQLAlchemy incrusta los valores de
    # la sentencia en el mensaje de la excepción (`[parameters: (...)]`), y ese
    # mensaje termina en el traceback que `handle_unexpected_exception` registra.
    # Comprobado antes de corregirlo: un `IntegrityError` al dar de alta un
    # administrador escribía su `password_hash` completo en el log, y lo mismo
    # habría pasado con la fila de sesión de Flask-Session (que lleva el token
    # CSRF). Se activa en TODOS los entornos, no solo en producción: los logs de
    # desarrollo se archivan igual y la base local también tiene datos reales.
    # Coste asumido: un fallo de base de datos ya no dice con qué valores ocurrió;
    # queda la sentencia y el nombre de la restricción, que es lo que se necesita
    # para diagnosticarlo.
    SQLALCHEMY_ENGINE_OPTIONS = {"hide_parameters": True}

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER")
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # 03_SEGURIDAD.md §14.2: número de proxies de confianza situados delante de
    # Flask. La IP real, el esquema y el host se toman **solo** de esa cantidad
    # de saltos en `X-Forwarded-*`; un valor enviado por un cliente arbitrario
    # nunca se cree. Topología actual (Nginx → Flask): 1. Con Cloudflare delante
    # (Cloudflare → Nginx → Flask) pasa a 2. `0` desactiva ProxyFix.
    TRUSTED_PROXY_COUNT = int(os.environ.get("TRUSTED_PROXY_COUNT", "1"))

    # Origen público del sitio, para las URL absolutas que exigen Open Graph y
    # el sitemap. Opcional: sin él se reconstruye de las cabeceras que reenvía
    # Nginx. Se declara para poder fijarlo cuando el dominio público no coincide
    # con el `Host` que llega al backend.
    SITE_BASE_URL = os.environ.get("SITE_BASE_URL")

    # 03_SEGURIDAD.md §7.1 and SEG-01.
    SESSION_COOKIE_NAME = "session"
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "True") == "True"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    SESSION_COOKIE_PATH = "/api/v1/admin"
    PERMANENT_SESSION_LIFETIME = 43200  # 12 hours, absolute expiry (SEG-01)

    # AD-37: server-side session, not a self-contained token. Flask's default
    # cookie holds the payload itself, which is exactly what AD-37 rejects.
    # 10_BACKEND.md §12 fixes the backend and the table name.
    SESSION_TYPE = "sqlalchemy"
    SESSION_SQLALCHEMY_TABLE = "sessions"
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True

    # SEG-01: 30 minutes of inactivity closes the session (RF-28). The absolute
    # 12-hour expiry is enforced separately by the auth service.
    SESSION_IDLE_TIMEOUT = 1800

    # 03_SEGURIDAD.md §8: CSRF token on every panel write.
    WTF_CSRF_ENABLED = True
    WTF_CSRF_HEADERS = ["X-CSRF-Token"]
    WTF_CSRF_TIME_LIMIT = None

    # 03_SEGURIDAD.md §14.1: límites por endpoint.
    RATELIMIT_ENABLED = True

    # §14.4: el contador tiene que ser el MISMO para todos los workers.
    # `memory://` lo guarda dentro del proceso, así que con N workers de
    # Gunicorn el límite efectivo pasa a ser N veces el declarado —el login de
    # «5 intentos cada 15 minutos» admitía 10 con los 2 workers de desarrollo— y
    # además se pierde entero en cada reinicio del backend.
    #
    # La URI llega del entorno para que cada despliegue apunte a su propio
    # almacén. El valor por defecto sirve solo para arrancar el backend suelto,
    # sin Compose: `ProductionConfig.validate` se niega a arrancar con él.
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    # Sin vuelta atrás silenciosa. Si el almacén compartido no responde, el
    # límite debe fallar de forma visible y no dejar pasar las peticiones sin
    # contarlas: un contador que se cae solo y nadie ve es peor que no tenerlo.
    RATELIMIT_IN_MEMORY_FALLBACK_ENABLED = False
    RATELIMIT_SWALLOW_ERRORS = False

    # 05_API.md §4: field order in the envelope is not part of the contract, but a
    # stable order keeps logged responses diffable.
    JSON_SORT_KEYS = False

    # 03_SEGURIDAD.md §11.1: 5 MB per uploaded file.
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    # -----------------------------------------------------------------------
    # Cloudflare Turnstile — verificación humana en el acceso a la tienda.
    #
    # Ninguna de las dos es obligatoria (`REQUIRED_VARS` no las lista): sin
    # `TURNSTILE_SECRET_KEY` el backend no puede llamar a `siteverify`, así que
    # `TurnstileService.enabled()` desactiva el gate entero en vez de inventar
    # una clave o fallar — es la "configuración explícita de desarrollo"
    # pedida por el usuario. La clave pública (`TURNSTILE_SITE_KEY`) solo la
    # necesita el frontend (variable `VITE_TURNSTILE_SITE_KEY`, ver
    # `docker-compose.yml`); se declara acá también porque `validate()` la usa
    # para detectar una configuración a medias.
    #
    # La secreta jamás sale de este proceso: solo la usa `TurnstileService` al
    # llamar a Cloudflare desde el servidor.
    # -----------------------------------------------------------------------
    TURNSTILE_SITE_KEY = os.environ.get("TURNSTILE_SITE_KEY", "")
    TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
    TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

    # Cookie propia, NO la sesión de Flask-Session: esa vive en
    # `SESSION_COOKIE_PATH = "/api/v1/admin"` (arriba) y nunca llegaría a una
    # petición pública. Ámbito acotado exactamente a las dos rutas que la usan
    # (`api/v1/public/turnstile.py`) — no `/api/v1` entero, que sería prefijo
    # también de `/api/v1/admin` — para que ni siquiera comparta ruta con el
    # panel ni viaje en peticiones que no la necesitan.
    TURNSTILE_COOKIE_NAME = "pablito_turnstile"
    TURNSTILE_COOKIE_PATH = "/api/v1/turnstile"
    # 24 horas: alcanza para una visita normal sin pedir la verificación en
    # cada carga (pedido explícito del usuario), y no es tan larga como para
    # que una verificación vieja siga sirviendo semanas después.
    TURNSTILE_COOKIE_MAX_AGE = 60 * 60 * 24

    @classmethod
    def validate(cls) -> None:
        """Fail fast when a required environment variable is missing (CFG-02)."""
        missing = [name for name in cls.REQUIRED_VARS if not os.environ.get(name)]
        if missing:
            raise ConfigError(
                "Missing required environment variables: " + ", ".join(sorted(missing))
            )

        # Turnstile es opcional en todo entorno, pero NO a medias: una sola de
        # las dos claves puesta es casi siempre un error de configuración (la
        # otra se olvidó), y con ella el gate quedaría en un estado que ni
        # sirve al frontend ni verifica nada en el backend.
        tiene_site_key = bool(os.environ.get("TURNSTILE_SITE_KEY", "").strip())
        tiene_secret_key = bool(os.environ.get("TURNSTILE_SECRET_KEY", "").strip())
        if tiene_site_key != tiene_secret_key:
            raise ConfigError(
                "TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must both be set or both be "
                "left empty (Turnstile is optional, but half-configured is not a valid state)"
            )
