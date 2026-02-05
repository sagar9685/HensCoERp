// components/AIChat.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { askAI, clearAnswer } from "../features/aiSlice";

const AIChat = () => {
  const [question, setQuestion] = useState("");
  const dispatch = useDispatch();
  const { loading, answer, error } = useSelector((state) => state.ai);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim()) {
      dispatch(askAI(question));
      setQuestion("");
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-header">
        <h3>🤖 Business AI Assistant</h3>
        <p>Ask me anything about orders, stock, sales, etc.</p>
      </div>

      <form onSubmit={handleSubmit} className="ai-input-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., How many orders today? What's the stock status?"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && (
        <div className="ai-error">
          ❌ Error: {error.message || "Something went wrong"}
        </div>
      )}

      {answer && (
        <div className="ai-response">
          <div className="ai-answer">
            <strong>🤖 Answer:</strong>
            <p>{answer.answer}</p>
            
            {answer.data && (
              <div className="ai-data">
                <small>📊 Data:</small>
                <pre>{JSON.stringify(answer.data, null, 2)}</pre>
              </div>
            )}
          </div>
          <button onClick={() => dispatch(clearAnswer())} className="clear-btn">
            Clear
          </button>
        </div>
      )}

      <div className="ai-suggestions">
        <p>Try asking:</p>
        <div className="suggestion-chips">
          {[
            "Total orders this month?",
            "Available stock?",
            "Top 3 customers?",
            "Pending deliveries?",
            "Best performing area?",
            "Today's sales?"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setQuestion(suggestion);
                dispatch(askAI(suggestion));
              }}
              className="suggestion-chip"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIChat;