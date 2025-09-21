"""
core-Paket:
- Stellt Level (Sprachniveau) bereit.
"""
from typing import TYPE_CHECKING

__all__ = ("Level",)

if TYPE_CHECKING:
    from .level_model import Level  # type: ignore

def __getattr__(name: str):
    if name == "Level":
        from .level_model import Level
        return Level
    raise AttributeError(f"module 'models.core' has no attribute {name!r}")
