import React from "react";
import SectionCard from "./SectionCard";

function ChatbotSection({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  onSubmit,
}) {
  return (
    <SectionCard
      title="Smart Finance Assistant"
      subtitle="Ask questions about your spending, income, or savings."
      className="chat-card"
    >
      <p className="helper-text">
        Try: <code>How much did I spend on Food &amp; Dining?</code>,{" "}
        <code>What is my total income?</code>,{" "}
        <code>What is my total expense?</code>,{" "}
        <code>What are my savings?</code>
      </p>

      <div className="chat-window">
        {chatMessages.map((m, idx) => (
          <div
            key={idx}
            className={`chat-message ${m.from === "user" ? "user" : "bot"}`}
          >
            <span>{m.text}</span>
          </div>
        ))}
        {chatLoading && <p className="helper-text">Bot is thinking...</p>}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button type="submit" className="btn primary">
          Ask
        </button>
      </form>
    </SectionCard>
  );
}

export default ChatbotSection;
