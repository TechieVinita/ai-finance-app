# backend/models/user.py
from werkzeug.security import generate_password_hash, check_password_hash
from db import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    # auth
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # profile fields
    full_name = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    default_currency = db.Column(db.String(10), nullable=True, default="INR")

    # relationships
    transactions = db.relationship(
        "Transaction", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    goals = db.relationship(
        "Goal", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    # ---------- auth helpers ----------
    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    # ---------- profile serialization ----------
    def to_profile_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name or "",
            "phone": self.phone or "",
            "default_currency": self.default_currency or "INR",
        }
