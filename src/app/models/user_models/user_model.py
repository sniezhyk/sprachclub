# models/user_models/user_model.py
from __future__ import annotations
import datetime as dt
from typing import Optional, List

from flask_login import UserMixin
from sqlalchemy import String, Date, DateTime
from sqlalchemy.dialects.mysql import BIGINT, VARBINARY, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from extensions import db  # passt, wenn du aus src/app startest


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    birth_date: Mapped[Optional[dt.date]] = mapped_column(Date, nullable=True)
    password_hash: Mapped[bytes] = mapped_column(VARBINARY(60), nullable=False)

    # Rolle: user (implizit) + host (via Flag)
    is_host: Mapped[int] = mapped_column(TINYINT(unsigned=True), default=0, nullable=False)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=db.func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp(),
        nullable=False,
    )

    # Beziehungen
    host_profile: Mapped["Host"] = relationship("Host", back_populates="user", uselist=False)
    clubs_hosted: Mapped[List["Club"]] = relationship(
        "Club", back_populates="host", cascade="all, delete-orphan", foreign_keys="Club.host_id"
    )
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment", back_populates="user", cascade="all, delete-orphan"
    )
    wishlist_items: Mapped[List["Wishlist"]] = relationship(
        "Wishlist", back_populates="user", cascade="all, delete-orphan"
    )

    # --- Rollen-Helfer ---
    @property
    def roles(self) -> list[str]:
        roles = ["user"]
        if self.is_host:
            roles.append("host")
        return roles

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def __repr__(self) -> str:
        return f"<User {self.id} {self.username}>"




