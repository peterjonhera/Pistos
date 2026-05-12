from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.transaction import Transaction
from app.models.other import AuditLog
from datetime import datetime, date, timedelta

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")

VALID_TYPES      = {"income", "expense"}
VALID_CURRENCIES = {"USD", "ZWG"}


def _parse_date(val):
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return date.today()


@transactions_bp.route("/", methods=["GET"])
@login_required
def get_transactions():
    currency = request.args.get("currency")
    q = Transaction.query.filter_by(is_deleted=False)
    if currency and currency in VALID_CURRENCIES:
        q = q.filter_by(currency=currency)
    txns = q.order_by(Transaction.date.desc()).limit(200).all()
    return jsonify([t.to_dict() for t in txns])


@transactions_bp.route("/", methods=["POST"])
@login_required
def add_transaction():
    data = request.get_json() or {}

    # DEF-009: Validate required fields
    errors = []
    txn_type = data.get("type", "").strip().lower()
    if txn_type not in VALID_TYPES:
        errors.append("type must be 'income' or 'expense'")
    description = data.get("description", "").strip()
    if not description:
        errors.append("description is required")
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        errors.append("amount must be a positive number")
    currency = data.get("currency", "USD").upper()
    if currency not in VALID_CURRENCIES:
        errors.append("currency must be USD or ZWG")
    if errors:
        return jsonify({"errors": errors}), 400

    txn = Transaction(
        user_id=current_user.id,
        type=txn_type,
        description=description,
        amount=amount,
        currency=currency,
        category=data.get("category", "Other"),
        date=_parse_date(data.get("date")),
        source=data.get("source", "form"),
        is_transport_allowance=bool(data.get("is_transport_allowance", False)),
        is_parts_sale=bool(data.get("is_parts_sale", False)),
        parts_cost=float(data.get("parts_cost", 0) or 0),
    )
    db.session.add(txn)
    db.session.commit()
    AuditLog.log(current_user.id, "create", "Transaction", txn.id,
                 f"{txn.type} {txn.amount} {txn.currency}")
    return jsonify(txn.to_dict()), 201


@transactions_bp.route("/<int:txn_id>", methods=["PUT"])
@login_required
def update_transaction(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    # DEF-007: Ownership check
    if txn.user_id != current_user.id and not current_user.is_principal():
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json() or {}
    if "amount" in data:
        try:
            data["amount"] = float(data["amount"])
            if data["amount"] <= 0:
                return jsonify({"error": "amount must be positive"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "amount must be a number"}), 400
    if "type" in data and data["type"] not in VALID_TYPES:
        return jsonify({"error": "type must be income or expense"}), 400
    if "currency" in data and data["currency"].upper() not in VALID_CURRENCIES:
        return jsonify({"error": "currency must be USD or ZWG"}), 400

    editable = ["description", "amount", "currency", "category", "type",
                "is_transport_allowance", "is_parts_sale", "parts_cost"]
    for field in editable:
        if field in data:
            setattr(txn, field, data[field])
    db.session.commit()
    AuditLog.log(current_user.id, "update", "Transaction", txn.id, str(data))
    return jsonify(txn.to_dict())


@transactions_bp.route("/<int:txn_id>", methods=["DELETE"])
@login_required
def delete_transaction(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    # DEF-007: Ownership check
    if txn.user_id != current_user.id and not current_user.is_principal():
        return jsonify({"error": "Access denied"}), 403
    txn.is_deleted = True
    db.session.commit()
    AuditLog.log(current_user.id, "delete", "Transaction", txn_id)
    return jsonify({"message": "Deleted — audit trail retained"})


@transactions_bp.route("/summary", methods=["GET"])
@login_required
def summary():
    currency = request.args.get("currency", "USD").upper()
    if currency not in VALID_CURRENCIES:
        return jsonify({"error": "currency must be USD or ZWG"}), 400

    # DEF-014: Support month/year filter
    month = request.args.get("month", type=int)
    year  = request.args.get("year",  type=int)

    q = Transaction.query.filter_by(is_deleted=False, currency=currency)
    if year:
        q = q.filter(db.extract("year", Transaction.date) == year)
    if month:
        q = q.filter(db.extract("month", Transaction.date) == month)

    txns = q.all()
    income     = sum(t.amount for t in txns if t.type == "income")
    expense    = sum(t.amount for t in txns if t.type == "expense")
    tithe_base = sum(t.tithe_base for t in txns)
    tithe      = round(tithe_base * 0.10, 2)
    max_offering = round(tithe_base * 0.15, 2)

    return jsonify({
        "currency": currency,
        "total_income": income,
        "total_expense": expense,
        "balance": round(income - expense, 2),
        "tithe_base": tithe_base,
        "tithe": tithe,
        "max_offering": max_offering,
        "suggested_giving_total": round(tithe + max_offering, 2),
    })
