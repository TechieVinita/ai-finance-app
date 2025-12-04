// src/components/ProfileSection.jsx
import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

function ProfileSection({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const [createdAt, setCreatedAt] = useState("");

  // Load profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile.");
          return;
        }

        const p = data.profile;
        setEmail(p.email || "");
        setFullName(p.full_name || "");
        setPhone(p.phone || "");
        setDefaultCurrency(p.default_currency || "INR");
        setCreatedAt(p.created_at || "");
      } catch (err) {
        console.error(err);
        setError("Network error while loading profile.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchProfile();
    }
  }, [token]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          default_currency: defaultCurrency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
        return;
      }

      setMessage(data.message || "Profile updated.");
    } catch (err) {
      console.error(err);
      setError("Network error while updating profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Your Profile</h2>
      <p className="card-subtitle">
        Basic information used to personalise your dashboard. This is per-account and
        not visible to other users.
      </p>

      {loading ? (
        <p>Loading profile...</p>
      ) : (
        <form
          onSubmit={handleSave}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div className="form-row">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              style={{ opacity: 0.7, cursor: "not-allowed" }}
            />
            <small className="hint">
              Email is fixed for now. If you want email change, contact support (in a
              real product).
            </small>
          </div>

          <div className="form-row">
            <label>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vinita Deora"
            />
          </div>

          <div className="form-row">
            <label>Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="form-row">
            <label>Default currency</label>
            <input
              type="text"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
              placeholder="INR"
            />
            <small className="hint">
              3-letter currency code like INR, USD, EUR. Currently only label, not a
              full converter.
            </small>
          </div>

          {createdAt && (
            <p className="meta-text">
              Account created:{" "}
              {new Date(createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}

          {error && <p className="status-text error">{error}</p>}
          {message && <p className="status-text success">{message}</p>}

          <button
            type="submit"
            className="btn primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      )}
    </div>
  );
}

export default ProfileSection;
