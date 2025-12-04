# AI Finance Dashboard – CSV to Insights

A full-stack personal finance dashboard that ingests bank statement CSVs, categorises transactions, visualises spending, lets you set monthly goals, forecasts next month, and provides a simple rule-based finance chatbot.

## Tech Stack

- **Backend:** Python, Flask, Flask-SQLAlchemy, SQLite, pandas
- **Frontend:** React (Vite), modern responsive UI (pure CSS)
- **Database:** SQLite file (local)
- **Architecture:** REST APIs between Flask backend and React frontend

## Features

1. **CSV Upload**
   - Upload bank statement CSV from the dashboard.
   - Backend parses, normalises, and stores transactions in SQLite.

2. **Transactions View**
   - Table of all transactions with date, description, amount, category.
   - Negative amounts in red, positive in green.

3. **Category Summary & Chart**
   - Net total for each category (income positive, spending negative).
   - Bar chart visualising spending per category.

4. **Spending Goals**
   - Define monthly limit per category.
   - Table shows limit, spent, remaining, and status (OK / Over limit).

5. **Simple Forecast**
   - Baseline model: assumes next month’s spending is 5% higher per category.
   - Shows forecast per category and overall income/expense/saving.

6. **Smart Finance Assistant (Chatbot)**
   - Rule-based Q&A on top of current data.
   - Example: “How much did I spend on Food & Dining?”, “What is my total income?”, “What are my savings?”

## How to Run (Local)

### 1. Backend (Flask)

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # on Windows
pip install -r requirements.txt
python app.py
