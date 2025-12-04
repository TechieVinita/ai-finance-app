// src/components/InsightsSection.jsx
import React from "react";

function InsightsSection({ categorySummary, forecast }) {
  if (!categorySummary || categorySummary.length === 0) {
    return (
      <div className="card">
        <h2>Insights</h2>
        <p>Upload a CSV or change the filters to see personalised insights.</p>
      </div>
    );
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let biggestCategory = null;

  categorySummary.forEach((item) => {
    if (item.total > 0) totalIncome += item.total;
    if (item.total < 0) {
      const abs = Math.abs(item.total);
      totalExpense += abs;
      if (!biggestCategory || abs > biggestCategory.amount) {
        biggestCategory = { name: item.category, amount: abs };
      }
    }
  });

  const saving = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? (saving / totalIncome) * 100 : 0;

  const forecastSaving =
    forecast && forecast.totals ? forecast.totals.forecast_saving : null;

  return (
    <div className="card">
      <h2>Key Insights</h2>
      <ul className="insights-list">
        {biggestCategory && (
          <li>
            <strong>Biggest expense:</strong>{" "}
            {biggestCategory.name} (₹{biggestCategory.amount.toFixed(2)})
          </li>
        )}
        <li>
          <strong>Income vs Expense:</strong>{" "}
          You earned ₹{totalIncome.toFixed(2)} and spent ₹
          {totalExpense.toFixed(2)} in this period.
        </li>
        <li>
          <strong>Savings rate:</strong>{" "}
          {saving >= 0 ? (
            <>
              You saved ₹{saving.toFixed(2)} (~
              {savingRate.toFixed(1)}% of income).
            </>
          ) : (
            <>
              You overspent by ₹{Math.abs(saving).toFixed(2)}. Try reducing one
              or two big categories this month.
            </>
          )}
        </li>
        {forecastSaving !== null && (
          <li>
            <strong>Next month outlook:</strong>{" "}
            Based on this pattern, we estimate savings of ₹
            {forecastSaving.toFixed(2)} next month (simple +5% expense model).
          </li>
        )}
      </ul>
    </div>
  );
}

export default InsightsSection;
