from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.other import GivingRecord, AuditLog
from app.models.transaction import Transaction
from app.services.backup_service import trigger_backup
from datetime import date, timedelta

giving_bp = Blueprint("giving", __name__, url_prefix="/api/giving")


def _this_friday():
    """Return the date of the current or upcoming Friday (CAT)."""
    today = date.today()
    days_until_friday = (4 - today.weekday()) % 7
    return today if today.weekday() == 4 else today + timedelta(days=days_until_friday)


def _week_start():
    """Monday of the current week."""
    today = date.today()
    return today - timedelta(days=today.weekday())


@giving_bp.route("/reconciliation", methods=["GET"])
@login_required
def reconciliation():
    """DEF-006: Filter to current week only, per currency."""
    week_start = _week_start()
    friday = _this_friday()

    results = {}
    for currency in ["USD", "ZWG"]:
        # DEF-006 fix: date range filter — this week only
        txns = Transaction.query.filter(
            Transaction.is_deleted == False,
            Transaction.currency == currency,
            Transaction.date >= week_start,
            Transaction.date <= friday,
        ).all()

        income_eligible = sum(t.tithe_base for t in txns if t.type == "income")
        tithe = round(income_eligible * 0.10, 2)
        max_offering = round(income_eligible * 0.15, 2)

        results[currency] = {
            "income_eligible": income_eligible,
            "tithe": tithe,
            "max_offering": max_offering,
            "max_total": round(tithe + max_offering, 2),
        }

    return jsonify({
        "week_start": str(week_start),
        "week_ending": str(friday),
        "USD": results["USD"],
        "ZWG": results["ZWG"],
        "verse": "Bring ye all the tithes into the storehouse, that there may be meat in mine house… — Malachi 3:10, KJV",
    })


@giving_bp.route("/finalise", methods=["POST"])
@login_required
def finalise():
    if not current_user.is_principal():
        return jsonify({"error": "Only the principal can finalise giving"}), 403

    data = request.get_json() or {}
    required = ["tithe_usd", "offering_usd"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    record = GivingRecord(
        week_ending=_this_friday(),
        income_base_usd=data.get("income_base_usd", 0),
        income_base_zwg=data.get("income_base_zwg", 0),
        tithe_usd=float(data.get("tithe_usd", 0)),
        tithe_zwg=float(data.get("tithe_zwg", 0)),
        offering_usd=float(data.get("offering_usd", 0)),
        offering_zwg=float(data.get("offering_zwg", 0)),
        finalised=True,
    )
    db.session.add(record)
    db.session.commit()
    AuditLog.log(current_user.id, "finalise", "GivingRecord", record.id,
                 f"USD tithe={record.tithe_usd} offering={record.offering_usd}")

    backup_result = trigger_backup()
    record.backup_done = backup_result
    db.session.commit()

    return jsonify({**record.to_dict(), "backup_triggered": backup_result})


@giving_bp.route("/history", methods=["GET"])
@login_required
def history():
    records = GivingRecord.query.order_by(GivingRecord.week_ending.desc()).limit(52).all()
    return jsonify([r.to_dict() for r in records])
