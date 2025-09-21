from __future__ import annotations
import datetime as dt
from typing import Optional

from sqlalchemy import Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db

class Review(db.Model):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("enrollment_id", name="uq_reviews_enrollment"),)

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)

    # Typ zuerst, dann ForeignKey:
    enrollment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("enrollments.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    # 1..5 → TINYINT reicht völlig
    rating: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)

    comment: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=db.func.current_timestamp(), nullable=False
    )

    enrollment: Mapped["Enrollment"] = relationship("Enrollment", back_populates="review")

