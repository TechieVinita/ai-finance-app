import React, { useEffect, useState } from "react";
import "./App.css";

import UploadSection from "./components/UploadSection";
import TransactionsTable from "./components/TransactionsTable";
import CategorySummary from "./components/CategorySummary";
import SpendingChart from "./components/SpendingChart";
import GoalsSection from "./components/GoalsSection";
import ForecastSection from "./components/ForecastSection";
import ChatbotSection from "./components/ChatbotSection";

// const API_BASE = "http://127.0.0.1:5000";

import { API_BASE } from "./config";


function App() {
  const [transactions, setTransactions] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [goals, setGoals] = useState([]);
  const [forecast, setForecast] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [goalCategory, setGoalCategory] = useState("");
  const [goalLimit, setGoalLimit] = useState("");
  const [goalMessage, setGoalMessage] = useState("");

  // Upload/reset state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Chatbot state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { from: "bot", text: "Hi! Ask me about your spending, income, or savings." },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // -------- Helper: fetch all data --------
  const reloadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [txRes, sumRes, goalsRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions`),
        fetch(`${API_BASE}/api/summary/categories`),
        fetch(`${API_BASE}/api/goals`),
        fetch(`${API_BASE}/api/forecast`),
      ]);

      if (!txRes.ok) throw new Error(`Transactions HTTP error: ${txRes.status}`);
      if (!sumRes.ok) throw new Error(`Summary HTTP error: ${sumRes.status}`);
      if (!goalsRes.ok) throw new Error(`Goals HTTP error: ${goalsRes.status}`);
      if (!forecastRes.ok) throw new Error(`Forecast HTTP error: ${forecastRes.status}`);

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
  }, []);

  // -------- Derived data --------
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

  // -------- Goals handlers --------
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
        headers: { "Content-Type": "application/json" },
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

      const goalsRes = await fetch(`${API_BASE}/api/goals`);
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

  // -------- Upload / Reset handlers --------
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
      const res = await fetch(`${API_BASE}/api/reset`, { method: "POST" });
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

  // -------- Chatbot handler --------
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
        headers: { "Content-Type": "application/json" },
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

  // -------- UI --------
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>AI Finance Dashboard</h1>
        <p className="app-subtitle">
          Smart personal finance from CSV to insights — upload, analyse, set goals, forecast and chat.
        </p>
        <p className="app-data-endpoints">
          APIs: <code>/api/transactions</code>, <code>/api/summary/categories</code>,{" "}
          <code>/api/goals</code>, <code>/api/forecast</code>, <code>/api/chat</code>
        </p>
      </header>

      {loading && <p className="status-text">Loading data...</p>}
      {error && <p className="status-text error">{error}</p>}

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
    </div>
  );
}

export default App;
