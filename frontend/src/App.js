import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import "./App.css";
const API_URL = 'https://backend-henna-one-38.vercel.app/api/chat';
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(localStorage.getItem("sessionId") || uuidv4());
  const bottomRef = useRef(null);
  useEffect(() => {
    localStorage.setItem("sessionId", sessionId.current);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const sendMessage = async () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(API_URL, {
        question,
        sessionId: sessionId.current,
      });
      setMessages((prev) => [...prev, { role: "bot", text: res.data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Error reaching server." },
      ]);
    }
    setLoading(false);
  };
  return (
    <div className="chat-container">
      <h2>Unipegaso Assistant</h2>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="message bot">Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask something about unipegaso.it..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
export default App;
