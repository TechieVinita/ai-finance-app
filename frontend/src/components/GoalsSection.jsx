import React from "react";
import SectionCard from "./SectionCard";

function GoalsSection({
  goalCategory,
  setGoalCategory,
  goalLimit,
  setGoalLimit,
  goalMessage,
  onSubmit,
  goalsWithUsage,
}) {
  return (
    <SectionCard
      title="Spending Goals"
      subtitle="Define monthly limits and track how close you are."
    >
      <form className="form-vertical" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Category</span>
          <input
            type="text"
            value={goalCategory}
            onChange={(e) => setGoalCategory(e.target.value)}
            placeholder='e.g. "Food & Dining"'
          />
        </label>
        <label className="form-field">
          <span>Monthly Limit (₹)</span>
          <input
            type="number"
            value={goalLimit}
            onChange={(e) => setGoalLimit(e.target.value)}
            placeholder="e.g. 5000"
          />
        </label>
        <button type="submit" className="btn primary">
          Save Goal
        </button>
        {goalMessage && <p className="helper-text">{goalMessage}</p>}
      </form>

      {goalsWithUsage.length > 0 && (
        <>
          <h3 className="card-subheading">Goals vs Actual Spending</h3>
          <div className="table-wrapper">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Limit</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {goalsWithUsage.map((g) => (
                  <tr key={g.id}>
                    <td>{g.category}</td>
                    <td>{g.monthly_limit}</td>
                    <td>{g.spent}</td>
                    <td>{g.remaining}</td>
                    <td className={g.status === "Over limit" ? "negative" : "positive"}>
                      {g.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

export default GoalsSection;
