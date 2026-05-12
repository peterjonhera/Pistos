from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.models.other import AuditLog
import re

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _validate_email(email):
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or "")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    errors = []

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        errors.append("name is required")
    if not _validate_email(email):
        errors.append("a valid email is required")
    # DEF-015: Password strength
    if len(password) < 8:
        errors.append("password must be at least 8 characters")
    if errors:
        return jsonify({"errors": errors}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    role = "principal" if User.query.count() == 0 else data.get("role", "member")
    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    AuditLog.log(user.id, "create", "User", user.id, f"Registered as {role}")
    return jsonify({"message": "Registered", "role": role}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user, remember=True)
    AuditLog.log(user.id, "login", "User", user.id)
    return jsonify({"message": "Logged in", "name": user.name, "role": user.role}), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    AuditLog.log(current_user.id, "logout", "User", current_user.id)
    logout_user()
    return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }), 200
