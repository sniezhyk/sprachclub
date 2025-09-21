# models/club/enrollment_audit_model.py
from __future__ import annotations
import datetime as dt
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.mysql import BIGINT, ENUM as MySQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from extensions import db

class EnrollmentAudit(db.Model):
    __tablename__ = "enrollment_audit"
    __table_args__ = (Index("idx_audit_enrollment", "enrollment_id"),)

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)

    # Typ zuerst, dann ForeignKey:
    enrollment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("enrollments.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        MySQLEnum("INSERT", "UPDATE", "DELETE", name="audit_action"),
        nullable=False,
    )
    old_status: Mapped[Optional[str]] = mapped_column(String(16))
    new_status: Mapped[Optional[str]] = mapped_column(String(16))

    changed_by: Mapped[Optional[int]] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    changed_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=db.func.current_timestamp(), nullable=False
    )

    enrollment: Mapped["Enrollment"] = relationship("Enrollment", back_populates="audit_entries")
    changed_by_user: Mapped[Optional["User"]] = relationship("User")
