from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()
db = SQLAlchemy()
login_manager = LoginManager()
bcrypt = Bcrypt()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    # ── Config ──────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # DEF-005: Fix Render's postgres:// → postgres://
    db_url = os.getenv("DATABASE_URL", "sqlite:////tmp/pistos.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY", "")

    # ── Extensions ──────────────────────────────────────
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    # DEF-010: Lock CORS to own origin in production
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    CORS(app, origins=allowed_origins, supports_credentials=True)

    login_manager.login_view = "auth.login"

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Unauthorised — please log in"}), 401

    # ── Blueprints ──────────────────────────────────────
    from app.routes.auth import auth_bp
    from app.routes.main import main_bp
    from app.routes.transactions import transactions_bp
    from app.routes.giving import giving_bp
    from app.routes.goals import goals_bp
    from app.routes.chat import chat_bp
    from app.routes.reports import reports_bp

    for bp in [auth_bp, transactions_bp, giving_bp, goals_bp, chat_bp, reports_bp]:
        app.register_blueprint(bp)
    # main_bp last — its catch-all must not swallow API routes (DEF-008)
    app.register_blueprint(main_bp)

    # ── DEF-011: Global error handlers ──────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "detail": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorised — please log in"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # ── DEF-002: Import models before create_all ─────────
    with app.app_context():
        from app.models import user, transaction, other  # noqa: F401
        db.create_all()

    return app
