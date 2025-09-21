import os
from urllib.parse import quote_plus

from flask import Flask
from dotenv import load_dotenv

from .extensions import db
from .models import register_models  # lädt/registriert alle ORM-Modelle


def _build_mysql_dsn() -> str:
    """Baut die MySQL/MariaDB-DSN aus .env-Variablen (Passwort URL-encodiert)."""
    user = os.getenv("DB_USER", "root")
    pwd  = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "sprachclubdb")
    return f"mysql+pymysql://{user}:{quote_plus(pwd)}@{host}:{port}/{name}?charset=utf8mb4"


def create_app() -> Flask:
    """Application Factory (von Flask empfohlen)."""
    load_dotenv()  # lädt .env in os.environ
    app = Flask(__name__)

    # Secrets
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or os.getenv("SESSION_KEY") or "dev-insecure"

    # Datenbank
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", _build_mysql_dsn())
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    # Extensions initialisieren
    db.init_app(app)

    # Healthcheck
    @app.get("/health")
    def health():
        return {"ok": True}

    # DB-Tabellen anlegen & feste Levels seeden (für Prod später Alembic nehmen)
    with app.app_context():
        register_models()   # wichtig: Modelle importieren/registrieren
        db.create_all()

        from .models import Level  # lazy import nach register_models()
        seed_levels = {
            "A2.1": "A2.1 – Elementarstufe 1",
            "A2.2": "A2.2 – Elementarstufe 2",
            "A2/B1": "A2/B1 – Übergang",
            "B2/C1": "B2/C1 – Fortgeschritten/Übergang",
        }
        for code, label in seed_levels.items():
            if not Level.query.get(code):
                db.session.add(Level(code=code, label=label))
        db.session.commit()

    # Optional: Blueprints hier registrieren (wenn vorhanden)
    # from .api import bp as api_bp
    # app.register_blueprint(api_bp)

    # Bequemer Shell-Context: `flask shell`
    @app.shell_context_processor
    def _ctx():
        from .models import User, Club, Level, Enrollment, Wishlist  # lazy imports
        return {"db": db, "User": User, "Club": Club, "Level": Level,
                "Enrollment": Enrollment, "Wishlist": Wishlist}

    return app


# Für `from yourapp import db, create_app`
__all__ = ("create_app", "db")
