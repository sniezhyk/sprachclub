# routes/auth.py
from __future__ import annotations
from typing import Any, Optional

from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import User, Host
from .auth_util import (
    bad_request, created_user_payload, user_payload,
    s, email_ok, validate_birth_date,
    hash_password, verify_password, unique_conflict,
    requires_roles,
)

bp = Blueprint("auth", __name__)

# ---------- REGISTER ----------
@bp.post("/api/auth/register")
def register():
    data: dict[str, Any] = request.get_json(silent=True) or {}
    try:
        username   = s(data, "username", required=True, maxlen=32)
        email      = s(data, "email", required=True, maxlen=254)
        first_name = s(data, "first_name", required=True, maxlen=80)
        last_name  = s(data, "last_name", required=True, maxlen=80)
        password   = s(data, "password", required=True)
        host_bio   = s(data, "bio", default="")
    except ValueError as ve:
        field, msg = ve.args[0]
        return bad_request(f"{field}: {msg}.", field)

    if not email_ok(email):
        return bad_request("Ungültige E-Mail.", "email")
    if len(password) < 8:
        return bad_request("Passwort zu kurz (min. 8).", "password")

    bd_raw = s(data, "birth_date", default="")
    birth_date, bd_err = validate_birth_date(bd_raw, min_age=13)
    if bd_raw and bd_err:
        return bad_request(bd_err, "birth_date")

    is_host = 1 if bool(data.get("is_host")) else 0

    conflict_field = unique_conflict(db.session, User, username=username, email=email)
    if conflict_field == "username":
        return bad_request("Username bereits vergeben.", "username", 409)
    if conflict_field == "email":
        return bad_request("E-Mail bereits registriert.", "email", 409)

    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        password_hash=hash_password(password),
        is_host=is_host,
    )

    try:
        db.session.add(user)
        db.session.flush()
        if is_host:
            db.session.add(Host(user_id=user.id, bio=host_bio or None))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return bad_request("Registrierung fehlgeschlagen.", None, 400)

    login_user(user)  # optional: sofort eingeloggt
    return created_user_payload(user)

# ---------- LOGIN ----------
@bp.post("/api/auth/login")
def login():
    data: dict[str, Any] = request.get_json(silent=True) or {}
    identifier = s(data, "identifier", required=True)  # username ODER email
    password   = s(data, "password", required=True)

    user = User.query.filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not user or not verify_password(password, user.password_hash):
        return bad_request("Ungültige Zugangsdaten.", None, 401)

    remember = bool(data.get("remember", False))
    login_user(user, remember=remember)
    return jsonify({"user": user_payload(user)}), 200

# ---------- ME (Session-Status) ----------
@bp.get("/api/auth/me")
@login_required
def me():
    return jsonify({"user": user_payload(current_user)}), 200

# ---------- LOGOUT ----------
@bp.post("/api/auth/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True}), 200

# ---------- Host-spezifische Endpunkte ----------
@bp.get("/api/host/profile")
@requires_roles("host")
def get_host_profile():
    # Host-Profil anzeigen (bio darf None sein)
    host = Host.query.get(current_user.id)
    return jsonify({
        "user": user_payload(current_user),
        "host_profile": {"bio": host.bio if host else None}
    }), 200

@bp.put("/api/host/profile")
@requires_roles("host")
def update_host_profile():
    data: dict[str, Any] = request.get_json(silent=True) or {}
    bio = s(data, "bio", default="").strip() or None

    host = Host.query.get(current_user.id)
    if not host:
        host = Host(user_id=current_user.id, bio=bio)
        db.session.add(host)
    else:
        host.bio = bio

    db.session.commit()
    return jsonify({"ok": True, "host_profile": {"bio": host.bio}}), 200

# (Optional) Promotion/Demotion – nur Beispiel, hier ungeschützt:
@bp.post("/api/host/promote")
@login_required
def promote_to_host():
    # In echter App: Nur Admins sollten das dürfen (separates Admin-Rollenmodell).
    current_user.is_host = 1
    if not Host.query.get(current_user.id):
        db.session.add(Host(user_id=current_user.id, bio=None))
    db.session.commit()
    return jsonify({"user": user_payload(current_user)}), 200

@bp.post("/api/host/demote")
@login_required
def demote_from_host():
    # Achtung: Falls Clubs existieren, vorher Business-Logik definieren!
    current_user.is_host = 0
    Host.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({"user": user_payload(current_user)}), 200


# ---------- SELF-SERVICE: Profil aktualisieren (nur erlaubte Felder) ----------
@bp.patch("/api/auth/me")
@login_required
def update_me():
    """
    Erlaubt: first_name, last_name, birth_date, email*
    *E-Mail-Änderung nur mit current_password und bei eindeutiger Adresse.
    Nicht erlaubt: username, roles, is_host, id, password_hash.
    """
    data: dict[str, Any] = request.get_json(silent=True) or {}

    # Eingaben lesen (alle optional)
    first_name = s(data, "first_name", default="", maxlen=80) or None
    last_name  = s(data, "last_name",  default="", maxlen=80) or None
    bd_raw     = s(data, "birth_date", default="")
    email_new  = s(data, "email",      default="", maxlen=254) or None

    # Validierungen
    birth_date, bd_err = validate_birth_date(bd_raw, min_age=13) if bd_raw else (None, None)
    if bd_raw and bd_err:
        return bad_request(bd_err, "birth_date")

    if email_new is not None:
        if not email_ok(email_new):
            return bad_request("Ungültige E-Mail.", "email")
        if email_new != current_user.email:
            # Für E-Mail-Änderung Passwort verlangen
            current_pw = s(data, "current_password", required=True)
            if not verify_password(current_pw, current_user.password_hash):
                return bad_request("Passwort falsch.", "current_password", 401)
            # Eindeutigkeit prüfen
            existing = User.query.filter(User.email == email_new).first()
            if existing and existing.id != current_user.id:
                return bad_request("E-Mail bereits registriert.", "email", 409)

    # Mutationen anwenden
    if first_name is not None:
        current_user.first_name = first_name
    if last_name is not None:
        current_user.last_name = last_name
    if bd_raw:
        # bd_raw leer -> keine Änderung; gesetzt + valid -> setzen / None akzeptieren wir nicht hier
        current_user.birth_date = birth_date
    if email_new is not None and email_new != current_user.email:
        current_user.email = email_new

    db.session.commit()
    return jsonify({"user": user_payload(current_user)}), 200


# ---------- SELF-SERVICE: Passwort ändern ----------
@bp.post("/api/auth/password")
@login_required
def change_password():
    """
    Erfordert: current_password, new_password (>= 8)
    """
    data: dict[str, Any] = request.get_json(silent=True) or {}
    try:
        current_pw = s(data, "current_password", required=True)
        new_pw     = s(data, "new_password", required=True)
    except ValueError as ve:
        field, msg = ve.args[0]
        return bad_request(f"{field}: {msg}.", field)

    if not verify_password(current_pw, current_user.password_hash):
        return bad_request("Passwort falsch.", "current_password", 401)
    if len(new_pw) < 8:
        return bad_request("Passwort zu kurz (min. 8).", "new_password")

    current_user.password_hash = hash_password(new_pw)
    db.session.commit()
    return jsonify({"ok": True}), 200


# ---------- SELF-SERVICE: Konto löschen ----------
@bp.delete("/api/auth/me")
@login_required
def delete_account():
    """
    Erfordert current_password zur Bestätigung.
    Löscht Host-Profil (falls vorhanden), Nutzerkonto und beendet Session.
    """
    data: dict[str, Any] = request.get_json(silent=True) or {}
    try:
        current_pw = s(data, "current_password", required=True)
    except ValueError as ve:
        field, msg = ve.args[0]
        return bad_request(f"{field}: {msg}.", field)

    if not verify_password(current_pw, current_user.password_hash):
        return bad_request("Passwort falsch.", "current_password", 401)

    user_id = current_user.id

    # Zugehöriges Host-Profil entfernen (falls existiert)
    Host.query.filter_by(user_id=user_id).delete()

    # Nutzer löschen
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()

    # Session beenden
    try:
        logout_user()
    except Exception:
        # Falls der User bereits "weg" ist, ist das ok.
        pass

    return jsonify({"ok": True}), 200
