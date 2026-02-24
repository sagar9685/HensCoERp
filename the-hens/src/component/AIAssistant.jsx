import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { askAiAction } from "../features/aiSlice";
import styles from "./AiAssistant.module.css";

const SendIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const AIIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
    <path d="M12 12L2.69 7"></path>
    <path d="M12 12l5.63 8.36"></path>
  </svg>
);

const SparkleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" />
  </svg>
);

const AiAssistant = () => {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const dispatch = useDispatch();
  const { chatHistory, loading } = useSelector((state) => state.ai);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    dispatch(askAiAction(input));
    setInput("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.animatedGradient}></div>
      <div className={styles.floatingParticles}></div>

      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.aiLogo}>
            <AIIcon />
          </div>
          <div>
            <h1 className={styles.brandName}>
              HensCo Intelligence
              <SparkleIcon />
            </h1>
            <p className={styles.subtitle}>
              Powered by Sagar Gupta Engineering
            </p>
          </div>
        </div>
        <div className={styles.statusIndicator}>
          <div className={loading ? styles.pulseGreen : styles.pulseIdle}></div>
          <span>{loading ? "AI is Thinking" : "Online & Ready"}</span>
        </div>
      </header>

      <div className={styles.chatBody}>
        {chatHistory.length === 0 && !loading && (
          <div className={styles.welcomeState}>
            <div className={styles.welcomeIcon}>
              <AIIcon />
            </div>
            <h2>Good day! 🌟 How can I help with your poultry business?</h2>
            <p>
              I'm your cheerful AI consultant, ready to boost your farm's
              success with data-driven insights!
            </p>
            <div className={styles.suggestionChips}>
              <button
                className={styles.chip}
                onClick={() =>
                  dispatch(askAiAction("How to increase egg production?"))
                }
              >
                🥚 Increase egg production
              </button>
              <button
                className={styles.chip}
                onClick={() =>
                  dispatch(askAiAction("Optimal feed ratio for broilers"))
                }
              >
                🌽 Feed optimization
              </button>
              <button
                className={styles.chip}
                onClick={() =>
                  dispatch(askAiAction("Prevent common poultry diseases"))
                }
              >
                🩺 Disease prevention
              </button>
            </div>
          </div>
        )}

        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`${styles.messageRow} ${chat.sender === "user" ? styles.userRow : styles.aiRow}`}
          >
            {chat.sender === "ai" && (
              <div className={styles.aiAvatar}>
                <AIIcon />
              </div>
            )}
            <div
              className={`${styles.bubble} ${chat.sender === "ai" ? styles.aiBubble : styles.userBubble}`}
            >
              <div className={styles.messageHeader}>
                {chat.sender === "ai" ? (
                  <span className={styles.aiName}>HensCo AI ✨</span>
                ) : (
                  <span className={styles.userName}>You</span>
                )}
              </div>
              <div className={styles.messageText}>
                {chat.sender === "user" ? chat.text : chat.message || chat.text}
              </div>

              {chat.data &&
                Array.isArray(chat.data) &&
                chat.data.length > 0 && (
                  <div className={styles.tableContainer}>
                    <table className={styles.premiumTable}>
                      <thead>
                        <tr>
                          {Object.keys(chat.data[0]).map((key) => (
                            <th key={key}>
                              {key.split("_").join(" ").toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chat.data.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j}>{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {chat.sender === "ai" && (
                <div className={styles.signature}>
                  <span className={styles.verified}>
                    <SparkleIcon /> Verified Insight
                  </span>
                  <span className={styles.architect}>Built by Sagar Gupta</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.messageRow} ${styles.aiRow}`}>
            <div className={styles.aiAvatar}>
              <AIIcon />
            </div>
            <div
              className={`${styles.bubble} ${styles.aiBubble} ${styles.loadingBubble}`}
            >
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className={styles.loadingNote}>
                Sagar's AI is thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <footer className={styles.footer}>
        <form
          onSubmit={handleSend}
          className={`${styles.inputWrapper} ${isFocused ? styles.inputActive : ""}`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask me anything about your poultry business..."
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!input.trim() || loading}
          >
            <SendIcon />
          </button>
        </form>
        <div className={styles.legalBranding}>
          <span>❤️ Made with passion by Sagar Gupta</span>
          <span className={styles.separator}>•</span>
          <span>HensCo v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default AiAssistant;
