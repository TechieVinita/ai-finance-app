import React from "react";
import SectionCard from "./SectionCard";

function CategorySummary({ categorySummary }) {
  return (
    <SectionCard
      title="Category Summary"
      subtitle="Net amount per category (income positive, spend negative)."
    >
      {categorySummary.length === 0 ? (
        <p className="helper-text">No summary available yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((item) => (
                <tr key={item.id}>
                  <td>{item.category}</td>
                  <td className={item.total < 0 ? "negative" : "positive"}>
                    {item.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default CategorySummary;
