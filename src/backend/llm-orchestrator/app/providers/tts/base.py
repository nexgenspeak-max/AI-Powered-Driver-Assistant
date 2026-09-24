from abc import ABC, abstractmethod
from app.config.settings import Settings


class BaseTTS(ABC):
    """Abstract base for all TTS provider implementations."""

    @classmethod
    @abstractmethod
    def create(cls, settings: Settings):
        """Instantiate and return a configured LiveKit TTS plugin."""
        ...
