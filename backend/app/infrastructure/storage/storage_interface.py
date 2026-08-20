"""Storage abstraction (PA-12).

Services depend on this interface, never on a concrete backend. Moving to S3 or
Cloudinary later only replaces the implementation under `infrastructure/`.
"""

from abc import ABC, abstractmethod


class StorageInterface(ABC):
    """Contract every image storage backend must satisfy."""

    @abstractmethod
    def is_writable(self) -> bool:
        """Returns True when the backend accepts a write-read-delete round trip."""
        raise NotImplementedError

    @abstractmethod
    def save(self, file_storage, *, product_id: int) -> str:
        """Persists an uploaded image and returns its stored relative path.

        La ruta devuelta es la del derivado canónico, relativa a la rama que
        Nginx publica; es lo que viaja a `images.file_path`. El original queda
        fuera de toda ruta pública (`AD-38`, 02_ARQUITECTURA.md §15.2).
        """
        raise NotImplementedError
