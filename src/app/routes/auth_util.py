# routes/auth_util.py
from __future__ import annotations
import os
import datetime as dt
from typing import Any, Optional, Tuple, Callable, Iterable

import bcrypt
from flask import jsonify, abort
from flask_login import login_required, current_user

# ---------- Response Helper ----------

def bad_request(msg: str, field: str | None = None, code: int = 400):
    payload = {"error": msg}
    if field:
        payload["field"] = field
    return jsonify(payload), code

def user_payload(user) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "is_host": bool(user.is_host),
        "roles": user.roles,  # ["user"] oder ["user","host"]
    }

def created_user_payload(user) -> tuple:
    return jsonify(user_payload(user)), 201

# ---------- Input & Validation ----------

def s(data: dict, key: str, *, default: str = "", maxlen: int | None = None, required: bool = False) -> str:
    val = (data.get(key) or default).strip()
    if required and not val:
        raise ValueError((key, "Pflichtfeld"))
    if maxlen and len(val) > maxlen:
        raise ValueError((key, f"zu lang (max. {maxlen})"))
    return val

def email_ok(email: str) -> bool:
    return bool(email) and "@" in email and len(email) <= 254

def parse_birth_date(raw: str | None) -> Optional[dt.date]:
    if not raw:
        return None
    try:
        return dt.date.fromisoformat(raw)
    except ValueError:
        return None

def calc_age(birth_date: dt.date) -> int:
    today = dt.date.today()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years

def validate_birth_date(raw: str | None, *, min_age: int = 13) -> Tuple[Optional[dt.date], Optional[str]]:
    if not raw:
        return None, None
    d = parse_birth_date(raw)
    if d is None:
        return None, "Geburtsdatum muss YYYY-MM-DD sein."
    if d > dt.date.today():
        return None, "Geburtsdatum darf nicht in der Zukunft liegen."
    if calc_age(d) < min_age:
        return None, f"Mindestalter {min_age} Jahre."
    return d, None

# ---------- Security ----------

def hash_password(pw: str) -> bytes:
    rounds = int(os.getenv("BCRYPT_ROUNDS", "12"))
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=rounds))

def verify_password(pw: str, hashed: bytes) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed)
    except Exception:
        return False

# ---------- DB Helpers ----------

def unique_conflict(session, UserModel, *, username: str, email: str) -> Optional[str]:
    existing = (
        session.query(UserModel.username, UserModel.email)
        .filter((UserModel.username == username) | (UserModel.email == email))
        .first()
    )
    if not existing:
        return None
    if existing.username == username:
        return "username"
    if existing.email == email:
        return "email"
    return None

# ---------- RBAC: Rollen-Decorator ----------

def requires_roles(*roles: str):
    """
    Nutzung:
      @bp.get("/api/host/only")
      @requires_roles("host")
      def host_only(): ...
    """
    def decorator(fn: Callable):
        @login_required
        def wrapper(*args, **kwargs):
            user_roles = getattr(current_user, "roles", [])
            if not any(r in user_roles for r in roles):
                abort(403)
            return fn(*args, **kwargs)
        # Flask behält Funktionsnamen, wenn wir __name__ setzen
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator
