from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.other import Goal, AuditLog

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")

@goals_bp.route("/", methods=["GET"])
@login_required
def get_goals():
    goals = Goal.query.filter_by(user_id=current_user.id, is_active=True).all()
    return jsonify([g.to_dict() for g in goals])

@goals_bp.route("/", methods=["POST"])
@login_required
def add_goal():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    target = data.get("target")
    if not name or not target:
        return jsonify({"error": "name and target are required"}), 400
    try:
        target = float(target)
        if target <= 0: raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "target must be a positive number"}), 400
    goal = Goal(user_id=current_user.id, name=name, target=target,
                currency=data.get("currency", "USD"),
                is_protected=data.get("is_protected", False))
    db.session.add(goal)
    db.session.commit()
    AuditLog.log(current_user.id, "create", "Goal", goal.id, goal.name)
    return jsonify(goal.to_dict()), 201

@goals_bp.route("/<int:goal_id>/contribute", methods=["POST"])
@login_required
def contribute(goal_id):
    goal = Goal.query.get_or_404(goal_id)
    if goal.is_protected and not current_user.is_principal():
        return jsonify({"error": "Protected goal — principal access only"}), 403
    data = request.get_json() or {}
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0: raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be positive"}), 400
    goal.saved += amount
    db.session.commit()
    AuditLog.log(current_user.id, "update", "Goal", goal.id, f"+{amount}")
    return jsonify(goal.to_dict())

@goals_bp.route("/<int:goal_id>", methods=["DELETE"])
@login_required
def delete_goal(goal_id):
    if not current_user.is_principal():
        return jsonify({"error": "Principal only"}), 403
    goal = Goal.query.get_or_404(goal_id)
    goal.is_active = False
    db.session.commit()
    AuditLog.log(current_user.id, "delete", "Goal", goal_id)
    return jsonify({"message": "Goal archived"})
