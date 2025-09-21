from __future__ import annotations
import datetime as dt
from typing import Optional, List

from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.mysql import BIGINT, SMALLINT, INTEGER, CHAR, ENUM as MySQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from extensions import db

CLUB_STATUS = ("SCHEDULED", "CANCELED", "COMPLETED")

class Club(db.Model):
    __tablename__ = "clubs"
    __table_args__ = (
        Index("idx_clubs_starts_at", "starts_at"),
        Index("idx_clubs_level", "level_code"),
        Index("idx_clubs_search", "status", "level_code", "starts_at"),
    )

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Typ zuerst, dann ForeignKey:
    level_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("levels.code", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    host_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )

    starts_at: Mapped[dt.datetime] = mapped_column(DateTime, nullable=False)
    duration_min: Mapped[int] = mapped_column(SMALLINT(unsigned=True), nullable=False)
    capacity: Mapped[int] = mapped_column(SMALLINT(unsigned=True), nullable=False, default=12)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(255))
    price_cents: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="EUR")
    status: Mapped[str] = mapped_column(
        MySQLEnum(*CLUB_STATUS, name="club_status"),
        nullable=False,
        default="SCHEDULED",
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

    host: Mapped["User"] = relationship("User", back_populates="clubs_hosted", foreign_keys=[host_id])
    level: Mapped["Level"] = relationship("Level")
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment", back_populates="club", cascade="all, delete-orphan"
    )
    wishlist_entries: Mapped[List["Wishlist"]] = relationship(
        "Wishlist", back_populates="club", cascade="all, delete-orphan"
    )
