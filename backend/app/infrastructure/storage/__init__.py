"""Image storage backends."""

from .local_storage import LocalStorage
from .storage_interface import StorageInterface

__all__ = ["LocalStorage", "StorageInterface"]
