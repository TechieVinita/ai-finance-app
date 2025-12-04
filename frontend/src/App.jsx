// src/App.jsx
import React, { useState } from "react";
import "./App.css";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  const isLoggedIn = !!token;

  function handleAuthSuccess(newToken) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
  }

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}

export default App;
