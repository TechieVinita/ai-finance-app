// src/components/AuthScreen.jsx
import React, { useState } from "react";
import { API_BASE } from "../config";

function AuthScreen({ onAuthSuccess }) {
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ----- Normal login / signup -----
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

      onAuthSuccess(data.token);
    } catch (err) {
      console.error(err);
      setAuthMessage("Network error.");
    } finally {
      setAuthLoading(false);
    }
  }

  // ----- Demo login -----
  async function handleDemoLogin() {
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "demo@example.com",
          password: "demo123",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setAuthMessage(data.error || "Demo login failed.");
        return;
      }

      onAuthSuccess(data.token);
    } catch (err) {
      console.error(err);
      setAuthMessage("Network error during demo login.");
    } finally {
      setAuthLoading(false);
    }
  }

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

        {/* Mode toggle */}
        <div style={{ marginBottom: "14px" }}>
          <button
            onClick={() => setAuthMode("login")}
            style={{
              padding: "6px 12px",
              marginRight: "8px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: authMode === "login" ? "#22c55e" : "#111827",
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
              backgroundColor: authMode === "signup" ? "#22c55e" : "#111827",
              color: "white",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Sign up
          </button>
        </div>

        {/* Email + password form */}
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

        {/* Error / status message */}
        {authMessage && (
          <p
            style={{
              marginTop: "10px",
              color: "#f97316",
              fontSize: "0.85rem",
            }}
          >
            {authMessage}
          </p>
        )}

        {/* Demo login button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={authLoading}
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            borderRadius: "999px",
            border: "1px solid #374151",
            backgroundColor: "#020617",
            color: "white",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {authLoading ? "Logging in..." : "Login as demo user"}
        </button>

        <p
          style={{
            marginTop: "20px",
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          You can create your own account with any email, or use the demo
          user to explore the dashboard quickly.
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;
