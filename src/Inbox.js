import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import socket from "./socket";

const API_URL = "https://backend-connectify.up.railway.app/api";

// Helpers
function getAvatar(user) {
  if (user && user.name) {
    const words = user.name.trim().split(" ");
    return words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0][0].toUpperCase();
  }
  if (user && user.email) return user.email[0].toUpperCase();
  return "U";
}
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    color += ("00" + ((hash >> (i * 8)) & 0xff).toString(16)).slice(-2);
  }
  return color;
}
function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  let h = date.getHours();
  let m = date.getMinutes();
  let ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; h = h ? h : 12; m = m < 10 ? "0" + m : m;
  return `${h}:${m} ${ampm}`;
}
function getLS(key, def = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
  catch { return def; }
}
function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export default function Inbox() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  useEffect(() => {
    if (theme === "dark") document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });
  const [profileOpen, setProfileOpen] = useState(false);

  const [myNumbers, setMyNumbers] = useState([]);
  const [selectedMyNumber, setSelectedMyNumber] = useState("");
  const [contactsMap, setContactsMap] = useState({});
  const [selectedContactMap, setSelectedContactMap] = useState({});
  const [conversationMap, setConversationMap] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [contactFilter, setContactFilter] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [addContactErr, setAddContactErr] = useState("");
  const [newContact, setNewContact] = useState({ name: "", number: "" });
  const [contactToDelete, setContactToDelete] = useState(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const chatBottomRef = useRef(null);

  // Folders/deleted state per-number in localStorage
  const [archived, setArchived] = useState([]);
  const [favorite, setFavorite] = useState([]);
  const [deletedNumbers, setDeletedNumbers] = useState([]);

  function syncFolders(num) {
    setArchived(getLS(`archived_${num}`));
    setFavorite(getLS(`favorite_${num}`));
    setDeletedNumbers(getLS(`deletedNumbers_${num}`));
  }
  useEffect(() => { if (selectedMyNumber) syncFolders(selectedMyNumber); }, [selectedMyNumber]);

  // AUTH CHECK
  useEffect(() => {
    if (!localStorage.getItem("token") || !user?.email) {
      navigate("/login");
    }
  }, [navigate, user]);

  // GET NUMBERS ONCE
  useEffect(() => {
    async function fetchNumbers() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/numbers/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        let nums = Array.isArray(data.numbers) && data.numbers.length ? data.numbers : [];
        setMyNumbers(nums);
        setSelectedMyNumber(nums[0] || "");
      } catch {
        setMyNumbers([]);
      }
    }
    fetchNumbers();
  }, []);

  // GET CONTACTS (filter deleted)
  useEffect(() => {
    async function fetchContacts() {
      if (!selectedMyNumber) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        let allContacts = data.contacts || [];
        const deleted = getLS(`deletedNumbers_${selectedMyNumber}`);
        allContacts = allContacts.filter(c => !deleted.includes(c.number));
        setContactsMap(prev => ({
          ...prev,
          [selectedMyNumber]: allContacts
        }));
        if (!selectedContactMap[selectedMyNumber] && allContacts.length) {
          setSelectedContactMap(prev => ({
            ...prev,
            [selectedMyNumber]: allContacts[0].number
          }));
        }
        syncFolders(selectedMyNumber);
      } catch {
        setContactsMap(prev => ({ ...prev, [selectedMyNumber]: [] }));
      }
    }
    fetchContacts();
    // eslint-disable-next-line
  }, [selectedMyNumber]);

  // GET MESSAGES FOR THIS NUMBER (auto-add unknown only if not deleted)
  useEffect(() => {
    if (!selectedMyNumber) return;
    async function fetchConversations() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/messages/${selectedMyNumber}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setConversationMap(prev => ({
          ...prev,
          [selectedMyNumber]: data.messages || []
        }));
        // auto add unknown numbers to contactsMap for this myNumber
        const contacts = contactsMap[selectedMyNumber] || [];
        const deleted = getLS(`deletedNumbers_${selectedMyNumber}`);
        const nums = new Set(contacts.map(c => c.number));
        let extraContacts = [];
        (data.messages || []).forEach(m => {
          if (
            m.from !== selectedMyNumber &&
            !nums.has(m.from) &&
            !deleted.includes(m.from)
          ) {
            extraContacts.push({ name: m.from, number: m.from });
            nums.add(m.from);
          }
          if (
            m.to !== selectedMyNumber &&
            !nums.has(m.to) &&
            !deleted.includes(m.to)
          ) {
            extraContacts.push({ name: m.to, number: m.to });
            nums.add(m.to);
          }
        });
        if (extraContacts.length > 0) {
          setContactsMap(prev => ({
            ...prev,
            [selectedMyNumber]: [...contacts, ...extraContacts]
          }));
        }
        syncFolders(selectedMyNumber);
      } catch {
        setConversationMap(prev => ({
          ...prev, [selectedMyNumber]: []
        }));
      }
    }
    fetchConversations();
    // eslint-disable-next-line
  }, [selectedMyNumber, contactsMap]);

  // UNREAD COUNTS PER CONTACT PER NUMBER (ignore deleted)
  useEffect(() => {
    async function fetchAllUnreadCounts() {
      if (!selectedMyNumber || !contactsMap[selectedMyNumber] || contactsMap[selectedMyNumber].length === 0) return;
      const token = localStorage.getItem("token");
      const counts = {};
      await Promise.all(
        contactsMap[selectedMyNumber].map(async c => {
          try {
            const res = await fetch(
              `${API_URL}/messages/unread-count?number=${selectedMyNumber}&from=${c.number}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            counts[c.number] = data.count || 0;
          } catch {
            counts[c.number] = 0;
          }
        })
      );
      setUnreadCounts(prev => ({ ...prev, [selectedMyNumber]: counts }));
    }
    fetchAllUnreadCounts();
    // eslint-disable-next-line
  }, [contactsMap, selectedMyNumber]);

  // SOCKET.IO: Real-time receive new messages (add to conversationMap even for unknown, but only add to contacts if not deleted)
  useEffect(() => {
    if (!myNumbers.length || !user?.id) return;
    socket.emit("register", user.id);
    myNumbers.forEach(num => socket.emit("join", num));
    const messageHandler = msg => {
      if (!msg || !msg.to) return;
      const myNum = myNumbers.find(num => num === msg.to);
      if (!myNum) return;
      setConversationMap(map => {
        const arr = map[myNum] || [];
        if (arr.some(m => m._id === msg._id)) return map;
        return { ...map, [myNum]: [...arr, msg] };
      });
      // Add to contacts if not deleted
      const contacts = contactsMap[myNum] || [];
      const deleted = getLS(`deletedNumbers_${myNum}`);
      if (
        msg.from !== myNum &&
        !contacts.some(c => c.number === msg.from) &&
        !deleted.includes(msg.from)
      ) {
        setContactsMap(prev => ({
          ...prev,
          [myNum]: [...contacts, { name: msg.from, number: msg.from }]
        }));
      }
      fetchUnreadCountForContact(myNum, msg.from);
      if (selectedMyNumber === myNum) {
        if (window.Notification && Notification.permission === "granted") {
          new Notification("New SMS", { body: msg.text });
        } else {
          alert("New SMS: " + msg.text);
        }
      }
    };
    socket.on("new_message", messageHandler);
    return () => {
      socket.off("new_message", messageHandler);
    };
    // eslint-disable-next-line
  }, [myNumbers, contactsMap, user?.id, selectedMyNumber]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!selectedMyNumber || !selectedContactMap[selectedMyNumber]) return;
    async function markAllAsRead() {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/messages/markAsRead`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ from: selectedContactMap[selectedMyNumber], to: selectedMyNumber })
        });
        setUnreadCounts(prev => ({
          ...prev,
          [selectedMyNumber]: {
            ...prev[selectedMyNumber],
            [selectedContactMap[selectedMyNumber]]: 0
          }
        }));
      } catch {}
    }
    markAllAsRead();
    // eslint-disable-next-line
  }, [selectedContactMap, selectedMyNumber]);

  // SCROLL TO CHAT BOTTOM
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMap, selectedMyNumber, selectedContactMap]);

  // SEND MESSAGE
  async function handleSend(e) {
    e.preventDefault();
    if (!msgInput.trim() || !selectedContactMap[selectedMyNumber] || !selectedMyNumber) return;
    setSending(true);
    setStatusMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedMyNumber,
          to: selectedContactMap[selectedMyNumber],
          text: msgInput.trim(),
          token
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setConversationMap(map => {
          const arr = map[selectedMyNumber] || [];
          return { ...map, [selectedMyNumber]: [...arr, data.message] };
        });
        setMsgInput("");
      } else {
        setStatusMsg(data.message || "Failed to send");
      }
    } catch {
      setStatusMsg("Network/server error.");
    }
    setSending(false);
  }

  // Fetch unread count for a single contact of a myNumber
  async function fetchUnreadCountForContact(myNum, contactNumber) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/messages/unread-count?number=${myNum}&from=${contactNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setUnreadCounts(prev => ({
        ...prev,
        [myNum]: {
          ...(prev[myNum] || {}),
          [contactNumber]: data.count || 0
        }
      }));
    } catch {
      setUnreadCounts(prev => ({
        ...prev,
        [myNum]: {
          ...(prev[myNum] || {}),
          [contactNumber]: 0
        }
      }));
    }
  }

  // ARCHIVE/FAV (mutually exclusive, localStorage)
  function handleArchive(contactNumber) {
    let arr = getLS(`archived_${selectedMyNumber}`);
    if (!arr.includes(contactNumber)) arr.push(contactNumber);
    setLS(`archived_${selectedMyNumber}`, arr);
    let favs = getLS(`favorite_${selectedMyNumber}`).filter(n => n !== contactNumber);
    setLS(`favorite_${selectedMyNumber}`, favs);
    syncFolders(selectedMyNumber);
    setSelectedContactMap(prev => ({
      ...prev,
      [selectedMyNumber]: prev[selectedMyNumber] === contactNumber ? "" : prev[selectedMyNumber]
    }));
  }
  function handleUnarchive(contactNumber) {
    let arr = getLS(`archived_${selectedMyNumber}`).filter(n => n !== contactNumber);
    setLS(`archived_${selectedMyNumber}`, arr);
    syncFolders(selectedMyNumber);
  }
  function handleFavorite(contactNumber) {
    let arr = getLS(`favorite_${selectedMyNumber}`);
    if (!arr.includes(contactNumber)) arr.push(contactNumber);
    setLS(`favorite_${selectedMyNumber}`, arr);
    let arch = getLS(`archived_${selectedMyNumber}`).filter(n => n !== contactNumber);
    setLS(`archived_${selectedMyNumber}`, arch);
    syncFolders(selectedMyNumber);
  }
  function handleUnfavorite(contactNumber) {
    let arr = getLS(`favorite_${selectedMyNumber}`).filter(n => n !== contactNumber);
    setLS(`favorite_${selectedMyNumber}`, arr);
    syncFolders(selectedMyNumber);
  }

  // FILTERED CONTACTS (Inbox, Fav, Archive mutually exclusive)
  let contactsRaw = contactsMap[selectedMyNumber] || [];
  let filteredContacts = contactsRaw;
  if (activeFolder === "archived") {
    filteredContacts = contactsRaw.filter(
      c => archived.includes(c.number)
    );
  } else if (activeFolder === "favorite") {
    filteredContacts = contactsRaw.filter(
      c => favorite.includes(c.number)
    );
  } else {
    filteredContacts = contactsRaw.filter(
      c => !archived.includes(c.number) && !favorite.includes(c.number)
    );
  }
  filteredContacts = filteredContacts.filter(
    c =>
      c.name.toLowerCase().includes((contactFilter || "").trim().toLowerCase()) ||
      c.number.toLowerCase().includes((contactFilter || "").trim().toLowerCase())
  );

  // CURRENT SELECTED CONTACT for this myNumber
  const selectedContact = selectedContactMap[selectedMyNumber] || "";
  const chatMsgs = (conversationMap[selectedMyNumber] || []).filter(
    m => m.from === selectedContact || m.to === selectedContact
  );

  // ADD CONTACT
  function openAddContact() {
    setNewContact({ name: "", number: "" });
    setAddContactErr("");
    setAddContactOpen(true);
    setTimeout(() => {
      const el = document.getElementById("contactName");
      if (el) el.focus();
    }, 100);
  }
  async function saveContact(e) {
    e.preventDefault();
    let { name, number } = newContact;
    name = name.trim();
    number = number.trim();
    if (name.length < 2) {
      setAddContactErr("Enter a valid name.");
      return;
    }
    if (!number.match(/^\+?[0-9\s-]{7,22}$/)) {
      setAddContactErr("Enter a valid international phone number.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/contacts/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, number })
      });
      const data = await res.json();
      if (!data.success) {
        setAddContactErr(data.message || "Failed to add contact.");
      } else {
        setContactsMap(prev => ({
          ...prev,
          [selectedMyNumber]: data.contacts.filter(c => !getLS(`deletedNumbers_${selectedMyNumber}`).includes(c.number)) || []
        }));
        setAddContactOpen(false);
        setSelectedContactMap(prev => ({
          ...prev,
          [selectedMyNumber]: number
        }));
      }
    } catch {
      setAddContactErr("Network/server error.");
    }
  }

  // DELETE CONTACT (update localStorage so refresh survives, don't allow recreate)
  async function handleDeleteContact() {
    try {
      const numToDelete = contactToDelete.number;
      let deleted = getLS(`deletedNumbers_${selectedMyNumber}`);
      if (!deleted.includes(numToDelete)) deleted.push(numToDelete);
      setLS(`deletedNumbers_${selectedMyNumber}`, deleted);
      syncFolders(selectedMyNumber);
      setContactsMap(prev => {
        const oldList = Array.isArray(prev[selectedMyNumber]) ? prev[selectedMyNumber] : [];
        const newList = oldList.filter(c => c.number !== numToDelete);
        setSelectedContactMap(scPrev => ({
          ...scPrev,
          [selectedMyNumber]: newList[0]?.number || ""
        }));
        return {
          ...prev,
          [selectedMyNumber]: newList
        };
      });
      setLS(`archived_${selectedMyNumber}`, archived.filter(n => n !== numToDelete));
      setLS(`favorite_${selectedMyNumber}`, favorite.filter(n => n !== numToDelete));
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/contacts/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ number: numToDelete })
      });
      setDeleteContactOpen(false);
      syncFolders(selectedMyNumber);
    } catch {
      setDeleteContactOpen(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        setAddContactOpen(false);
        setDeleteContactOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="inbox-bg">
      <nav className="navbar-inbox">
        <div className="brand">
          <span style={{ fontSize: "1.5em", color: "#1976d2" }}>💬</span>
          <span style={{ fontWeight: 600, marginLeft: 7 }}>Connectify</span>
        </div>
        <div className="navbar-actions">
          <Link to="/buy-number" className="buy-number-link">+ Buy Number</Link>
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "🌞" : "🌓"}
          </button>
          <div
            className="navbar-avatar-unique"
            style={{
              background: stringToColor(user.name || user.email || "U"),
              color: "#fff",
              border: "2px solid #fff",
              boxShadow: "0 1px 6px rgba(25,118,210,0.09)",
              cursor: "pointer"
            }}
            onClick={() => setProfileOpen(v => !v)}
            title={user.name || user.email || "Profile"}
          >
            {getAvatar(user)}
          </div>
          {profileOpen && (
            <div className="profile-dropdown" tabIndex={-1} onBlur={() => setProfileOpen(false)}>
              <div className="profile-details">
                <div className="avatar-big" style={{ background: stringToColor(user.name || user.email || "U") }}>
                  {getAvatar(user)}
                </div>
                <div>
                  <div className="profile-name">{user.name || "User"}</div>
                  <div className="profile-email">{user.email}</div>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </nav>
      <div className="inbox-flex">
        {/* Sidebar */}
        <aside className="sidebar-inbox">
          <div className="sidebar-header">
            <span style={{ fontWeight: 600 }}>Inbox</span>
            <button className="add-contact-btn" onClick={openAddContact}>+ Add Contact</button>
          </div>
          <div className="my-number-area">
            <label htmlFor="myNumberSelect">My Number:</label>
            <select
              id="myNumberSelect"
              value={selectedMyNumber}
              onChange={e => {
                setSelectedMyNumber(e.target.value);
              }}
              style={{ width: "100%" }}
            >
              {myNumbers.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 5, margin: "10px 0 8px 0" }}>
            <button
              className={`folder-tab ${activeFolder === "inbox" ? "active" : ""}`}
              onClick={() => setActiveFolder("inbox")}
              style={{ flex: 1 }}
            >Inbox</button>
            <button
              className={`folder-tab ${activeFolder === "favorite" ? "active" : ""}`}
              onClick={() => setActiveFolder("favorite")}
              style={{ flex: 1 }}
            >⭐ Fav</button>
            <button
              className={`folder-tab ${activeFolder === "archived" ? "active" : ""}`}
              onClick={() => setActiveFolder("archived")}
              style={{ flex: 1 }}
            >🗄️ Archive</button>
          </div>
          <input
            className="contact-search"
            type="text"
            placeholder="Search contacts..."
            value={contactFilter}
            onChange={e => setContactFilter(e.target.value)}
            style={{ margin: "0 0 8px 0" }}
          />
          <ul className="conversation-list">
            {filteredContacts.length === 0 && (
              <li className="no-conv">No contacts.<br />Add contact to start chat.</li>
            )}
            {filteredContacts.map((contact) => (
              <li
                key={contact.number}
                className={contact.number === selectedContact ? "selected" : ""}
                onClick={() =>
                  setSelectedContactMap(prev => ({
                    ...prev,
                    [selectedMyNumber]: contact.number
                  }))
                }
              >
                <span className="conv-info">
                  {contact.name} ({contact.number})
                  {!!(unreadCounts[selectedMyNumber] && unreadCounts[selectedMyNumber][contact.number]) && unreadCounts[selectedMyNumber][contact.number] > 0 && (
                    <span className="unread-badge">{unreadCounts[selectedMyNumber][contact.number]}</span>
                  )}
                </span>
                <div className="contact-actions">
                  {activeFolder !== "archived" && (
                    <button className="archive-btn" title="Archive" onClick={e => { e.stopPropagation(); handleArchive(contact.number); }}>🗄️</button>
                  )}
                  {activeFolder === "archived" && (
                    <button className="archive-btn" title="Unarchive" onClick={e => { e.stopPropagation(); handleUnarchive(contact.number); }}>↩️</button>
                  )}
                  {activeFolder !== "favorite" && (
                    <button className="favorite-btn" title="Favorite" onClick={e => { e.stopPropagation(); handleFavorite(contact.number); }}>⭐</button>
                  )}
                  {activeFolder === "favorite" && (
                    <button className="favorite-btn" title="Unfavorite" onClick={e => { e.stopPropagation(); handleUnfavorite(contact.number); }}>❌</button>
                  )}
                  <button
                    className="delete-contact-btn"
                    title="Delete this contact"
                    onClick={e => {
                      e.stopPropagation();
                      setContactToDelete(contact);
                      setDeleteContactOpen(true);
                    }}
                  >🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <main className="chat-pane-inbox">
          <div className="chat-header-inbox">
            <div className="chat-partner">
              {selectedContact
                ? (
                  <>
                    <b>
                      {(contactsMap[selectedMyNumber] || []).find(c => c.number === selectedContact)?.name || selectedContact}
                    </b> ({selectedContact})
                  </>
                )
                : "Select a contact to chat"
              }
            </div>
            <div className="senderDisplay">
              {selectedMyNumber && <>Sending as: {selectedMyNumber}</>}
            </div>
          </div>
          <div className="chat-messages-inbox">
            {selectedContact && chatMsgs.length === 0 && (
              <div className="no-chat-msg">No messages yet</div>
            )}
            {selectedContact && chatMsgs.map((m, i) => (
              <div
                key={i}
                className={"msg " + (m.from === selectedMyNumber ? "me" : "them")}
              >
                <span>{m.text}</span>
                <span className="msg-time">{formatTime(m.createdAt)}</span>
              </div>
            ))}
            <div ref={chatBottomRef}></div>
          </div>
          <form className="chat-input-area-inbox" onSubmit={handleSend} autoComplete="off">
            <input
              type="text"
              placeholder="Type your message..."
              value={msgInput}
              disabled={!selectedContact || sending}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey)
                  handleSend(e);
              }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!selectedContact || sending || !msgInput.trim()}
              style={{ marginLeft: 7 }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
          <div className="status-msg-inbox">{statusMsg}</div>
        </main>
      </div>
      {/* Add Contact Modal */}
      {addContactOpen && (
        <div className="modal-inbox show">
          <form className="modal-content-inbox" onSubmit={saveContact} autoComplete="off">
            <button
              type="button"
              className="modal-close"
              onClick={() => setAddContactOpen(false)}
              title="Close"
            >&times;</button>
            <div className="modal-header-inbox">
              <span>➕</span> Add New Contact
            </div>
            <div className="modal-fields modal-fields-row">
              <div style={{ flex: 1 }}>
                <label className="modal-label" htmlFor="contactName">Full Name</label>
                <input
                  className="modal-input"
                  id="contactName"
                  name="contactName"
                  placeholder="e.g. John Doe"
                  maxLength={32}
                  autoComplete="off"
                  required
                  value={newContact.name}
                  onChange={e => setNewContact(nc => ({ ...nc, name: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="modal-label" htmlFor="contactNumber">Phone Number</label>
                <input
                  className="modal-input"
                  id="contactNumber"
                  name="contactNumber"
                  placeholder="+1 415 555 0100"
                  maxLength={22}
                  autoComplete="off"
                  required
                  pattern="^\+?[0-9\s\-]+$"
                  inputMode="tel"
                  value={newContact.number}
                  onChange={e => setNewContact(nc => ({ ...nc, number: e.target.value }))}
                />
              </div>
            </div>
            {addContactErr && (
              <div className="modal-error">{addContactErr}</div>
            )}
            <div className="modal-actions">
              <button type="button" className="modal-btn cancel" onClick={() => setAddContactOpen(false)}>Cancel</button>
              <button type="submit" className="modal-btn">Add Contact</button>
            </div>
          </form>
        </div>
      )}
      {/* Confirm Delete Contact Modal */}
      {deleteContactOpen && (
        <div className="modal-inbox show">
          <div className="modal-content-inbox">
            <div className="modal-header-inbox">Delete Contact</div>
            <div style={{ marginBottom: 14 }}>
              {contactToDelete &&
                `Delete contact "${contactToDelete.name}" (${contactToDelete.number}) and all its chat? This cannot be undone.`}
            </div>
            <div className="modal-actions">
              <button onClick={handleDeleteContact} className="modal-btn" style={{ background: "#e53935" }}>Delete</button>
              <button onClick={() => setDeleteContactOpen(false)} className="modal-btn cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        :root {
          --bg: #f4f8fb;
          --sidebar-bg: #f6f8fa;
          --chat-bg: #f9f9f9;
          --chat-header-bg: #f0f7fa;
          --btn-bg: #1976d2;
          --btn-color: #fff;
          --border: #e0e0e0;
          --input-border: #bbb;
          --navbar-bg: #1976d2;
          --navbar-text: #fff;
          --navbar-height: 56px;
          --conversation-selected: #e3f2fd;
          --conversation-hover: #e9f5fe;
          --delete-hover: #ffeaea;
          --delete-btn: #e53935;
          --delete-btn-hover: #b71c1c;
          --text: #222;
        }
        body.dark {
          --bg: #181f28;
          --sidebar-bg: #202837;
          --chat-bg: #222b38;
          --chat-header-bg: #25304a;
          --btn-bg: #1976d2;
          --btn-color: #fff;
          --border: #313c4f;
          --navbar-bg: #1a2536;
          --navbar-text: #e0e8f4;
          --conversation-selected: #293657;
          --conversation-hover: #263043;
          --delete-hover: #3a1d1d;
          --delete-btn: #e57373;
          --delete-btn-hover: #ff5252;
          --text: #e0e8f4;
          --input-border: #444c5a;
        }
        .inbox-bg { min-height: 100vh; background: var(--bg); color: var(--text);}
        .navbar-inbox { height: 56px; background: var(--navbar-bg); color: var(--navbar-text);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 22px; font-size: 1.08em; font-weight: bold; letter-spacing: 1px;
            box-shadow: 0 2px 8px rgba(25,118,210,0.07); position: sticky; top: 0; z-index: 100; }
        .navbar-actions { display: flex; align-items: center; gap: 10px; }
        .buy-number-link {
          background: #fff;
          color: #1976d2;
          border-radius: 6px;
          font-weight: 500;
          text-decoration: none;
          padding: 6px 13px 6px 11px;
          font-size: 1em;
          align-items: center;
          box-shadow: 0 2px 8px rgba(25,118,210,0.06);
          margin-right: 12px;
          margin-left: 10px;
          border: 1.2px solid #1976d2;
          transition: background 0.17s, color 0.17s;
        }
        .buy-number-link:hover {
          background: #e3f2fd;
          color: #0f329e;
          text-decoration: underline;
          border-color: #1565c0;
        }
        .theme-toggle-btn {
          background: none;
          border: none;
          font-size: 1.5em;
          color: var(--navbar-text);
          cursor: pointer;
          margin-right: 8px;
          margin-left: 8px;
          transition: color 0.2s;
        }
        .navbar-avatar-unique {
          width: 35px; height: 35px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; font-size: 1.12em;
          margin-left: 2px;
          transition: border .13s;
          user-select: none;
          letter-spacing: 0.5px;
          background: #1976d2;
        }
        .navbar-avatar-unique:hover { filter: brightness(1.1);}
        .profile-dropdown {
          position: absolute;
          top: 56px;
          right: 34px;
          background: var(--card-bg, #fff);
          box-shadow: 0 2px 18px rgba(25,118,210,0.14);
          border-radius: 12px;
          padding: 17px 18px 14px 18px;
          min-width: 220px;
          z-index: 9002;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          animation: fadeIn .23s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-12px);}
          to { opacity: 1; transform: none;}
        }
        .profile-details { display: flex; gap: 13px; align-items: center; margin-bottom: 3px;}
        .avatar-big {
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.43em; font-weight: bold; color: #fff; 
          background: #1976d2; letter-spacing: 1.3px;
        }
        .profile-name { font-weight: 600; font-size: 1.11em; margin-bottom: 0; }
        .profile-email { font-size: 0.98em; color: #888; }
        .logout-btn {
          margin-top: 7px;
          background: #e53935;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 1em;
          font-weight: bold;
          padding: 10px 0;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.19s;
        }
        .logout-btn:hover { background: #b71c1c; }
        .inbox-flex { display: flex; height: calc(100vh - 56px);}
        .sidebar-inbox {
          width: 270px; background: var(--sidebar-bg); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; min-width: 160px; max-width: 97vw; height: 100%; color: var(--text);
        }
        .sidebar-header {
          padding: 14px 14px 6px 14px;
          font-weight: bold;
          font-size: 1.08em;
          display: flex; justify-content: space-between; align-items: center;
        }
        .add-contact-btn {
          background: var(--btn-bg);
          color: var(--btn-color);
          border: none;
          border-radius: 4px;
          padding: 7px 12px;
          cursor: pointer;
          font-size: 0.96em;
        }
        .my-number-area { padding: 0 14px 0 14px;}
        .my-number-area label { font-size: 0.97em; font-weight: 500; color: var(--text);}
        .folder-tab {
          background: var(--sidebar-bg);
          border: 1px solid var(--border);
          border-radius: 4px 4px 0 0;
          font-size: 0.97em;
          padding: 6px 2px 3px 2px;
          color: var(--btn-bg);
          font-weight: 600;
          cursor: pointer;
        }
        .folder-tab.active {
          background: #e3f2fd;
          color: #1565c0;
          border-bottom: 2px solid #1976d2;
        }
        .contact-search { margin: 8px 12px 0 12px; padding: 7px 10px; border-radius: 5px; border: 1.1px solid var(--input-border);}
        .conversation-list {
          flex: 1 1 0;
          min-height: 0;
          max-height: 100%;
          overflow-y: auto;
          margin: 0;
          padding: 0 0 0 0;
          list-style: none;
          background: var(--sidebar-bg);
          color: var(--text);
          user-select: none;
        }
        .conversation-list li {
          padding: 11px 0 11px 18px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          font-size: 1em;
          transition: background 0.14s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          color: var(--text);
          user-select: none;
        }
        .conversation-list li.selected {
          background: var(--conversation-selected);
          font-weight: bold;
        }
        .conversation-list li:hover {
          background: var(--conversation-hover);
        }
        .conv-info { flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); pointer-events: none; user-select: none;}
        .unread-badge {
          background: #e53935;
          color: #fff;
          border-radius: 10px;
          padding: 2px 7px;
          font-size: 0.87em;
          margin-left: 6px;
          font-weight: bold;
        }
        .contact-actions {
          display: flex;
          gap: 7px;
          align-items: center;
        }
        .archive-btn, .favorite-btn, .delete-contact-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 1.15em;
          cursor: pointer;
          margin-right: 0;
          margin-left: 0;
          padding: 3px 5px 3px 5px;
          border-radius: 50%;
          transition: background 0.12s, color 0.16s;
        }
        .archive-btn:hover { background: #e3f2fd; color: #1976d2; }
        .favorite-btn:hover { background: #fffbe5; color: #f4b400; }
        .delete-contact-btn:hover { background: var(--delete-hover); color: var(--delete-btn-hover);}
        .no-conv { color: #aaa; text-align: center; margin: 24px 0; font-size: 0.99em;}
        .chat-pane-inbox { flex: 1; display: flex; flex-direction: column; background: var(--chat-bg); min-width: 0; color: var(--text);}
        .chat-header-inbox { padding: 16px 16px 10px 18px; background: var(--chat-header-bg); border-bottom: 1px solid var(--border); font-weight: bold; min-height: 40px; display: flex; align-items: center; justify-content: space-between; font-size: 1.08em;}
        .senderDisplay { font-size: 0.99em; color: #1976d2; font-weight: 500;}
        .chat-messages-inbox { flex: 1; overflow-y: auto; padding: 18px 18px 10px 18px; background: var(--chat-bg); display: flex; flex-direction: column; gap: 8px; min-height: 0; color: var(--text);}
        .msg { max-width: 62%; padding: 10px 16px; border-radius: 18px; font-size: 1em; word-break: break-word; display: inline-block; color: var(--text); position: relative;}
        .msg-time { display: block; font-size: 0.87em; color: #888; margin-top: 3px; text-align: right;}
        .me   { align-self: flex-end; background: #e3f2fd; color: #1976d2; text-align: right;}
        .them { align-self: flex-start; background: #f1f8e9; color: #388e3c; text-align: left;}
        .no-chat-msg { color: #aaa; text-align: center; margin: 42px 0 0 0;}
        .chat-input-area-inbox { display: flex; border-top: 1px solid var(--border); background: #fafbfc; padding: 12px 10px 12px 10px; gap: 6px;}
        .chat-input-area-inbox input[type="text"] { flex: 1; padding: 9px 10px; border-radius: 5px; border: 1.1px solid var(--input-border); font-size: 1em; background: var(--chat-bg); color: var(--text); transition: background 0.2s, color 0.2s, border-color 0.2s;}
        .send-btn { padding: 9px 22px; background: var(--btn-bg); color: var(--btn-color); border: none; border-radius: 5px; font-weight: 600; cursor: pointer; font-size: 1em;}
        .status-msg-inbox { color: #e53935; font-size: 0.99em; min-height: 18px; text-align: center; margin-top: 3px;}
        .modal-inbox { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(35,45,60,0.16); align-items: center; justify-content: center; z-index: 9999; animation: modal-bg-fadein 0.23s;}
        .modal-inbox.show { display: flex; }
        @keyframes modal-bg-fadein { from { background: rgba(35,45,60, 0); } to   { background: rgba(35,45,60, 0.16);} }
        .modal-content-inbox { background: var(--card-bg); padding: 28px 20px 18px 20px; border-radius: 15px; min-width: 300px; max-width: 98vw; box-shadow: 0 4px 24px 0 rgba(25, 118, 210, 0.18); display: flex; flex-direction: column; color: var(--text); position: relative; animation: modal-slidein 0.27s cubic-bezier(.55,1.33,.58,1.05);}
        @keyframes modal-slidein { from { transform: translateY(60px) scale(.95); opacity: 0;} to   { transform: translateY(0) scale(1); opacity: 1;}}
        .modal-header-inbox { color: #1976d2; font-size: 1.13em; font-weight: bold; letter-spacing: .5px; margin-bottom: 8px; display: flex; align-items: center; gap: 7px;}
        .modal-fields { display: flex; flex-direction: column; gap: 0; margin-bottom: 7px; margin-top: 6px;}
        .modal-fields-row { flex-direction: row; gap: 16px;}
        @media (max-width: 600px) { .modal-fields-row { flex-direction: column; gap: 4px;} }
        .modal-label { font-size: 0.98em; color: #444e5f; margin-bottom: 4px; font-weight: 500; letter-spacing: .1px;}
        .modal-input { padding: 9px 10px; border-radius: 6px; border: 1.1px solid var(--input-border); font-size: 1.02em; background: var(--sidebar-bg); color: var(--text); outline: none; transition: border .18s;}
        .modal-input:focus { border-color: var(--btn-bg);}
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;}
        .modal-btn { background: var(--btn-bg); color: #fff; border: none; border-radius: 5px; padding: 8px 20px; font-size: 1.05em; font-weight: 500; cursor: pointer; transition: background .15s, color .15s; box-shadow: 0 1px 4px rgba(25,118,210,0.06);}
        .modal-btn.cancel { background: #e5eaf3; color: #1976d2;}
        .modal-btn.cancel:hover { background: #e3f2fd; color: #1351a0;}
        .modal-btn:active { transform: scale(.97);}
        .modal-close { position: absolute; top: 13px; right: 13px; background: none; border: none; font-size: 1.19em; color: #b0b8c9; cursor: pointer; transition: color .13s; border-radius: 2px;}
        .modal-close:hover { color: #e53935;}
        .modal-error { color: #e53935; font-size: 0.97em; margin-bottom: 5px; margin-top: -8px; font-weight: 500;}
        @media (max-width: 600px) { .sidebar-inbox { min-width: 0; width: 100vw; max-width: 200px;} .inbox-flex { flex-direction: column;} .chat-pane-inbox { min-width: 0; } }
      `}</style>
    </div>
  );
}
