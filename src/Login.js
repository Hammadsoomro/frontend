import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// Backend API URL
const API_URL = "https://backend-connectify.up.railway.app/api";

export default function Login() {
  // State for form fields and UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  const navigate = useNavigate();

  // Theme switching
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Login handler
  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (!validEmail.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    // API call to backend
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || "Login failed");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/inbox"); // React SPA redirect
      }
    } catch (e) {
      setErrorMsg("Server error. Please try again.");
    }
  }

  // Toggle password show/hide
  function togglePassword() {
    setShowPass((v) => !v);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form
        className="login-card"
        autoComplete="off"
        onSubmit={handleLogin}
        style={{ animation: "floatIn 0.6s cubic-bezier(.13,.7,.45,1.08)" }}
      >
        <div className="login-logo">
          {/* Replace the text with your logo image */}
            <img
              src={require("./logo1.png")}
              alt="Connectify Logo"
              style={{ height: 38, marginRight: 10 }}
            />
            <h3>Connectify</h3>
          </div>
          <div className="login-title">Welcome back! Please log in to continue</div>
          <div className="error-msg">{errorMsg}</div>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ position: "relative" }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="show-pass-toggle"
              tabIndex={-1}
              aria-label="Show/hide password"
              title="Show/Hide Password"
              onClick={togglePassword}
              style={{ position: "absolute", right: 13, top: 60, background: "none", border: "none" }}
            >
              {showPass ? (
              // Eye-off icon
              <svg viewBox="0 0 24 24" fill="none" width={22} height={22}>
                <path d="M1.5 12C3.5 7 7.5 4 12 4s8.5 3 10.5 8c-2 5-6 8-10.5 8S3.5 17 1.5 12z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
                <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              // Eye icon
              <svg viewBox="0 0 24 24" fill="none" width={22} height={22}>
                <path d="M1.5 12C3.5 7 7.5 4 12 4s8.5 3 10.5 8c-2 5-6 8-10.5 8S3.5 17 1.5 12z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>
        <button className="login-btn" type="submit">Log In</button>
        <button
          type="button"
          className="toggle-theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "🌞 Switch to Light" : "🌙 Switch to Dark"}
        </button>
        <div className="signup-link">
          Don't have an account?
          <Link to="/signup" style={{ marginLeft: 3, color: "var(--primary)" }}>Sign Up</Link>
        </div>
      </form>
      {/* Inline style required for animation */}
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
          --shadow: 0 4px 24px 0 rgba(25, 118, 210, 0.11);
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
          --shadow: 0 4px 28px 0 rgba(25, 118, 210, 0.23);
        }
        body {
          background: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          font-family: 'Segoe UI', 'Arial', sans-serif;
          transition: background 0.2s, color 0.2s;
        }
        .login-card {
          background: var(--card-bg);
          padding: 42px 36px 32px 36px;
          border-radius: 18px;
          box-shadow: var(--shadow);
          min-width: 340px;
          border: 1.2px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: stretch;
          transition: background 0.2s, border 0.2s;
          position: relative;
          max-width: 94vw;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          font-size: 2.1em;
          font-weight: bold;
          color: var(--primary);
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .login-title {
          text-align: center;
          font-size: 1.26em;
          font-weight: 500;
          margin-bottom: 22px;
          letter-spacing: 0.2px;
          color: var(--text);
        }
        .login-card label {
          font-size: 1em;
          margin-bottom: 5px;
          color: var(--text);
          font-weight: 500;
          letter-spacing: 0.2px;
          margin-top: 8px;
        }
        .login-card input[type="email"],
        .login-card input[type="password"],
        .login-card input[type="text"] {
          width: 100%;
          padding: 12px 44px 12px 14px;
          border: 1.2px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text);
          border-radius: 7px;
          font-size: 1.08em;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          letter-spacing: 0.1px;
          transition: border 0.2s, background 0.2s, color 0.2s;
        }
        .login-card input[type="email"]:focus,
        .login-card input[type="password"]:focus,
        .login-card input[type="text"]:focus {
          border-color: var(--primary);
          background: #e3f2fd;
        }
        body.dark .login-card input[type="email"]:focus,
        body.dark .login-card input[type="password"]:focus,
        body.dark .login-card input[type="text"]:focus {
          background: #25304a;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 5px;
          position: relative;
        }
        .show-pass-toggle {
          position: absolute;
          right: 13px;
          top: 36px;
          transform: translateY(-50%);
          height: 24px;
          width: 24px;
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
          width: 22px;
          height: 22px;
          pointer-events: none;
        }
        .login-card .login-btn {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 1.12em;
          font-weight: bold;
          padding: 14px 0;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 2px 10px rgba(25, 118, 210, 0.09);
          letter-spacing: 0.5px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .login-card .login-btn:hover,
        .login-card .login-btn:focus {
          background: var(--primary-hover);
          box-shadow: 0 3px 16px rgba(25, 118, 210, 0.15);
        }
        .login-card .toggle-theme {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 1em;
          cursor: pointer;
          align-self: flex-end;
          margin-top: 0;
          margin-bottom: 4px;
          transition: color 0.2s;
        }
        .login-card .toggle-theme:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }
        .login-card .error-msg {
          color: var(--error);
          font-size: 1em;
          min-height: 18px;
          text-align: left;
          margin-bottom: -8px;
          margin-top: -8px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        @media (max-width: 600px) {
          .login-card {
            min-width: 92vw;
            padding: 30px 5vw 22px 5vw;
          }
          .show-pass-toggle {
            right: 7vw;
          }
        }
        .login-card {
          animation: floatIn 0.6s cubic-bezier(.13,.7,.45,1.08);
        }
        @keyframes floatIn {
          0% { transform: translateY(30px) scale(0.98); opacity: 0; }
          70% { opacity: 1;}
          100% { transform: none; opacity: 1;}
        }
        .signup-link {
          text-align: center;
          margin-top: 10px;
          font-size: 1em;
          color: var(--text);
        }
        .signup-link a {
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          margin-left: 3px;
          transition: color 0.2s;
        }
        .signup-link a:hover { text-decoration: underline; color: var(--primary-hover);}
      `}</style>
    </div>
  );
}
