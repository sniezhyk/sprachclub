from __future__ import annotations
from typing import Optional

from sqlalchemy import Text, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db  # passt für dein Start-Setup (src/app)

class Host(db.Model):
    __tablename__ = "hosts"

    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )
    bio: Mapped[Optional[str]] = mapped_column(Text)

    user: Mapped["User"] = relationship("User", back_populates="host_profile")

    def __repr__(self) -> str:
        return f"<Host user_id={self.user_id}>"
