import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL = "https://backend-connectify.up.railway.app/api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    if (!form.name.trim()) return "Full name is required";
    if (form.name.trim().length < 2) return "Full name must be at least 2 characters";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) return "Email is required";
    if (!emailRegex.test(form.email.trim())) return "Please enter a valid email address";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    const err = validate();
    if (err) {
      setMsg({ text: err, type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!data.success) {
        setMsg({ text: data.message || "Signup failed", type: "error" });
      } else {
        setMsg({ text: "Signup successful! Redirecting...", type: "success" });
        setTimeout(() => navigate("/login"), 1700);
      }
    } catch (e) {
      setMsg({ text: "Server error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function togglePassword() {
    setShowPass((v) => !v);
  }

  return (
    <div className="signup-bg">
      <form className="signup-card" autoComplete="off" onSubmit={handleSubmit}>
        <div className="signup-logo">
          <span style={{ fontSize: "1.2em" }}>💬</span>
          Connectify
        </div>
        <div className="signup-title">Sign up</div>
        <div
          className={
            "signup-toast " +
            (msg.type === "success"
              ? "toast-success"
              : msg.type === "error"
              ? "toast-error"
              : "")
          }
          style={{
            display: msg.text ? "block" : "none",
            marginBottom: 3,
            minHeight: 22,
            textAlign: "center",
            fontSize: "0.96em"
          }}
        >
          {msg.text}
        </div>
        <div className="input-group">
          <label htmlFor="fullname">Full Name</label>
          <input
            id="fullname"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@email.com"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>
        <div className="input-group" style={{ position: "relative" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <button
            type="button"
            className="show-pass-toggle"
            tabIndex={-1}
            aria-label="Show/hide password"
            title="Show/Hide Password"
            onClick={togglePassword}
            style={{ position: "absolute", right: 13, top: 36, background: "none", border: "none" }}
            disabled={loading}
          >
            {showPass ? (
              <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
                <path d="M1.5 12C3.5 7 7.5 4 12 4s8.5 3 10.5 8c-2 5-6 8-10.5 8S3.5 17 1.5 12z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
                <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" width={20} height={20}>
                <path d="M1.5 12C3.5 7 7.5 4 12 4s8.5 3 10.5 8c-2 5-6 8-10.5 8S3.5 17 1.5 12z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>
        <button
          className="signup-btn"
          type="submit"
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>
        <button
          type="button"
          className="toggle-theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          disabled={loading}
        >
          {theme === "dark" ? "🌞 Switch to Light" : "🌙 Switch to Dark"}
        </button>
        <div className="login-link">
          Already have an account?
          <Link to="/login" style={{ marginLeft: 3, color: "var(--primary)" }}>Log In</Link>
        </div>
      </form>
      <style>{`
        :root {
          --bg: #f4f8fb;
          --card-bg: #fff;
          --primary: #1976d2;
          --primary-hover: #115293;
          --border: #e0e0e0;
          --input-bg: #f6f8fa;
          --input-border: #bbb;
          --text: #222;
          --error: #e53935;
          --shadow: 0 2px 12px 0 rgba(25, 118, 210, 0.11);
        }
        body.dark {
          --bg: #181f28;
          --card-bg: #222b38;
          --primary: #1976d2;
          --primary-hover: #1565c0;
          --border: #313c4f;
          --input-bg: #202837;
          --input-border: #444c5a;
          --text: #e0e8f4;
          --error: #ff5252;
          --shadow: 0 2px 14px 0 rgba(25, 118, 210, 0.23);
        }
        .signup-bg {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .signup-card {
          background: var(--card-bg);
          padding: 28px 18px 22px 18px;
          border-radius: 13px;
          box-shadow: var(--shadow);
          min-width: 0;
          width: 100%;
          max-width: 340px;
          border: 1.2px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: stretch;
          transition: background 0.2s, border 0.2s;
          position: relative;
        }
        .signup-logo {
          display: flex;
          align-items: center;
          gap: 7px;
          justify-content: center;
          font-size: 1.55em;
          font-weight: bold;
          color: var(--primary);
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .signup-title {
          text-align: center;
          font-size: 1.08em;
          font-weight: 500;
          margin-bottom: 14px;
          letter-spacing: 0.2px;
          color: var(--text);
        }
        .signup-card label {
          font-size: 0.98em;
          margin-bottom: 2px;
          color: var(--text);
          font-weight: 500;
          letter-spacing: 0.2px;
          margin-top: 3px;
        }
        .signup-card input[type="text"],
        .signup-card input[type="email"],
        .signup-card input[type="password"] {
          width: 100%;
          padding: 9px 38px 9px 9px;
          border: 1.2px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text);
          border-radius: 6px;
          font-size: 0.98em;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          letter-spacing: 0.1px;
          transition: border 0.2s, background 0.2s, color 0.2s;
        }
        .signup-card input[type="text"]:focus,
        .signup-card input[type="email"]:focus,
        .signup-card input[type="password"]:focus {
          border-color: var(--primary);
          background: #e3f2fd;
        }
        body.dark .signup-card input[type="text"]:focus,
        body.dark .signup-card input[type="email"]:focus,
        body.dark .signup-card input[type="password"]:focus {
          background: #25304a;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
          margin-bottom: 2px;
          position: relative;
        }
        .show-pass-toggle {
          position: absolute;
          right: 9px;
          top: 32px;
          height: 22px;
          width: 22px;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--input-border);
          transition: color 0.2s;
          z-index: 3;
        }
        .show-pass-toggle:hover,
        .show-pass-toggle:focus {
          color: var(--primary);
        }
        .show-pass-toggle svg {
          display: block;
          width: 18px;
          height: 18px;
          pointer-events: none;
        }
        .signup-btn {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 1.05em;
          font-weight: bold;
          padding: 10px 0;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.07);
          letter-spacing: 0.4px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .signup-btn:hover,
        .signup-btn:focus {
          background: var(--primary-hover);
          box-shadow: 0 3px 16px rgba(25, 118, 210, 0.12);
        }
        .toggle-theme {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 0.98em;
          cursor: pointer;
          align-self: flex-end;
          margin-top: 0;
          margin-bottom: 2px;
          transition: color 0.2s;
        }
        .toggle-theme:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }
        .login-link {
          text-align: center;
          margin-top: 7px;
          font-size: 0.99em;
          color: var(--text);
        }
        .login-link a {
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          margin-left: 3px;
          transition: color 0.2s;
        }
        .login-link a:hover { text-decoration: underline; color: var(--primary-hover);}
        .signup-toast {
          padding: 6px 0;
          border-radius: 6px;
          font-size: 0.99em;
          font-weight: 500;
          transition: background 0.18s, color 0.18s;
        }
        .toast-success {
          color: #43a047;
        }
        .toast-error {
          color: #e53935;
        }
        @media (max-width: 450px) {
          .signup-card {
            max-width: 98vw;
            padding: 18px 2vw 14px 2vw;
          }
        }
      `}</style>
    </div>
  );
}
