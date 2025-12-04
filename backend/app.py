from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import func
from dotenv import load_dotenv

from datetime import datetime, timedelta
import csv
import os
import io
import jwt

from db import db
from models import User, Transaction, Goal

# -------------------------------------------------
# Basic setup
# -------------------------------------------------

load_dotenv()

app = Flask(__name__)

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        headers = response.headers

        headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        headers["Access-Control-Allow-Credentials"] = "true"

        return response


CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-finance-app-vinitas-projects.vercel.app/",
    ],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "sample_transactions.csv")

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
    BASE_DIR, "finance.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


# -------------------------------------------------
# Rule-based categorization
# -------------------------------------------------

def categorize_transaction(description: str, amount: float) -> str:
    text = (description or "").lower()

    if "salary" in text or "credit" in text:
        return "Income"

    if "zomato" in text or "swiggy" in text or "restaurant" in text:
        return "Food & Dining"

    if "uber" in text or "ola" in text or "cab" in text:
        return "Transport"

    if "amazon" in text or "flipkart" in text or "myntra" in text:
        return "Shopping"

    if "rent" in text or "maintenance" in text:
        return "Housing"

    if "electricity" in text or "water bill" in text or "internet" in text:
        return "Utilities"

    if amount > 0:
        return "Income"

    return "Other"


# -------------------------------------------------
# Demo user + sample data
# -------------------------------------------------

def ensure_demo_user():
    """
    Creates a demo user demo@example.com / demo123
    and (optionally) loads sample CSV into their account.
    Safe to call multiple times.
    """
    demo_email = "demo@example.com"
    demo_user = User.query.filter_by(email=demo_email).first()
    if demo_user:
        return demo_user

    demo_user = User(
        email=demo_email,
        full_name="Demo User",
        default_currency="INR",
    )
    demo_user.set_password("demo123")
    db.session.add(demo_user)
    db.session.commit()

    # Optional: preload sample CSV if it exists
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                try:
                    amount = float(row["amount"])
                except (KeyError, ValueError):
                    continue

                description = row.get("description", "")
                category = categorize_transaction(description, amount)

                tx = Transaction(
                    date=row.get("date", ""),
                    description=description,
                    amount=amount,
                    category=category,
                    user_id=demo_user.id,
                )
                db.session.add(tx)
        db.session.commit()

    return demo_user


with app.app_context():
    db.create_all()
    ensure_demo_user()


# -------------------------------------------------
# JWT config + auth helper
# -------------------------------------------------

JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret_change_me")
JWT_ALGORITHM = "HS256"
TOKEN_EXP_HOURS = 12


def generate_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXP_HOURS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def require_auth(f):
    from functools import wraps

    @wraps(f)
    def wrapper(*args, **kwargs):
        # *** IMPORTANT ***
        # Allow CORS preflight to pass without auth
        if request.method == "OPTIONS":
            return jsonify({}), 200

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        request.user_id = payload["user_id"]
        return f(*args, **kwargs)

    return wrapper


# -------------------------------------------------
# Health check
# -------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# -------------------------------------------------
# Auth routes
# -------------------------------------------------

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "User with this email already exists"}), 400

    user = User(email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({"message": "Signup successful", "token": token}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user.id)
    return jsonify({"message": "Login successful", "token": token}), 200


# -------------------------------------------------
# Profile routes (GET / PUT / OPTIONS)
# -------------------------------------------------

@app.route("/api/profile", methods=["GET", "PUT", "OPTIONS"])
@require_auth
def profile():
    # OPTIONS is handled already in require_auth; this is just a safeguard.
    if request.method == "OPTIONS":
        return jsonify({}), 200

    user_id = request.user_id
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        return jsonify({"profile": user.to_profile_dict()}), 200

    # PUT: update profile
    data = request.get_json() or {}

    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    default_currency = (data.get("default_currency") or "").strip().upper()

    if default_currency == "":
        default_currency = "INR"

    if len(full_name) > 255:
        return jsonify({"error": "Name is too long"}), 400
    if len(phone) > 50:
        return jsonify({"error": "Phone is too long"}), 400
    if len(default_currency) > 10:
        return jsonify({"error": "Currency code is too long"}), 400

    user.full_name = full_name or None
    user.phone = phone or None
    user.default_currency = default_currency

    db.session.commit()

    return (
        jsonify({"profile": user.to_profile_dict(), "message": "Profile updated"}),
        200,
    )


# -------------------------------------------------
# CSV helpers (testing only)
# -------------------------------------------------

def load_transactions_from_csv():
    transactions = []

    with open(CSV_PATH, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        for idx, row in enumerate(reader, start=1):
            amount = float(row["amount"])
            description = row["description"]
            category = categorize_transaction(description, amount)

            transactions.append(
                {
                    "id": idx,
                    "date": row["date"],
                    "description": description,
                    "amount": amount,
                    "category": category,
                }
            )

    return transactions


@app.route("/csv-transactions", methods=["GET"])
def get_csv_transactions():
    transactions = load_transactions_from_csv()
    return jsonify({"transactions": transactions})


@app.route("/upload", methods=["GET"])
def upload_form():
    return """
    <!DOCTYPE html>
    <html>
      <head><title>Upload CSV</title></head>
      <body>
        <h1>Upload bank statement CSV</h1>
        <form action="/upload-csv" method="post" enctype="multipart/form-data">
          <input type="file" name="file" accept=".csv" />
          <button type="submit">Upload</button>
        </form>
      </body>
    </html>
    """


# -------------------------------------------------
# CSV upload → save to DB for THIS user
# -------------------------------------------------

@app.route("/upload-csv", methods=["POST"])
@require_auth
def upload_csv():
    user_id = request.user_id

    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        text_stream = io.StringIO(file.stream.read().decode("utf-8"))
    except UnicodeDecodeError:
        return jsonify({"error": "Could not decode file as UTF-8"}), 400

    reader = csv.DictReader(text_stream)
    saved_transactions = []

    for row in reader:
        date = row.get("date", "") or ""
        description = row.get("description", "") or ""
        try:
            amount = float(row.get("amount", 0) or 0)
        except ValueError:
            continue

        category = categorize_transaction(description, amount)

        tx = Transaction(
            date=date,
            description=description,
            amount=amount,
            category=category,
            user_id=user_id,
        )

        db.session.add(tx)
        saved_transactions.append(
            {
                "date": date,
                "description": description,
                "amount": amount,
                "category": category,
            }
        )

    db.session.commit()

    return jsonify(
        {
            "saved": True,
            "count": len(saved_transactions),
            "transactions": saved_transactions,
        }
    )


# -------------------------------------------------
# Helpers for summaries and forecast (per user)
# -------------------------------------------------

def apply_month_year_filter(query, month, year):
    """
    Given a SQLAlchemy query on Transaction, optionally filter by month/year.
    month, year are strings like "11", "2025" or None.
    """
    if not (month and year):
        return query

    try:
        month_i = int(month)
        year_i = int(year)
    except ValueError:
        return query

    start = f"{year_i:04d}-{month_i:02d}-01"

    end_month = month_i + 1
    end_year = year_i
    if end_month == 13:
        end_month = 1
        end_year += 1

    end = f"{end_year:04d}-{end_month:02d}-01"

    return query.filter(Transaction.date >= start, Transaction.date < end)


def get_category_totals_dict(user_id: int, month=None, year=None):
    """
    Returns a dict: {category: total_amount} for the given user.
    Optional month/year filtering.
    Negative = net expense, positive = net income.
    """
    q = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total_amount"),
    ).filter(Transaction.user_id == user_id)

    q = apply_month_year_filter(q, month, year)

    rows = q.group_by(Transaction.category).all()

    totals = {}
    for row in rows:
        totals[row.category] = float(row.total_amount)
    return totals


def compute_forecast(user_id: int, month=None, year=None):
    """
    Very simple forecast for a single user, optionally filtered by month/year.
    """
    q = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total_amount"),
    ).filter(Transaction.user_id == user_id)

    q = apply_month_year_filter(q, month, year)

    rows = q.group_by(Transaction.category).all()

    income_total = 0.0
    expense_total = 0.0
    category_forecast = []

    for row in rows:
        total = float(row.total_amount)

        if total >= 0:
            income_total += total
        else:
            current_spend = abs(total)
            forecast_spend = current_spend * 1.05
            expense_total += current_spend

            category_forecast.append(
                {
                    "category": row.category,
                    "current_spend": current_spend,
                    "forecast_spend": forecast_spend,
                }
            )

    forecast_expense_total = expense_total * 1.05
    current_saving = income_total - expense_total
    forecast_saving = income_total - forecast_expense_total

    return {
        "categories": category_forecast,
        "totals": {
            "income": income_total,
            "expense": expense_total,
            "forecast_expense": forecast_expense_total,
            "current_saving": current_saving,
            "forecast_saving": forecast_saving,
        },
    }


# -------------------------------------------------
# API: transactions, summary, forecast (per user)
# -------------------------------------------------

@app.route("/api/transactions", methods=["GET"])
@require_auth
def get_transactions_from_db():
    user_id = request.user_id
    month = request.args.get("month")
    year = request.args.get("year")

    q = Transaction.query.filter_by(user_id=user_id)
    q = apply_month_year_filter(q, month, year)

    transactions = q.order_by(Transaction.date).all()
    data = [t.to_dict() for t in transactions]
    return jsonify({"transactions": data})


@app.route("/api/summary/categories", methods=["GET"])
@require_auth
def get_category_summary():
    user_id = request.user_id
    month = request.args.get("month")
    year = request.args.get("year")

    totals = get_category_totals_dict(user_id, month, year)

    summary = []
    for idx, (category, total) in enumerate(totals.items(), start=1):
        summary.append({"id": idx, "category": category, "total": total})

    return jsonify({"summary": summary})


@app.route("/api/forecast", methods=["GET"])
@require_auth
def get_forecast():
    user_id = request.user_id
    month = request.args.get("month")
    year = request.args.get("year")

    forecast = compute_forecast(user_id, month, year)
    return jsonify(forecast)


# -------------------------------------------------
# API: chatbot (per user)
# -------------------------------------------------

@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    user_id = request.user_id

    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"answer": "Please type a question."}), 400

    q = question.lower()

    category_totals = get_category_totals_dict(user_id)
    forecast_data = compute_forecast(user_id)

    if "spend on" in q or "spent on" in q:
        best_category = None
        for category in category_totals.keys():
            if category.lower() in q:
                best_category = category
                break

        if best_category is None:
            return jsonify(
                {
                    "answer": "I couldn't detect the category. Try like: 'How much did I spend on Food & Dining?'"
                }
            )

        total = category_totals[best_category]
        spent = abs(total) if total < 0 else 0
        return jsonify(
            {
                "answer": f"You spent ₹{spent:.2f} on {best_category} in the current data."
            }
        )

    if "total income" in q or "how much did i earn" in q:
        income = 0.0
        for total in category_totals.values():
            if total > 0:
                income += total
        return jsonify(
            {"answer": f"Your total income in the current data is ₹{income:.2f}."}
        )

    if "total expense" in q or "how much did i spend in total" in q:
        expense = 0.0
        for total in category_totals.values():
            if total < 0:
                expense += abs(total)
        return jsonify(
            {"answer": f"Your total expense in the current data is ₹{expense:.2f}."}
        )

    if "saving" in q:
        current_saving = forecast_data["totals"]["current_saving"]
        forecast_saving = forecast_data["totals"]["forecast_saving"]
        return jsonify(
            {
                "answer": (
                    f"Your current saving is ₹{current_saving:.2f}. "
                    f"Based on a simple forecast, next month saving is estimated at ₹{forecast_saving:.2f}."
                )
            }
        )

    return jsonify(
        {
            "answer": "I can answer things like: 'How much did I spend on Food & Dining?', "
            "'What is my total income?', 'What is my total expense?', or 'What are my savings?'."
        }
    )


# -------------------------------------------------
# API: goals (per user)
# -------------------------------------------------

@app.route("/api/goals", methods=["GET"])
@require_auth
def get_goals():
    user_id = request.user_id
    goals = Goal.query.filter_by(user_id=user_id).order_by(Goal.category).all()
    return jsonify({"goals": [g.to_dict() for g in goals]})


@app.route("/api/goals", methods=["POST"])
@require_auth
def create_or_update_goal():
    user_id = request.user_id
    data = request.get_json() or {}

    category = (data.get("category") or "").strip()
    monthly_limit = data.get("monthly_limit")

    if not category:
        return jsonify({"error": "category is required"}), 400

    try:
        monthly_limit = float(monthly_limit)
    except (TypeError, ValueError):
        return jsonify({"error": "monthly_limit must be a number"}), 400

    if monthly_limit <= 0:
        return jsonify({"error": "monthly_limit must be > 0"}), 400

    goal = Goal.query.filter_by(user_id=user_id, category=category).first()
    if goal:
        goal.monthly_limit = monthly_limit
    else:
        goal = Goal(category=category, monthly_limit=monthly_limit, user_id=user_id)
        db.session.add(goal)

    db.session.commit()

    return jsonify({"goal": goal.to_dict()}), 201


# -------------------------------------------------
# API: reset transactions (per user)
# -------------------------------------------------

@app.route("/api/reset", methods=["POST"])
@require_auth
def reset_transactions():
    user_id = request.user_id
    deleted = db.session.query(Transaction).filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"success": True, "deleted": deleted})


# -------------------------------------------------
# Main entry
# -------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
