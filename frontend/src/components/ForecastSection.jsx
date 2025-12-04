import React from "react";
import SectionCard from "./SectionCard";

function ForecastSection({ forecast }) {
  return (
    <SectionCard
      title="Forecast (Next Month)"
      subtitle="Simple baseline: assumes next month’s spending is 5% higher than current."
    >
      {!forecast || !forecast.categories || forecast.categories.length === 0 ? (
        <p className="helper-text">No forecast yet — upload some data first.</p>
      ) : (
        <>
          <h3 className="card-subheading">Per Category</h3>
          <div className="table-wrapper">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Current Spend</th>
                  <th>Forecast Spend</th>
                </tr>
              </thead>
              <tbody>
                {forecast.categories.map((c) => (
                  <tr key={c.category}>
                    <td>{c.category}</td>
                    <td>{c.current_spend.toFixed(2)}</td>
                    <td>{c.forecast_spend.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="card-subheading">Overall Summary</h3>
          <div className="table-wrapper">
            <table className="data-table compact">
              <tbody>
                <tr>
                  <td>Total Income</td>
                  <td>{forecast.totals.income.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Current Total Expense</td>
                  <td>{forecast.totals.expense.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Forecast Total Expense</td>
                  <td>{forecast.totals.forecast_expense.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Current Saving</td>
                  <td>{forecast.totals.current_saving.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Forecast Saving</td>
                  <td>{forecast.totals.forecast_saving.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

export default ForecastSection;
