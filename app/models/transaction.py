from app import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = "transactions"
    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type        = db.Column(db.String(10), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount      = db.Column(db.Float, nullable=False)
    currency    = db.Column(db.String(5), default="USD")
    category    = db.Column(db.String(50), default="Other")
    date        = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    is_deleted  = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source      = db.Column(db.String(10), default="form")
    is_transport_allowance = db.Column(db.Boolean, default=False)
    is_parts_sale          = db.Column(db.Boolean, default=False)
    parts_cost             = db.Column(db.Float, default=0.0)

    @property
    def tithe_base(self):
        if self.type != "income":
            return 0.0
        if self.is_transport_allowance:
            return 0.0
        if self.is_parts_sale:
            return max(0.0, self.amount - self.parts_cost)
        return self.amount

    def to_dict(self):
        return {
            "id": self.id, "type": self.type, "description": self.description,
            "amount": self.amount, "currency": self.currency, "category": self.category,
            "date": str(self.date), "tithe_base": self.tithe_base,
            "is_transport_allowance": self.is_transport_allowance,
            "is_parts_sale": self.is_parts_sale, "parts_cost": self.parts_cost,
        }
