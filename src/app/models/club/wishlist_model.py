from __future__ import annotations
import datetime as dt

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db

class Wishlist(db.Model):
    __tablename__ = "wishlists"

    # Typ zuerst, dann ForeignKey, dann weitere Flags
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )
    club_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("clubs.id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=db.func.current_timestamp(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="wishlist_items")
    club: Mapped["Club"] = relationship("Club", back_populates="wishlist_entries")

