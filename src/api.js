export const API_URL = "https://backend-connectify.up.railway.app/api";

// Signup
export async function signup({ name, email, password }) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return await res.json();
}

// Login
export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

// My Numbers (protected)
export async function myNumbers() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/numbers/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

// Available numbers
export async function listNumbers() {
  const res = await fetch(`${API_URL}/numbers/available`);
  return await res.json();
}

// Buy number
export async function buyNumber(number) {
  const res = await fetch(`${API_URL}/numbers/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number }),
  });
  return await res.json();
}

// Inbox messages for number
export async function inboxMessages(number) {
  const res = await fetch(`${API_URL}/messages/${number}`);
  return await res.json();
}

// Send SMS
export async function sendSMS({ from, to, text }) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, text, token })
  });
  return await res.json();
}
