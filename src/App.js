import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import BuyNumber from "./BuyNumber";
import Inbox from "./Inbox";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/buy-number" element={<BuyNumber />} />
        <Route path="/inbox" element={<Inbox />} />
        
      </Routes>
    </Router>
  );
}

export default App;