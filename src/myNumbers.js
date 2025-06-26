import React, { useEffect, useState } from "react";
import { myNumbers } from "./api";

export default function MyNumbers() {
  const [numbers, setNumbers] = useState([]);

  useEffect(() => {
    myNumbers().then(data => setNumbers(data.numbers || []));
  }, []);

  return (
    <div>
      <h2>My Numbers</h2>
      <ul>
        {numbers.map(num => <li key={num}>{num}</li>)}
      </ul>
    </div>
  );
}