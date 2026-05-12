from flask import Blueprint, render_template, request, jsonify

main_bp = Blueprint("main", __name__)


@main_bp.route("/", defaults={"path": ""})
@main_bp.route("/<path:path>")
def index(path):
    # DEF-008: Never intercept API routes — return JSON 404 for those
    if path.startswith("api/") or path.startswith("auth/"):
        return jsonify({"error": "Not found"}), 404
    return render_template("index.html")
