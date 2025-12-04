import React, { useEffect, useState } from "react";
import "./App.css";

import UploadSection from "./components/UploadSection";
import TransactionsTable from "./components/TransactionsTable";
import CategorySummary from "./components/CategorySummary";
import SpendingChart from "./components/SpendingChart";
import GoalsSection from "./components/GoalsSection";
import ForecastSection from "./components/ForecastSection";
import ChatbotSection from "./components/ChatbotSection";

import { API_BASE } from "./config";

// Simple auth + dashboard in one file

function App() {
  // ---------- Auth state ----------
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isLoggedIn = !!token;

  // ---------- Dashboard state ----------
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

  // ---------- AUTH HANDLERS ----------

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthMessage("");

    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter email and password.");
      return;
    }

    const endpoint =
      authMode === "login" ? "/api/auth/login" : "/api/auth/signup";

    try {
      setAuthLoading(true);

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthMessage(data.error || "Something went wrong.");
        return;
      }

      if (!data.token) {
        setAuthMessage("No token returned from server.");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setAuthMessage(
        authMode === "login"
          ? "Logged in successfully."
          : "Account created and logged in."
      );
    } catch (err) {
      console.error(err);
      setAuthMessage("Network error.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setTransactions([]);
    setCategorySummary([]);
    setGoals([]);
    setForecast(null);
    setChatMessages([
      { from: "bot", text: "Hi! Ask me about your spending, income, or savings." },
    ]);
  }

  // ---------- DASHBOARD: LOAD DATA (only if logged in) ----------

  const reloadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const commonHeaders = {
        Authorization: `Bearer ${token}`,
      };

      const [txRes, sumRes, goalsRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/api/transactions`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/summary/categories`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/goals`, { headers: commonHeaders }),
        fetch(`${API_BASE}/api/forecast`, { headers: commonHeaders }),
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
    if (token) {
      reloadData();
    }
  }, [token]);

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

  // ---------- Goals handlers ----------
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

  // ---------- AUTH UI (if not logged in) ----------
  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1f2937 0, #020617 45%, #000 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: "#020617",
            padding: "28px 24px 28px",
            borderRadius: "16px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>
            AI Finance Dashboard
          </h1>
          <p style={{ margin: 0, marginBottom: "14px", color: "#9ca3af" }}>
            Upload your bank statements, track spending, set goals and get
            simple AI tips.
          </p>

          <div style={{ marginBottom: "14px" }}>
            <button
              onClick={() => setAuthMode("login")}
              style={{
                padding: "6px 12px",
                marginRight: "8px",
                borderRadius: "999px",
                border: "none",
                backgroundColor:
                  authMode === "login" ? "#22c55e" : "#111827",
                color: "white",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "none",
                backgroundColor:
                  authMode === "signup" ? "#22c55e" : "#111827",
                color: "white",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Sign up
            </button>
          </div>

          <form
            onSubmit={handleAuthSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>
                Email
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: "1px solid #374151",
                  backgroundColor: "#020617",
                  color: "white",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: "1px solid #374151",
                  backgroundColor: "#020617",
                  color: "white",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              style={{
                marginTop: "4px",
                padding: "9px 12px",
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(135deg, #22c55e, #16a34a, #4ade80)",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Sign up"}
            </button>
          </form>

          {authMessage && (
            <p style={{ marginTop: "10px", color: "#f97316", fontSize: "0.85rem" }}>
              {authMessage}
            </p>
          )}

          <p
            style={{
              marginTop: "20px",
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            You can create a test account with any email like{" "}
            <code>demo@example.com</code>. Each login has separate data.
          </p>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD UI WHEN LOGGED IN ----------
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
          onClick={handleLogout}
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
