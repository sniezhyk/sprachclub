"""
club-Paket:
- Stellt Club, Enrollment, EnrollmentAudit, Review, Wishlist bereit.
"""
from typing import TYPE_CHECKING

__all__ = ("Club", "Enrollment", "EnrollmentAudit", "Review", "Wishlist")

if TYPE_CHECKING:
    from .club_model import Club  # type: ignore
    from .enrollment_model import Enrollment  # type: ignore
    from .enrollment_audit_model import EnrollmentAudit  # type: ignore
    from .review_model import Review  # type: ignore
    from .wishlist_model import Wishlist  # type: ignore

def __getattr__(name: str):
    if name == "Club":
        from .club_model import Club
        return Club
    if name == "Enrollment":
        from .enrollment_model import Enrollment
        return Enrollment
    if name == "EnrollmentAudit":
        from .enrollment_audit_model import EnrollmentAudit
        return EnrollmentAudit
    if name == "Review":
        from .review_model import Review
        return Review
    if name == "Wishlist":
        from .wishlist_model import Wishlist
        return Wishlist
    raise AttributeError(f"module 'models.club' has no attribute {name!r}")
