"""
Zentrales Entry-Point-Modul für alle ORM-Modelle.
- register_models(): einmal aufrufen (z. B. in app.py) damit SQLAlchemy alle
  Tabellen registriert, bevor create_all() / Alembic läuft.
- Lazy Re-Exports: from models import User, Club, ... funktioniert ohne
  harte Imports beim Modul-Laden (vermeidet Zirkularität).
"""

from typing import TYPE_CHECKING

from extensions import login_manager  # <--- hinzugefügt

__all__ = (
    # user_models
    "User", "Host",
    # core
    "Level",
    # club
    "Club", "Enrollment", "EnrollmentAudit", "Review", "Wishlist",
    # helper
    "register_models",
)

def register_models() -> None:
    """
    Späte, einmalige Registrierung aller Modell-Module.
    Wichtig: in app.py vor db.create_all() / Alembic aufrufen.
    """
    # Importe sind absichtlich innerhalb der Funktion, um zirkulare Importe zu vermeiden.
    from .user_models import user_model, host_model  # noqa: F401
    from .core import level_model                    # noqa: F401
    from .club import (
        club_model, enrollment_model, enrollment_audit_model,
        review_model, wishlist_model
    )  # noqa: F401

# ---- Lazy Re-Exports für bequeme Imports ----
if TYPE_CHECKING:
    from .user_models.user_model import User  # type: ignore
    from .user_models.host_model import Host  # type: ignore
    from .core.level_model import Level       # type: ignore
    from .club.club_model import Club         # type: ignore
    from .club.enrollment_model import Enrollment  # type: ignore
    from .club.enrollment_audit_model import EnrollmentAudit  # type: ignore
    from .club.review_model import Review     # type: ignore
    from .club.wishlist_model import Wishlist # type: ignore

def __getattr__(name: str):
    if name == "User":
        from .user_models.user_model import User
        return User
    if name == "Host":
        from .user_models.host_model import Host
        return Host
    if name == "Level":
        from .core.level_model import Level
        return Level
    if name == "Club":
        from .club.club_model import Club
        return Club
    if name == "Enrollment":
        from .club.enrollment_model import Enrollment
        return Enrollment
    if name == "EnrollmentAudit":
        from .club.enrollment_audit_model import EnrollmentAudit
        return EnrollmentAudit
    if name == "Review":
        from .club.review_model import Review
        return Review
    if name == "Wishlist":
        from .club.wishlist_model import Wishlist
        return Wishlist
    raise AttributeError(f"module 'models' has no attribute {name!r}")

# ---- Flask-Login user_loader ----
@login_manager.user_loader
def load_user(user_id: str):
    from .user_models.user_model import User  # Import hier, um Zirkularität zu vermeiden
    try:
        return User.query.get(int(user_id))
    except Exception:
        return None

