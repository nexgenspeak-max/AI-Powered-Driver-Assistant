from abc import ABC, abstractmethod
from app.config.settings import Settings


class BaseSTT(ABC):
    """Abstract base for all STT provider implementations."""

    @classmethod
    @abstractmethod
    def create(cls, settings: Settings):
        """Instantiate and return a configured LiveKit STT plugin."""
        ...
