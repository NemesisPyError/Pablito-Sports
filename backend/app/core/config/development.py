"""Development environment configuration."""

from .base import BaseConfig


class DevelopmentConfig(BaseConfig):
    ENV_NAME = "development"
    DEBUG = True
    TESTING = False
    # No HTTPS in local development; the cookie would never be sent otherwise.
    SESSION_COOKIE_SECURE = False
