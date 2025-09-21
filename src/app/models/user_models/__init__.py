"""
user_models-Paket:
- Stellt User und Host bereit.
- Lazy Re-Exports, damit from models.user_models import User, Host funktioniert.
"""
from typing import TYPE_CHECKING

__all__ = ("User", "Host")

if TYPE_CHECKING:
    from .user_model import User  # type: ignore
    from .host_model import Host  # type: ignore

def __getattr__(name: str):
    if name == "User":
        from .user_model import User
        return User
    if name == "Host":
        from .host_model import Host
        return Host
    raise AttributeError(f"module 'models.user_models' has no attribute {name!r}")
