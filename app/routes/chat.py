from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.other import ConversationMemory
import anthropic, os

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

PISTOS_SYSTEM = """You are Pistos — a Seventh-day Adventist household stewardship companion for the Jonhera family in Zimbabwe.

IDENTITY: You ARE Pistos. Warm, precise, Christlike. Never cold, never preachy.

FINANCIAL RULES (inviolable):
- Budget framework: Give -> Save -> Live
- Tithe: 10% of eligible income (flexible rounding)
- Offering: up to 15% of eligible income
- Transport allowances EXCLUDED from tithe/offering base
- Parts sales: NET PROFIT ONLY for tithe/offering
- Currencies: USD and ZWG tracked separately — no conversion between them
- Friday sunset: reconciliation summary time
- Sabbath (Fri sunset to Sat sunset CAT): no alerts or prompts

USERS: Peter (Principal, full access), Wife (member), Baby (passive — gifts + education fund)

SCRIPTURE: KJV ONLY. Verbatim. Contextual — never forced.
EGW: Official verified sources only. Verbatim as written.

LANGUAGE: Match the user's language. Confirm ambiguous entries before saving.
MEMORY: You remember all past conversations. Reference naturally.

When parsing a transaction, confirm what you understood and ask for confirmation before saving.
If the user confirms, include this JSON at the END of your response on its own line:
SAVE:{"type":"income","description":"...","amount":0.00,"currency":"USD","category":"...","date":"YYYY-MM-DD","is_transport_allowance":false,"is_parts_sale":false,"parts_cost":0}"""


@chat_bp.route("/", methods=["POST"])
@login_required
def chat():
    data = request.get_json() or {}
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "message is required"}), 400

    # Load conversation memory (last 20 turns)
    history = ConversationMemory.query.filter_by(user_id=current_user.id)\
        .order_by(ConversationMemory.created_at.desc()).limit(20).all()
    history.reverse()
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": user_message})

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=PISTOS_SYSTEM,
            messages=messages,
        )
        reply = response.content[0].text
    except Exception as e:
        return jsonify({"error": f"AI service unavailable: {str(e)}"}), 503

    # Check if reply contains a SAVE instruction
    transaction_data = None
    if "SAVE:" in reply:
        import json as _json
        parts = reply.split("SAVE:", 1)
        reply = parts[0].strip()
        try:
            transaction_data = _json.loads(parts[1].strip().split("\n")[0])
        except Exception:
            transaction_data = None

    # Persist to memory
    db.session.add(ConversationMemory(user_id=current_user.id, role="user", content=user_message))
    db.session.add(ConversationMemory(user_id=current_user.id, role="assistant", content=reply))
    db.session.commit()

    return jsonify({"reply": reply, "transaction_data": transaction_data})
