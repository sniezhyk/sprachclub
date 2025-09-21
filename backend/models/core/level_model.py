from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from extensions import db

class Level(db.Model):
    __tablename__ = "levels"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    label: Mapped[str] = mapped_column(String(32), nullable=False)
