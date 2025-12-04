// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import "../App.css";

import UploadSection from "./UploadSection";
import TransactionsTable from "./TransactionsTable";
import CategorySummary from "./CategorySummary";
import SpendingChart from "./SpendingChart";
import GoalsSection from "./GoalsSection";
import ForecastSection from "./ForecastSection";
import ChatbotSection from "./ChatbotSection";
import InsightsSection from "./InsightsSection";
import ProfileSection from "./ProfileSection";



import { API_BASE } from "../config";

function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "profile"

  const [transactions, setTransactions] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [goals, setGoals] = useState([]);
  const [forecast, setForecast] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [goalCategory, setGoalCategory] = useState("");
  const [goalLimit, setGoalLimit] = useState("");
  const [goalMessage, setGoalMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { from: "bot", text: "Hi! Ask me about your spending, income, or savings." },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // --- NEW: month/year filter state ---
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // ---------- Load data ----------
  const reloadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const commonHeaders = {
        Authorization: `Bearer ${token}`,
      };

      // Build query string based on filters
      const params = new URLSearchParams();
      if (filterMonth) params.set("month", filterMonth);
      if (filterYear) params.set("year", filterYear);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [txRes, sumRes, goalsRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions${qs}`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/summary/categories${qs}`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/goals`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/forecast${qs}`, { headers: commonHeaders }),
      ]);

      if (!txRes.ok) throw new Error(`Transactions HTTP error: ${txRes.status}`);
      if (!sumRes.ok) throw new Error(`Summary HTTP error: ${sumRes.status}`);
      if (!goalsRes.ok) throw new Error(`Goals HTTP error: ${goalsRes.status}`);
      if (!forecastRes.ok)
        throw new Error(`Forecast HTTP error: ${forecastRes.status}`);

      const txData = await txRes.json();
      const sumData = await sumRes.json();
      const goalsData = await goalsRes.json();
      const forecastData = await forecastRes.json();

      setTransactions(txData.transactions || []);
      setCategorySummary(sumData.summary || []);
      setGoals(goalsData.goals || []);
      setForecast(forecastData || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load data from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
    // reload when token changes (user login) or filter changes
  }, [token, filterMonth, filterYear]);

  // ---------- Derived data ----------
  const expenseSummary = categorySummary.filter((item) => item.total < 0);

  const chartData = {
    labels: expenseSummary.map((item) => item.category),
    datasets: [
      {
        label: "Total Spending (₹, absolute)",
        data: expenseSummary.map((item) => Math.abs(item.total)),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
  };

  const expenseByCategory = {};
  categorySummary.forEach((item) => {
    const amount = item.total < 0 ? Math.abs(item.total) : 0;
    expenseByCategory[item.category] = amount;
  });

  const goalsWithUsage = goals.map((g) => {
    const spent = expenseByCategory[g.category] || 0;
    const remaining = g.monthly_limit - spent;
    const status = remaining >= 0 ? "OK" : "Over limit";
    return { ...g, spent, remaining, status };
  });

  // ---------- Goals ----------
  async function handleAddGoal(e) {
    e.preventDefault();
    setGoalMessage("");

    const trimmedCategory = goalCategory.trim();
    if (!trimmedCategory || !goalLimit) {
      setGoalMessage("Please fill both category and limit.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: trimmedCategory,
          monthly_limit: parseFloat(goalLimit),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGoalMessage(data.error || "Failed to save goal.");
        return;
      }

      const goalsRes = await fetch(`${API_BASE}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const goalsData = await goalsRes.json();
      setGoals(goalsData.goals || []);

      setGoalMessage("Goal saved.");
      setGoalCategory("");
      setGoalLimit("");
    } catch (err) {
      console.error(err);
      setGoalMessage("Network error while saving goal.");
    }
  }

  // ---------- Upload / Reset ----------
  function handleFileChange(file) {
    setSelectedFile(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setUploadMessage("");

    if (!selectedFile) {
      setUploadMessage("Please select a CSV file first.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${API_BASE}/upload-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadMessage(data.error || "Upload failed.");
      } else {
        setUploadMessage(`Uploaded ${data.count || 0} transactions.`);
        await reloadData();
      }
    } catch (err) {
      console.error(err);
      setUploadMessage("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    setUploadMessage("");

    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/api/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadMessage("Reset failed.");
      } else {
        setUploadMessage(`All transactions deleted (rows: ${data.deleted}).`);
        await reloadData();
      }
    } catch (err) {
      console.error(err);
      setUploadMessage("Network error during reset.");
    } finally {
      setUploading(false);
    }
  }

  // ---------- Chatbot ----------
  async function handleChatSubmit(e) {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatMessages((msgs) => [...msgs, { from: "user", text: trimmed }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      const answer =
        data.answer || "Sorry, I couldn't understand that question.";

      setChatMessages((msgs) => [...msgs, { from: "bot", text: answer }]);
    } catch (err) {
      console.error(err);
      setChatMessages((msgs) => [
        ...msgs,
        { from: "bot", text: "Network error while asking the backend." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="app-root">
      {/* Logout pill */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 16,
          zIndex: 50,
        }}
      >
        <button
          onClick={onLogout}
          className="btn subtle"
          style={{ fontSize: "0.8rem", paddingInline: "10px" }}
        >
          Logout
        </button>
      </div>

      <header className="app-header">
        <h1>AI Finance Dashboard</h1>
        <p className="app-subtitle">
          Smart personal finance from CSV to insights — upload, analyse, set goals,
          forecast and chat.
        </p>
        <p className="app-data-endpoints">
          APIs: <code>/api/transactions</code>, <code>/api/summary/categories</code>,{" "}
          <code>/api/goals</code>, <code>/api/forecast</code>, <code>/api/chat</code>
        </p>
      </header>

            {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
      </div>


      {/* --- NEW: Filters bar --- */}
      {/* --- Filters bar --- */}
      <section className="filters-bar">
        <div className="filters-left">
          <span className="filters-label">Filter period</span>

          <div className="filters-controls">
            <div className="filters-field">
              <span className="field-label">Month</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">All</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">May</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Aug</option>
                <option value="9">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </div>

            <div className="filters-field">
              <span className="field-label">Year</span>
              <input
                type="number"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>
        </div>

        <div className="filters-actions">
          <button
            type="button"
            className="btn filter-apply"
            onClick={reloadData}
          >
            Apply
          </button>
          <button
            type="button"
            className="btn filter-clear"
            onClick={() => {
              setFilterMonth("");
              setFilterYear("");
            }}
          >
            Clear
          </button>
        </div>
      </section>







      {loading && activeTab === "overview" && (
        <p className="status-text">Loading data...</p>
      )}
      {error && activeTab === "overview" && (
        <p className="status-text error">{error}</p>
      )}

      {activeTab === "overview" && (
        <main className="app-content">
          <UploadSection
            uploading={uploading}
            uploadMessage={uploadMessage}
            onFileChange={handleFileChange}
            onUpload={handleUpload}
            onReset={handleReset}
          />

          <section className="grid-2">
            <TransactionsTable transactions={transactions} />
            <CategorySummary categorySummary={categorySummary} />
          </section>

          <section className="grid-2">
            <SpendingChart
              hasData={expenseSummary.length > 0}
              chartData={chartData}
              chartOptions={chartOptions}
            />
            <GoalsSection
              goalCategory={goalCategory}
              setGoalCategory={setGoalCategory}
              goalLimit={goalLimit}
              setGoalLimit={setGoalLimit}
              goalMessage={goalMessage}
              onSubmit={handleAddGoal}
              goalsWithUsage={goalsWithUsage}
            />
          </section>

          <section className="grid-2">
            <ForecastSection forecast={forecast} />
            <ChatbotSection
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              chatLoading={chatLoading}
              onSubmit={handleChatSubmit}
            />
          </section>
        </main>
      )}

      {activeTab === "profile" && (
        <main className="app-content">
          <ProfileSection token={token} />
        </main>
      )}


    </div>
  );
}

export default Dashboard;
