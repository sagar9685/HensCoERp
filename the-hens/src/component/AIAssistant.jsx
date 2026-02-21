import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { askAiAction } from "../features/aiSlice";
import styles from "./AiAssistant.module.css";

// Premium Icons with animations
const SendIcon = ({ isHovered }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={isHovered ? styles.sendIconHover : ""}
  >
    <path
      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AIIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"
      fill="currentColor"
    />
  </svg>
);

const MicIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 19v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AttachIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AiAssistant = () => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const dispatch = useDispatch();
  const { chatHistory, loading } = useSelector((state) => state.ai);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [chatHistory]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(
    (e) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      setIsTyping(true);
      dispatch(askAiAction(input));
      setInput("");

      setTimeout(() => setIsTyping(false), 1500);
    },
    [dispatch, input, loading],
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(e);
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      setSelectedSuggestion(suggestion);
      setInput(suggestion);
      setTimeout(() => {
        dispatch(askAiAction(suggestion));
        setInput("");
        setSelectedSuggestion(null);
      }, 300);
    },
    [dispatch],
  );

  const suggestions = [
    { text: "Best chicken breeds", icon: "🐔", color: "#FF6B6B" },
    { text: "Layer management", icon: "🥚", color: "#4ECDC4" },
    { text: "Disease prevention", icon: "💉", color: "#45B7D1" },
    { text: "Feed optimization", icon: "🌽", color: "#96CEB4" },
  ];

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Animated Background */}
      <div className={styles.gradientBg}>
        <div className={styles.gradientOrb}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>

      {/* Premium Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoWrapper}>
            <div className={styles.logoPulse}></div>
            <div className={styles.logoGlow}></div>
            <div className={styles.logo}>
              <AIIcon />
            </div>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>HensCo AI</h1>
            <div className={styles.badgeContainer}>
              <span className={styles.badge}>✨ Premium AI Assistant</span>
              <span className={styles.badgeTag}>By Sagar Gupta</span>
            </div>
          </div>
        </div>
        <div className={styles.status}>
          <span className={styles.statusPulse}></span>
          <span className={styles.statusDot}></span>
          <span className={styles.statusText}>
            {loading ? "Processing..." : "Active"}
          </span>
        </div>
      </div>

      {/* Chat Body */}
      <div className={styles.chatBody}>
        {chatHistory.length === 0 && (
          <div className={styles.welcomeContainer}>
            <div className={styles.welcomeIconWrapper}>
              <div className={styles.welcomeIconGlow}></div>
              <div className={styles.welcomeIcon}>
                <AIIcon />
              </div>
            </div>

            <div className={styles.welcomeContent}>
              <h2 className={styles.welcomeTitle}>
                Hello! I'm{" "}
                <span className={styles.gradientText}>HensCo AI</span>
              </h2>
              <p className={styles.welcomeText}>
                Your intelligent assistant for poultry farming excellence. Ask
                me anything about:
              </p>

              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🐔</span>
                  <span>Breed Management</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🥚</span>
                  <span>Production Tracking</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>💊</span>
                  <span>Health & Disease</span>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>📊</span>
                  <span>Business Analytics</span>
                </div>
              </div>
            </div>

            <div className={styles.suggestionsContainer}>
              <p className={styles.suggestionsLabel}>Quick suggestions</p>
              <div className={styles.suggestions}>
                {suggestions.map((s, index) => (
                  <button
                    key={index}
                    className={`${styles.suggestionChip} ${
                      selectedSuggestion === s.text ? styles.selected : ""
                    }`}
                    onClick={() => handleSuggestionClick(s.text)}
                    style={{ "--chip-color": s.color }}
                  >
                    <span className={styles.suggestionIcon}>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`${styles.messageWrapper} ${
              chat.sender === "user" ? styles.userWrapper : styles.aiWrapper
            }`}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {chat.sender === "ai" && (
              <div className={styles.aiAvatar}>
                <div className={styles.avatarGlow}></div>
                <AIIcon />
              </div>
            )}

            <div
              className={`${styles.bubble} ${
                chat.sender === "user" ? styles.userBubble : styles.aiBubble
              }`}
            >
              <div className={styles.bubbleContent}>
                <p className={styles.messageText}>
                  {chat.sender === "user" ? chat.text : chat.message}
                </p>

                {/* Premium Table */}
                {chat.data &&
                  Array.isArray(chat.data) &&
                  chat.data.length > 0 && (
                    <div className={styles.tableWrapper}>
                      <div className={styles.tableHeader}>
                        <span className={styles.tableTitle}>📊 Results</span>
                        <span className={styles.tableCount}>
                          {chat.data.length} records
                        </span>
                      </div>
                      <div className={styles.tableContainer}>
                        <table className={styles.aiTable}>
                          <thead>
                            <tr>
                              {Object.keys(chat.data[0]).map((k) => (
                                <th key={k}>
                                  <span>{k}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {chat.data.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((v, j) => (
                                  <td key={j}>{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Premium Identity Card */}
                {chat.data && !Array.isArray(chat.data) && (
                  <div className={styles.identityCard}>
                    <div className={styles.identityIconWrapper}>
                      <span className={styles.identityIcon}>✨</span>
                    </div>
                    <div className={styles.identityContent}>
                      <div className={styles.identityLabel}>AI Response</div>
                      <div className={styles.identityText}>{chat.data}</div>
                    </div>
                  </div>
                )}

                {/* Message Footer */}
                <div className={styles.messageFooter}>
                  <span className={styles.timestamp}>
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {chat.sender === "ai" && (
                    <span className={styles.messageStatus}>✓ Delivered</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Premium Loading Animation */}
        {loading && (
          <div className={styles.loadingWrapper}>
            <div className={styles.aiAvatar}>
              <div className={styles.avatarGlow}></div>
              <AIIcon />
            </div>
            <div className={styles.loadingBubble}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className={styles.loadingContent}>
                <span className={styles.loadingText}>
                  Searching HensCo Database
                </span>
                <span className={styles.loadingDots}>...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Premium Input Form */}
      <form onSubmit={handleSend} className={styles.footer}>
        <div
          className={`${styles.inputContainer} ${isFocused ? styles.focused : ""}`}
        >
          <div className={styles.inputWrapper}>
            <button type="button" className={styles.attachButton}>
              <AttachIcon />
            </button>

            <input
              ref={inputRef}
              className={styles.input}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={loading}
            />

            <button type="button" className={styles.micButton}>
              <MicIcon />
            </button>
          </div>

          <button
            type="submit"
            className={`${styles.sendButton} ${
              input.trim() ? styles.active : ""
            } ${loading ? styles.disabled : ""}`}
            onMouseEnter={() => setIsSendHovered(true)}
            onMouseLeave={() => setIsSendHovered(false)}
            disabled={loading || !input.trim()}
          >
            <SendIcon isHovered={isSendHovered} />
          </button>
        </div>

        <div className={styles.footerNote}>
          <span className={styles.noteIcon}>⚡</span>
          <span>AI-powered insights • 24/7 available • Secure</span>
        </div>
      </form>
    </div>
  );
};

export default AiAssistant;
