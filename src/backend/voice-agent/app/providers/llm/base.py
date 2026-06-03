from abc import ABC, abstractmethod
from app.config.settings import Settings


class BaseLLM(ABC):
    """Abstract base for all LLM provider implementations."""

    @classmethod
    @abstractmethod
    def create(cls, settings: Settings):
        """Instantiate and return a configured LiveKit LLM plugin."""
        ...
