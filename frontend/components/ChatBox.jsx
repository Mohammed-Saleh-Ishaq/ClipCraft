import React, { useState } from "react";

export default function ChatBox({ onSend, compact }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className={`chatbox ${compact ? "compact" : ""}`}>
      <input
        className="chat-input"
        placeholder="Type a command: caption, trim, transcribe, translate..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
      />
      <button className="chat-send" onClick={handleSend}>
        Send
      </button>
    </div>
  );
}
