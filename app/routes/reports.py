from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.models.other import AuditLog

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

@reports_bp.route("/audit", methods=["GET"])
@login_required
def audit():
    if not current_user.is_principal():
        return jsonify({"error": "Principal only"}), 403
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(200).all()
    return jsonify([{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "model": l.model, "record_id": l.record_id,
        "detail": l.detail, "timestamp": str(l.timestamp),
    } for l in logs])
