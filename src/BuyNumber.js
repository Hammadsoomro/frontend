import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8080/api";

export default function BuyNumber() {
  const navigate = useNavigate();
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [country, setCountry] = useState("US");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState("");
  const [status, setStatus] = useState("");
  const [userNumbers, setUserNumbers] = useState([]);

  // Fetch user's current numbers
  useEffect(() => {
    async function fetchMyNumbers() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/numbers/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setUserNumbers(data.numbers || []);
      } catch {
        setUserNumbers([]);
      }
    }
    fetchMyNumbers();
  }, []);

  // Fetch numbers from backend (Twilio search)
  async function fetchNumbers(e) {
    e && e.preventDefault();
    setSearching(true);
    setAvailableNumbers([]);
    setStatus("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        country: country.toUpperCase(), // Ensure uppercase for backend/Twilio
        contains: query.trim()
      });
      const res = await fetch(`${API_URL}/numbers/twilio-search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.numbers && data.numbers.length > 0) {
        setAvailableNumbers(data.numbers);
      } else {
        setStatus("No numbers found for this country or filter.");
      }
    } catch {
      setStatus("Could not fetch numbers. Please try again later.");
    }
    setSearching(false);
  }

  // Initial fetch on mount
  useEffect(() => {
    fetchNumbers();
    // eslint-disable-next-line
  }, []);

  // Handle buy number
  async function handleBuy(num) {
    setBuying(num);
    setStatus("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/numbers/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ number: num })
      });
      const data = await res.json();
      if (data.success) {
        setStatus("Number purchased and assigned to your account!");
        setUserNumbers(u => [...u, num]);
        setTimeout(() => navigate("/inbox"), 1200);
      } else {
        setStatus(data.message || "Could not buy number.");
      }
    } catch {
      setStatus("Could not buy number. Please try again.");
    }
    setBuying("");
  }

  // Country options (expand as per Twilio support)
  const countries = [
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    // Add more countries as needed
  ];

  return (
    <div className="buy-number-bg">
      <div className="buy-header">
        <h2>Buy a New Number</h2>
        <button className="back-btn" onClick={() => navigate("/inbox")}>← Back to Inbox</button>
      </div>
      <div className="buy-controls">
        <form style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }} onSubmit={fetchNumbers}>
          <label>
            Country:
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={{ marginLeft: 8, marginRight: 20 }}
            >
              {countries.map(c => (
                <option value={c.code} key={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Filter (digits, area code, etc)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ marginRight: 16, flex: 1 }}
            maxLength={14}
          />
          <button className="search-btn" type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      <div className="my-numbers">
        <b>Your Numbers:</b>
        {userNumbers.length === 0 && <span style={{ marginLeft: 8, color: "#888" }}>No numbers owned</span>}
        <ul>
          {userNumbers.map(num => <li key={num}>{num}</li>)}
        </ul>
      </div>

      <div className="available-numbers">
        <h3>Available Numbers</h3>
        {status && <div className="status-msg">{status}</div>}
        {availableNumbers.length > 0 ? (
          <table className="numbers-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Region</th>
                <th>Capabilities</th>
                <th>Monthly Fee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {availableNumbers.map((n) => (
                <tr key={n.phoneNumber}>
                  <td style={{ fontWeight: 600 }}>{n.friendlyName || n.phoneNumber}</td>
                  <td>{n.region || n.locality || "-"}</td>
                  <td>
                    {n.capabilities && Object.entries(n.capabilities)
                      .filter(([, v]) => v)
                      .map(([cap]) => cap).join(", ")}
                  </td>
                  <td>
                    {n.monthlyFee
                      ? (<span>{n.currency ? n.currency + " " : "$"}{n.monthlyFee} <span style={{color:"#888"}}>/month</span></span>)
                      : "N/A"}
                  </td>
                  <td>
                    <button
                      className="buy-btn"
                      disabled={buying === n.phoneNumber || userNumbers.includes(n.phoneNumber)}
                      onClick={() => handleBuy(n.phoneNumber)}
                    >
                      {userNumbers.includes(n.phoneNumber)
                        ? "Owned"
                        : (buying === n.phoneNumber ? "Buying..." : "Buy")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !status && (
          <div style={{ margin: "30px 0", color: "#888" }}>
            {searching ? "Searching..." : "No numbers to display."}
          </div>
        )}
      </div>
      <style>{`
        .buy-number-bg {
          min-height: 100vh;
          background: #f6f8fa;
          color: #222;
          padding: 0 0 40px 0;
        }
        .buy-header {
          display: flex; align-items: center; justify-content: space-between;
          background: #1976d2;
          color: #fff;
          padding: 24px 30px 20px 30px;
          border-bottom: 2px solid #115293;
        }
        .back-btn {
          background: #fff;
          color: #1976d2;
          border: none;
          border-radius: 5px;
          font-size: 1em;
          font-weight: 600;
          padding: 8px 19px;
          box-shadow: 0 1px 6px rgba(25,118,210,0.07);
          cursor: pointer;
          transition: background .12s, color .12s;
        }
        .back-btn:hover {
          background: #e3f2fd;
          color: #115293;
        }
        .buy-controls {
          margin: 28px 30px 18px 30px;
          display: flex; align-items: center;
          background: #fff;
          padding: 18px 15px;
          border-radius: 9px;
          box-shadow: 0 1.5px 8px rgba(25,118,210,0.07);
        }
        .search-btn {
          padding: 8px 22px;
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1em;
        }
        .search-btn:disabled { opacity: 0.7; cursor: not-allowed;}
        .my-numbers {
          margin: 12px 30px 2px 30px;
          color: #1976d2;
          font-size: 1.06em;
        }
        .my-numbers ul { margin: 3px 0 0 0; padding: 0; list-style: inside disc; color: #333;}
        .my-numbers li { font-size: 0.99em;}
        .available-numbers {
          background: #fff;
          margin: 26px 30px 0 30px;
          padding: 15px 15px 30px 15px;
          border-radius: 9px;
          box-shadow: 0 2px 10px rgba(25,118,210,0.05);
        }
        .available-numbers h3 {
          margin-top: 0;
          color: #1976d2;
        }
        .status-msg {
          color: #e53935;
          margin-bottom: 15px;
          font-weight: 500;
        }
        .numbers-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 7px;
          box-shadow: 0 1px 8px rgba(25,118,210,0.04);
        }
        .numbers-table th, .numbers-table td {
          padding: 13px 8px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }
        .numbers-table th { background: #f4f8fb; color: #1976d2;}
        .buy-btn {
          background: #1976d2;
          color: #fff;
          font-weight: 600;
          border: none;
          border-radius: 5px;
          padding: 6px 19px;
          cursor: pointer;
          font-size: 1em;
          transition: background .12s;
        }
        .buy-btn[disabled], .buy-btn:disabled {
          background: #b0c4de;
          color: #fff;
          cursor: not-allowed;
        }
        @media (max-width: 700px) {
          .buy-header, .buy-controls, .my-numbers, .available-numbers {
            margin-left: 5px;
            margin-right: 5px;
            padding-left: 6px;
            padding-right: 6px;
          }
          .numbers-table th, .numbers-table td { font-size: 0.97em;}
        }
      `}</style>
    </div>
  );
}