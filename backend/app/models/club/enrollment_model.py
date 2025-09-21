from __future__ import annotations
import datetime as dt
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.mysql import BIGINT, ENUM as MySQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from extensions import db

ENROLL_STATUS = ("PENDING", "CONFIRMED", "CANCELLED", "ATTENDED", "NO_SHOW")

class Enrollment(db.Model):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "club_id", name="uq_enrollments_user_club"),
        Index("idx_enrollments_club", "club_id"),
        Index("idx_enrollments_club_status", "club_id", "status"),
    )

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)

    # Typ zuerst, dann ForeignKey:
    user_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    club_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("clubs.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        MySQLEnum(*ENROLL_STATUS, name="enroll_status"),
        nullable=False,
        default="CONFIRMED",
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=db.func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="enrollments")
    club: Mapped["Club"] = relationship("Club", back_populates="enrollments")
    review: Mapped[Optional["Review"]] = relationship(
        "Review", back_populates="enrollment", uselist=False, cascade="all, delete-orphan"
    )
    audit_entries: Mapped[List["EnrollmentAudit"]] = relationship(
        "EnrollmentAudit", back_populates="enrollment", cascade="all, delete-orphan"
    )
