# app.py
import os
import time  # ✅
from urllib.parse import quote_plus

from flask import Flask, render_template, jsonify, send_file, url_for  # url_for optional
from dotenv import load_dotenv

from extensions import db, init_extensions, login_manager
from models import register_models


def build_mysql_dsn() -> str:
    user = os.getenv("DB_USER", "root")
    pwd  = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "sprachclubdb")
    return f"mysql+pymysql://{user}:{quote_plus(pwd)}@{host}:{port}/{name}?charset=utf8mb4"


def create_app() -> Flask:
    load_dotenv()

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
        static_url_path="/static",
    )

    # ---- Basis-Config ----
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or os.getenv("SESSION_KEY") or "dev-insecure"
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", build_mysql_dsn())
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True, "pool_recycle": 280}

    # ✅ Dev-Quality of life: Templatereload & kein aggressives Static-Caching
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
    app.jinja_env.auto_reload = True

    # Session-/Cookie-Härtung
    app.config.setdefault("SESSION_COOKIE_SAMESITE", "Lax")
    app.config.setdefault("REMEMBER_COOKIE_SAMESITE", "Lax")
    app.config.setdefault("SESSION_COOKIE_HTTPONLY", True)
    app.config.setdefault("REMEMBER_COOKIE_HTTPONLY", True)
    app.config.setdefault("SESSION_COOKIE_SECURE", os.getenv("SESSION_COOKIE_SECURE", "1") == "1")
    app.config.setdefault("REMEMBER_COOKIE_SECURE", os.getenv("REMEMBER_COOKIE_SECURE", "1") == "1")

    # ---- Extensions ----
    init_extensions(app)

    # ✅ Build-ID für Cache-Busting in Templates verfügbar machen
    BUILD_ID = os.getenv("BUILD_ID") or str(int(time.time()))
    @app.context_processor
    def inject_build_id():
        return {"build_id": BUILD_ID}

    # ---- Blueprints ----
    from routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    # ---- Helper: PDFs ausliefern ----
    def serve_legal(file_name: str, download_name: str):
        pdf_path = os.path.join(app.static_folder, "legal", file_name)
        if not os.path.exists(pdf_path):
            return jsonify({"error": f"{file_name} nicht gefunden"}), 404
        return send_file(
            pdf_path,
            mimetype="application/pdf",
            as_attachment=False,
            download_name=download_name,
            conditional=True,
            max_age=3600,
        )

    # ---- Routes ----
    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/tester")
    def tester():
        return render_template("tester.html")

    @app.get("/my-account")
    def my_account():
        return render_template("account.html")

    # Footer-Seiten (zeigen sofort etwas an)
    @app.get("/ueber-uns")
    def ueber_uns():
        return "<h1>Über uns</h1><p>Inhalt folgt.</p>"

    @app.get("/service")
    def service():
        return "<h1>Service</h1><p>Inhalt folgt.</p>"

    @app.get("/kontakt")
    def kontakt():
        return "<h1>Kontakt</h1><p>Inhalt folgt.</p>"

    # PDFs
    @app.get("/datenschutz")
    def datenschutz():
        return serve_legal("datenschutzerklarung.pdf", "Datenschutz.pdf")

    @app.get("/impressum")
    def impressum():
        return serve_legal("datenschutzerklarung.pdf", "Impressum.pdf")

    @app.get("/agb")
    def agb():
        return serve_legal("datenschutzerklarung.pdf", "AGB.pdf")

    # Icons
    @app.get("/favicon.ico")
    @app.get("/apple-touch-icon.png")
    @app.get("/apple-touch-icon-precomposed.png")
    def _icons():
        return ("", 204)

    # Fehler als JSON
    @app.errorhandler(403)
    def _forbidden(_e):
        return jsonify({"error": "Forbidden"}), 403

    # ---- DB init + Seeds ----
    with app.app_context():
        register_models()
        db.create_all()

        from models import User, Level

        @login_manager.user_loader
        def load_user(user_id: str):
            try:
                return User.query.get(int(user_id))
            except Exception:
                return None

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

    # ---- Shell Context ----
    @app.shell_context_processor
    def _ctx():
        from models import User, Club, Level, Enrollment, Wishlist
        return {"db": db, "User": User, "Club": Club, "Level": Level,
                "Enrollment": Enrollment, "Wishlist": Wishlist}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
    )
