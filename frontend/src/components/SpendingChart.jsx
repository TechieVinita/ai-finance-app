import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import SectionCard from "./SectionCard";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function SpendingChart({ hasData, chartData, chartOptions }) {
  return (
    <SectionCard
      title="Spending by Category"
      subtitle="Visual breakdown of where your money is going."
    >
      {!hasData ? (
        <p className="helper-text">No expense data yet.</p>
      ) : (
        <div className="chart-wrapper">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </SectionCard>
  );
}

export default SpendingChart;
