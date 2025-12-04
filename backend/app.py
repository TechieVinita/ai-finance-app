from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import func

import csv
import os
import io

# ---------- Basic setup ----------
app = Flask(__name__)

# allow React (running on localhost:5173) to call this API
CORS(app, origins=["http://127.0.0.1:5173", "http://localhost:5173"])


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "sample_transactions.csv")

# SQLite database file: backend/finance.db
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "finance.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# ---------- Database model ----------
class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "description": self.description,
            "amount": self.amount,
            "category": self.category,
        }


class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    # e.g. "Food & Dining", "Transport"
    category = db.Column(db.String(50), nullable=False, unique=True)
    # monthly limit in absolute Rupees
    monthly_limit = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "monthly_limit": self.monthly_limit,
        }



# ---------- Simple rule-based categorization ----------
def categorize_transaction(description: str, amount: float) -> str:
    text = (description or "").lower()

    # Income
    if "salary" in text or "credit" in text:
        return "Income"

    # Food & Dining
    if "zomato" in text or "swiggy" in text or "restaurant" in text:
        return "Food & Dining"

    # Transport
    if "uber" in text or "ola" in text or "cab" in text:
        return "Transport"

    # Shopping
    if "amazon" in text or "flipkart" in text or "myntra" in text:
        return "Shopping"

    # Rent / Housing
    if "rent" in text or "maintenance" in text:
        return "Housing"

    # Utilities
    if "electricity" in text or "water bill" in text or "internet" in text:
        return "Utilities"

    # If amount is positive and no keyword matched, assume Income
    if amount > 0:
        return "Income"

    # Default
    return "Other"


# ---------- Health check ----------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ---------- Helper: load from local CSV file (for testing) ----------
def load_transactions_from_csv():
    transactions = []

    with open(CSV_PATH, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        for idx, row in enumerate(reader, start=1):
            amount = float(row["amount"])
            description = row["description"]
            category = categorize_transaction(description, amount)

            transactions.append({
                "id": idx,
                "date": row["date"],
                "description": description,
                "amount": amount,
                "category": category,
            })

    return transactions


@app.route("/csv-transactions", methods=["GET"])
def get_csv_transactions():
    transactions = load_transactions_from_csv()
    return jsonify({"transactions": transactions})


# ---------- HTML form to upload CSV (for testing) ----------
@app.route("/upload", methods=["GET"])
def upload_form():
    return """
    <!DOCTYPE html>
    <html>
      <head>
        <title>Upload CSV</title>
      </head>
      <body>
        <h1>Upload bank statement CSV</h1>
        <form action="/upload-csv" method="post" enctype="multipart/form-data">
          <input type="file" name="file" accept=".csv" />
          <button type="submit">Upload</button>
        </form>
      </body>
    </html>
    """


# ---------- Handle uploaded CSV: parse + SAVE TO DB ----------
@app.route("/upload-csv", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Read CSV content
    text_stream = io.StringIO(file.stream.read().decode("utf-8"))
    reader = csv.DictReader(text_stream)

    saved_transactions = []

    for row in reader:
        date = row.get("date", "")
        description = row.get("description", "")
        amount = float(row.get("amount", 0) or 0)
        category = categorize_transaction(description, amount)

        # Create a Transaction object (row in DB)
        tx = Transaction(
            date=date,
            description=description,
            amount=amount,
            category=category,
        )

        db.session.add(tx)
        saved_transactions.append({
            "date": date,
            "description": description,
            "amount": amount,
            "category": category,
        })

    db.session.commit()  # actually write to finance.db

    return jsonify({
        "saved": True,
        "count": len(saved_transactions),
        "transactions": saved_transactions,
    })


# ---------- New API: get all transactions FROM DB ----------
@app.route("/api/transactions", methods=["GET"])
def get_transactions_from_db():
    transactions = Transaction.query.order_by(Transaction.date).all()
    data = [t.to_dict() for t in transactions]
    return jsonify({"transactions": data})


def get_category_totals_dict():
    """
    Returns a dict: {category: total_amount}
    Negative = net expense, positive = net income.
    """
    rows = (
        db.session.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total_amount")
        )
        .group_by(Transaction.category)
        .all()
    )

    totals = {}
    for row in rows:
        totals[row.category] = float(row.total_amount)
    return totals



@app.route("/api/summary/categories", methods=["GET"])
def get_category_summary():
    totals = get_category_totals_dict()

    summary = []
    for idx, (category, total) in enumerate(totals.items(), start=1):
        summary.append({
            "id": idx,
            "category": category,
            "total": total,
        })

    return jsonify({"summary": summary})



@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    """
    Very simple forecast:
    - For each expense category, use current spending and assume 5% increase next month.
    - Also compute total income, total expense, and savings now vs forecast.
    """

    # Sum amounts per category
    rows = (
        db.session.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total_amount")
        )
        .group_by(Transaction.category)
        .all()
    )

    income_total = 0.0
    expense_total = 0.0
    category_forecast = []

    for row in rows:
        total = float(row.total_amount)

        if total >= 0:
            # treat positive totals as income categories
            income_total += total
        else:
            # negative -> expenses
            current_spend = abs(total)
            forecast_spend = current_spend * 1.05  # assume 5% growth
            expense_total += current_spend

            category_forecast.append({
                "category": row.category,
                "current_spend": current_spend,
                "forecast_spend": forecast_spend,
            })

    forecast_expense_total = expense_total * 1.05
    current_saving = income_total - expense_total
    forecast_saving = income_total - forecast_expense_total

    result = {
        "categories": category_forecast,
        "totals": {
            "income": income_total,
            "expense": expense_total,
            "forecast_expense": forecast_expense_total,
            "current_saving": current_saving,
            "forecast_saving": forecast_saving,
        },
    }

    return jsonify(result)


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Very simple rule-based chatbot.
    It understands a few types of questions using existing data:
      - "how much did i spend on <category>?"
      - "total income"
      - "total expense"
      - "current saving" / "forecast saving"
    """
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"answer": "Please type a question."}), 400

    q = question.lower()

    # Get summary data from helpers
    category_totals = get_category_totals_dict()

    # Reuse forecast totals
    forecast_data = get_forecast().json  # call the function directly

    # 1) "How much did I spend on Food & Dining?"
    if "spend on" in q or "spent on" in q:
        # try to match category names roughly
        best_category = None
        for category in category_totals.keys():
            if category.lower() in q:
                best_category = category
                break

        if best_category is None:
            return jsonify({
                "answer": "I couldn't detect the category. Try like: 'How much did I spend on Food & Dining?'"
            })

        total = category_totals[best_category]
        # spending = negative totals
        spent = abs(total) if total < 0 else 0
        return jsonify({
            "answer": f"You spent ₹{spent:.2f} on {best_category} in the current data."
        })

    # 2) Total income
    if "total income" in q or "how much did i earn" in q:
        income = 0.0
        for total in category_totals.values():
            if total > 0:
                income += total
        return jsonify({
            "answer": f"Your total income in the current data is ₹{income:.2f}."
        })

    # 3) Total expense
    if "total expense" in q or "how much did i spend in total" in q:
        expense = 0.0
        for total in category_totals.values():
            if total < 0:
                expense += abs(total)
        return jsonify({
            "answer": f"Your total expense in the current data is ₹{expense:.2f}."
        })

    # 4) Savings
    if "saving" in q:
        current_saving = forecast_data["totals"]["current_saving"]
        forecast_saving = forecast_data["totals"]["forecast_saving"]
        return jsonify({
            "answer": (
                f"Your current saving is ₹{current_saving:.2f}. "
                f"Based on a simple forecast, next month saving is estimated at ₹{forecast_saving:.2f}."
            )
        })

    # Default fallback
    return jsonify({
        "answer": "I can answer things like: 'How much did I spend on Food & Dining?', "
                  "'What is my total income?', 'What is my total expense?', or 'What are my savings?'."
    })



@app.route("/api/goals", methods=["GET"])
def get_goals():
    goals = Goal.query.order_by(Goal.category).all()
    return jsonify({"goals": [g.to_dict() for g in goals]})


@app.route("/api/goals", methods=["POST"])
def create_or_update_goal():
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

    # If a goal for this category already exists, update it
    goal = Goal.query.filter_by(category=category).first()
    if goal:
        goal.monthly_limit = monthly_limit
    else:
        goal = Goal(category=category, monthly_limit=monthly_limit)
        db.session.add(goal)

    db.session.commit()

    return jsonify({"goal": goal.to_dict()}), 201

@app.route("/api/reset", methods=["POST"])
def reset_transactions():
    """
    Delete all transactions from the database.
    Goals stay as they are.
    """
    deleted = db.session.query(Transaction).delete()
    db.session.commit()
    return jsonify({"success": True, "deleted": deleted})


# ---------- Main entry ----------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # for local dev; okay

# For the report: mention that debug=False would be used in deployment.
