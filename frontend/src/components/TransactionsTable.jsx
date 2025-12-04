import React from "react";
import SectionCard from "./SectionCard";

function TransactionsTable({ transactions }) {
  return (
    <SectionCard
      title="All Transactions"
      subtitle="Raw data extracted and categorised from your bank statement."
    >
      {transactions.length === 0 ? (
        <p className="helper-text">No transactions yet. Upload a CSV to get started.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.date}</td>
                  <td>{tx.description}</td>
                  <td className={tx.amount < 0 ? "negative" : "positive"}>
                    {tx.amount}
                  </td>
                  <td>{tx.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default TransactionsTable;
