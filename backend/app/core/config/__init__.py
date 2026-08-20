"""Environment configuration registry.

The active configuration is selected with FLASK_ENV (12_DEPLOY.md §14.1).
"""

import os

from .base import BaseConfig, ConfigError
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig

CONFIG_BY_ENV = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

DEFAULT_ENV = "development"


def get_config(env_name: str | None = None) -> type[BaseConfig]:
    """Returns the configuration class for the given environment name.

    Raises ConfigError if the environment name is unknown.
    """
    name = env_name or os.environ.get("FLASK_ENV", DEFAULT_ENV)
    try:
        return CONFIG_BY_ENV[name]
    except KeyError:
        raise ConfigError(
            f"Unknown FLASK_ENV '{name}'. Expected one of: " + ", ".join(sorted(CONFIG_BY_ENV))
        ) from None


__all__ = [
    "BaseConfig",
    "ConfigError",
    "DevelopmentConfig",
    "ProductionConfig",
    "TestingConfig",
    "CONFIG_BY_ENV",
    "get_config",
]
