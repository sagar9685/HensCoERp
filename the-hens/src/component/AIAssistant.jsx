// src/components/AIAssistant/AIAssistant.jsx
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  askAI,
  setQuestion,
  clearAnswer,
  toggleLanguage,
  toggleQuickStats,
  fetchQuickStats,
  fetchAssistantInfo,
} from "../features/aiSlice";
import styles from "./AIAssistant.module.css";

// Sample questions for quick selection
const SAMPLE_QUESTIONS = {
  english: [
    "How many total orders?",
    "What's the stock status?",
    "Total sales revenue?",
    "How many deliveries pending?",
    "Best performing area?",
    "Today's report",
    "Top customers",
    "Best selling products",
  ],
  hindi: [
    "कितने ऑर्डर हैं?",
    "स्टॉक कितना है?",
    "कुल बिक्री कितनी?",
    "कितनी डिलीवरी पेंडिंग हैं?",
    "सबसे अच्छा क्षेत्र कौन सा है?",
    "आज की रिपोर्ट",
    "शीर्ष ग्राहक",
    "सबसे ज्यादा बिकने वाले उत्पाद",
  ],
};

const AIAssistant = () => {
  const dispatch = useDispatch();
  const {
    question,
    answer,
    conversation,
    quickStats,
    assistantInfo,
    loading,
    error,
    language,
    showQuickStats,
  } = useSelector((state) => state.ai);

  const [showHistory, setShowHistory] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, conversation]);

  // Fetch quick stats on component mount
  useEffect(() => {
    dispatch(fetchQuickStats());
    dispatch(fetchAssistantInfo(language));
  }, [dispatch, language]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim()) {
      dispatch(askAI(question));
    }
  };

  const handleQuickQuestion = (q) => {
    dispatch(setQuestion(q));
    setTimeout(() => {
      dispatch(askAI(q));
    }, 100);
  };

  const handleClear = () => {
    dispatch(clearAnswer());
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter conversation by category
  const filteredConversation = conversation.filter((item) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "orders" && item.question?.toLowerCase().includes("order")) return true;
    if (activeCategory === "stock" && item.question?.toLowerCase().includes("stock")) return true;
    if (activeCategory === "sales" && item.question?.toLowerCase().includes("sale")) return true;
    if (activeCategory === "delivery" && item.question?.toLowerCase().includes("delivery")) return true;
    return false;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <span className={styles.aiIcon}>🤖</span>
            {language === "hindi" ? "बिजनेस AI असिस्टेंट" : "Business AI Assistant"}
          </h1>
          <p className={styles.subtitle}>
            {language === "hindi"
              ? "Sagar के बिजनेस इंटेलिजेंस असिस्टेंट द्वारा"
              : "Powered by Sagar's Business Intelligence Assistant"}
          </p>
        </div>
        
        <div className={styles.headerRight}>
          <button
            className={`${styles.languageBtn} ${language === "hindi" ? styles.activeLang : ""}`}
            onClick={() => dispatch(toggleLanguage())}
          >
            {language === "hindi" ? "हिंदी" : "English"}
          </button>
          
          <button
            className={styles.quickStatsBtn}
            onClick={() => dispatch(toggleQuickStats())}
          >
            📊 {language === "hindi" ? "क्विक स्टैट्स" : "Quick Stats"}
          </button>
          
          <button
            className={styles.historyBtn}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "🗓️" : "📜"} {language === "hindi" ? "इतिहास" : "History"}
          </button>
        </div>
      </div>

      {/* Quick Stats Modal */}
      {showQuickStats && quickStats && (
        <div className={styles.quickStatsModal}>
          <div className={styles.quickStatsContent}>
            <div className={styles.modalHeader}>
              <h3>📊 {language === "hindi" ? "क्विक स्टैट्स" : "Quick Stats"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => dispatch(toggleQuickStats())}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statValue}>{quickStats.totalOrders}</div>
                <div className={styles.statLabel}>
                  {language === "hindi" ? "कुल ऑर्डर" : "Total Orders"}
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>💰</div>
                <div className={styles.statValue}>
                  ₹{quickStats.totalSales?.toLocaleString()}
                </div>
                <div className={styles.statLabel}>
                  {language === "hindi" ? "कुल बिक्री" : "Total Sales"}
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📦</div>
                <div className={styles.statValue}>{quickStats.stockItems}</div>
                <div className={styles.statLabel}>
                  {language === "hindi" ? "स्टॉक आइटम" : "Stock Items"}
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🚚</div>
                <div className={styles.statValue}>
                  {quickStats.pendingDeliveries}
                </div>
                <div className={styles.statLabel}>
                  {language === "hindi" ? "पेंडिंग डिलीवरी" : "Pending Deliveries"}
                </div>
              </div>
            </div>
            
            <div className={styles.statsFooter}>
              <small>
                {language === "hindi" ? "अपडेटेड: " : "Updated: "}
                {new Date(quickStats.timestamp).toLocaleString()}
              </small>
              <small>
                {language === "hindi" ? "Sagar के AI द्वारा विश्लेषित" : "Analyzed by Sagar's AI"}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel - Chat */}
        <div className={styles.chatPanel}>
          {/* Chat Container */}
          <div className={styles.chatContainer}>
            {/* Answer Display */}
            {answer && (
              <div className={`${styles.message} ${styles.answer}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageIcon}>🤖</span>
                  <span className={styles.messageTime}>
                    {formatDate(new Date())}
                  </span>
                </div>
                <div
                  className={styles.messageContent}
                  dangerouslySetInnerHTML={{
                    __html: answer.answer.replace(/\n/g, "<br />"),
                  }}
                />
                {answer.data && (
                  <div className={styles.messageData}>
                    <small>
                      📊{" "}
                      {language === "hindi" ? "विस्तृत डेटा उपलब्ध" : "Detailed data available"}
                    </small>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className={`${styles.message} ${styles.error}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageIcon}>⚠️</span>
                  <span className={styles.messageTime}>
                    {formatDate(new Date())}
                  </span>
                </div>
                <div className={styles.messageContent}>
                  {typeof error === "string" ? error : error.message}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className={styles.loading}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>
                  {language === "hindi"
                    ? "विचार कर रहा हूँ..."
                    : "Thinking..."}
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={question}
                onChange={(e) => dispatch(setQuestion(e.target.value))}
                placeholder={
                  language === "hindi"
                    ? "अपना प्रश्न यहाँ टाइप करें..."
                    : "Type your question here..."
                }
                className={styles.inputField}
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={loading || !question.trim()}
              >
                {loading ? "⏳" : "🚀"}
              </button>
            </div>
            
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
                disabled={loading}
              >
                {language === "hindi" ? "साफ करें" : "Clear"}
              </button>
              
              <div className={styles.sampleQuestions}>
                <span className={styles.sampleLabel}>
                  {language === "hindi" ? "त्वरित प्रश्न:" : "Quick questions:"}
                </span>
                <div className={styles.questionChips}>
                  {SAMPLE_QUESTIONS[language].slice(0, 4).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.questionChip}
                      onClick={() => handleQuickQuestion(q)}
                      disabled={loading}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Panel - History/Quick Questions */}
        <div className={styles.sidePanel}>
          {showHistory ? (
            // Conversation History
            <div className={styles.historyPanel}>
              <h3 className={styles.sidePanelTitle}>
                📜 {language === "hindi" ? "बातचीत इतिहास" : "Conversation History"}
              </h3>
              
              {/* Categories Filter */}
              <div className={styles.categories}>
                {["all", "orders", "stock", "sales", "delivery"].map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.categoryBtn} ${
                      activeCategory === cat ? styles.activeCategory : ""
                    }`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {language === "hindi"
                      ? {
                          all: "सभी",
                          orders: "ऑर्डर",
                          stock: "स्टॉक",
                          sales: "बिक्री",
                          delivery: "डिलीवरी",
                        }[cat]
                      : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* History List */}
              <div className={styles.historyList}>
                {filteredConversation.length > 0 ? (
                  filteredConversation.map((conv) => (
                    <div key={conv.id} className={styles.historyItem}>
                      <div className={styles.historyQuestion}>
                        <strong>Q:</strong> {conv.question}
                      </div>
                      <div className={styles.historyAnswer}>
                        <strong>A:</strong>{" "}
                        {conv.answer.substring(0, 100)}
                        {conv.answer.length > 100 ? "..." : ""}
                      </div>
                      <div className={styles.historyTime}>
                        {formatDate(conv.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noHistory}>
                    {language === "hindi"
                      ? "कोई बातचीत इतिहास नहीं"
                      : "No conversation history"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Quick Questions Panel
            <div className={styles.questionsPanel}>
              <h3 className={styles.sidePanelTitle}>
                💡 {language === "hindi" ? "त्वरित प्रश्न" : "Quick Questions"}
              </h3>
              
              <div className={styles.questionsGrid}>
                {SAMPLE_QUESTIONS[language].map((q, idx) => (
                  <button
                    key={idx}
                    className={styles.quickQuestionCard}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={loading}
                  >
                    <div className={styles.questionIcon}>
                      {["📊", "📦", "💰", "🚚", "📍", "📅", "👥", "🏆"][idx]}
                    </div>
                    <div className={styles.questionText}>{q}</div>
                  </button>
                ))}
              </div>
              
              {/* Assistant Info */}
              {assistantInfo && (
                <div className={styles.assistantInfo}>
                  <h4>ℹ️ {language === "hindi" ? "असिस्टेंट जानकारी" : "Assistant Info"}</h4>
                  <div className={styles.infoItem}>
                    <strong>{language === "hindi" ? "नाम:" : "Name:"}</strong> {assistantInfo.name}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>{language === "hindi" ? "डेवलपर:" : "Developer:"}</strong>{" "}
                    {assistantInfo.developer}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>{language === "hindi" ? "संपर्क:" : "Contact:"}</strong>{" "}
                    {assistantInfo.contact}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <span className={styles.footerIcon}>🤖</span>
            <span>
              {language === "hindi"
                ? "Sagar के बिजनेस इंटेलिजेंस असिस्टेंट द्वारा संचालित"
                : "Powered by Sagar's Business Intelligence Assistant"}
            </span>
          </div>
          <div className={styles.footerRight}>
            <span className={styles.statusDot}></span>
            <span>
              {language === "hindi" ? "सक्रिय" : "Active"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;