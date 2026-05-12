from app import db
from datetime import datetime


class GivingRecord(db.Model):
    __tablename__ = "giving_records"
    id              = db.Column(db.Integer, primary_key=True)
    week_ending     = db.Column(db.Date, nullable=False)
    income_base_usd = db.Column(db.Float, default=0.0)
    income_base_zwg = db.Column(db.Float, default=0.0)
    tithe_usd       = db.Column(db.Float, default=0.0)
    tithe_zwg       = db.Column(db.Float, default=0.0)
    offering_usd    = db.Column(db.Float, default=0.0)
    offering_zwg    = db.Column(db.Float, default=0.0)
    finalised       = db.Column(db.Boolean, default=False)
    backup_done     = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def total_giving_usd(self):
        return self.tithe_usd + self.offering_usd

    def to_dict(self):
        return {
            "id": self.id, "week_ending": str(self.week_ending),
            "income_base_usd": self.income_base_usd, "income_base_zwg": self.income_base_zwg,
            "tithe_usd": self.tithe_usd, "tithe_zwg": self.tithe_zwg,
            "offering_usd": self.offering_usd, "offering_zwg": self.offering_zwg,
            "total_usd": self.total_giving_usd(), "finalised": self.finalised,
        }


class Goal(db.Model):
    __tablename__ = "goals"
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name         = db.Column(db.String(150), nullable=False)
    target       = db.Column(db.Float, nullable=False)
    saved        = db.Column(db.Float, default=0.0)
    currency     = db.Column(db.String(5), default="USD")
    is_protected = db.Column(db.Boolean, default=False)
    is_active    = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def progress_pct(self):
        return min(100, round((self.saved / self.target) * 100)) if self.target else 0

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "target": self.target,
            "saved": self.saved, "currency": self.currency,
            "progress": self.progress_pct(), "is_protected": self.is_protected,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action    = db.Column(db.String(50), nullable=False)
    model     = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=True)
    detail    = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def log(user_id, action, model, record_id=None, detail=None):
        entry = AuditLog(user_id=user_id, action=action, model=model,
                         record_id=record_id, detail=detail)
        db.session.add(entry)
        db.session.commit()


class ConversationMemory(db.Model):
    __tablename__ = "conversation_memory"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role       = db.Column(db.String(10), nullable=False)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
