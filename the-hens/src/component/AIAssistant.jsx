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

// विस्तृत सैंपल प्रश्न
const SAMPLE_QUESTIONS = {
  english: [
    "How many orders on 4 February 2026?",
    "Total orders in February 2026",
    "Today's order report",
    "Yesterday's sales",
    "This week's delivery status",
    "Show bill number INV/05 details",
    "Top 5 customers this month",
    "Low stock alert",
    "Outstanding payments",
    "Best delivery boy",
    "Total sales this month",
    "New customers last 30 days",
    "Product wise sales report",
    "Area wise performance",
    "Cash collection this week",
    "Waste/rejected stock",
    "Order ID 500 status",
    "Deepak's current balance",
    "Pending deliveries today",
    "Customer order history"
  ],
  hindi: [
    "4 फरवरी 2026 को कितने ऑर्डर?",
    "फरवरी 2026 में कुल ऑर्डर",
    "आज की ऑर्डर रिपोर्ट",
    "कल की बिक्री",
    "इस हफ्ते की डिलीवरी स्टेटस",
    "बिल नंबर INV/05 की डिटेल दिखाओ",
    "इस महीने के टॉप 5 ग्राहक",
    "कम स्टॉक अलर्ट",
    "बकाया भुगतान",
    "सबसे अच्छा डिलीवरी बॉय",
    "इस महीने की कुल बिक्री",
    "पिछले 30 दिन के नए ग्राहक",
    "प्रोडक्ट वाइज बिक्री रिपोर्ट",
    "एरिया वाइज परफॉर्मेंस",
    "इस हफ्ते का कैश कलेक्शन",
    "खराब/रिजेक्ट स्टॉक",
    "ऑर्डर आईडी 500 की स्टेटस",
    "दीपक का करंट बैलेंस",
    "आज की पेंडिंग डिलीवरी",
    "ग्राहक का ऑर्डर इतिहास"
  ],
};

// कैटेगरी वार प्रश्न
const CATEGORY_QUESTIONS = {
  orders: {
    english: [
      "Total orders today",
      "Orders on specific date",
      "Monthly order summary",
      "Weekend orders report",
      "Hourly order distribution"
    ],
    hindi: [
      "आज के कुल ऑर्डर",
      "विशेष तारीख के ऑर्डर",
      "मासिक ऑर्डर सारांश",
      "वीकेंड ऑर्डर रिपोर्ट",
      "घंटावार ऑर्डर वितरण"
    ]
  },
  sales: {
    english: [
      "Today's total sales",
      "Sales comparison this month vs last month",
      "Highest sales day",
      "Average order value",
      "Product category sales"
    ],
    hindi: [
      "आज की कुल बिक्री",
      "इस महीने vs पिछले महीने बिक्री तुलना",
      "सबसे ज्यादा बिक्री वाला दिन",
      "औसत ऑर्डर वैल्यू",
      "प्रोडक्ट कैटेगरी बिक्री"
    ]
  },
  customers: {
    english: [
      "Top spending customers",
      "New customers this week",
      "Inactive customers",
      "Customer retention rate",
      "Area wise customers"
    ],
    hindi: [
      "सबसे ज्यादा खर्च करने वाले ग्राहक",
      "इस हफ्ते के नए ग्राहक",
      "निष्क्रिय ग्राहक",
      "ग्राहक बने रहने की दर",
      "एरिया वाइज ग्राहक"
    ]
  },
  delivery: {
    english: [
      "Today's pending deliveries",
      "Fastest delivery boy",
      "Delivery success rate",
      "Area wise delivery time",
      "Cancelled deliveries reason"
    ],
    hindi: [
      "आज की पेंडिंग डिलीवरी",
      "सबसे तेज डिलीवरी बॉय",
      "डिलीवरी सफलता दर",
      "एरिया वाइज डिलीवरी टाइम",
      "कैंसल डिलीवरी का कारण"
    ]
  },
  inventory: {
    english: [
      "Current stock status",
      "Low stock items",
      "Stock value",
      "Fast moving products",
      "Slow moving products"
    ],
    hindi: [
      "वर्तमान स्टॉक स्टेटस",
      "कम स्टॉक वाले आइटम",
      "स्टॉक मूल्य",
      "तेजी से बिकने वाले प्रोडक्ट",
      "धीरे बिकने वाले प्रोडक्ट"
    ]
  },
  financial: {
    english: [
      "Total outstanding amount",
      "Today's collection",
      "Payment mode analysis",
      "Short amount collection",
      "Cash vs online collection"
    ],
    hindi: [
      "कुल बकाया राशि",
      "आज का कलेक्शन",
      "भुगतान मोड विश्लेषण",
      "शॉर्ट अमाउंट कलेक्शन",
      "कैश vs ऑनलाइन कलेक्शन"
    ]
  }
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
  const [showCategories, setShowCategories] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const chatEndRef = useRef(null);
  const [quickStatsError, setQuickStatsError] = useState(null);

  // Scroll to bottom of chat
    useEffect(() => {
    const loadQuickStats = async () => {
      try {
        const result = await dispatch(fetchQuickStats());
        if (fetchQuickStats.rejected.match(result)) {
          setQuickStatsError("Failed to load quick stats");
        }
      } catch (err) {
        setQuickStatsError(err.message);
      }
    };
    
    loadQuickStats();
    dispatch(fetchAssistantInfo(language));
  }, [dispatch, language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, conversation]);

  // Fetch quick stats on component mount
 useEffect(() => {
  dispatch(fetchQuickStats()).catch(error => {
    console.error("Failed to fetch quick stats:", error);
  });
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

  const handleDateSearch = () => {
    if (!selectedDate) return;
    
    const dateStr = new Date(selectedDate).toLocaleDateString('en-GB');
    let questionStr;
    
    if (language === "hindi") {
      questionStr = `${dateStr} को कितने ऑर्डर आए?`;
    } else {
      questionStr = `How many orders on ${dateStr}?`;
    }
    
    dispatch(setQuestion(questionStr));
    setTimeout(() => {
      dispatch(askAI(questionStr));
    }, 100);
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
    const q = item.question?.toLowerCase() || '';
    
    switch(activeCategory) {
      case "orders": return q.includes("order") || q.includes("ऑर्डर");
      case "sales": return q.includes("sale") || q.includes("बिक्री") || q.includes("revenue");
      case "customers": return q.includes("customer") || q.includes("ग्राहक");
      case "delivery": return q.includes("delivery") || q.includes("डिलीवरी");
      case "inventory": return q.includes("stock") || q.includes("स्टॉक") || q.includes("inventory");
      case "financial": return q.includes("payment") || q.includes("भुगतान") || q.includes("outstanding") || q.includes("बकाया");
      default: return true;
    }
  });

  // Render answer with better formatting
  const renderAnswer = (answerText) => {
    if (!answerText) return null;
    
    // Replace **text** with bold
    let formattedText = answerText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace • with bullet points
    formattedText = formattedText.replace(/•/g, '•');
    
    // Replace emojis
    const emojiMap = {
      '📊': '📊',
      '💰': '💰',
      '📦': '📦',
      '🚚': '🚚',
      '👥': '👥',
      '📍': '📍',
      '📅': '📅',
      '🏆': '🏆',
      '⚠️': '⚠️',
      '📋': '📋',
      '📝': '📝',
      '🧾': '🧾'
    };
    
    Object.entries(emojiMap).forEach(([emoji, html]) => {
      formattedText = formattedText.replace(new RegExp(emoji, 'g'), html);
    });
    
    return formattedText;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <span className={styles.aiIcon}>🤖</span>
            {language === "hindi" ? "Sagar का बिजनेस AI" : "Sagar's Business AI"}
          </h1>
          <p className={styles.subtitle}>
            {language === "hindi"
              ? "रियल-टाइम बिजनेस इंटेलिजेंस और एनालिटिक्स"
              : "Real-time Business Intelligence & Analytics"}
          </p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.datePicker}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.dateInput}
            />
            <button
              onClick={handleDateSearch}
              className={styles.dateSearchBtn}
              disabled={!selectedDate}
            >
              {language === "hindi" ? "ढूंढें" : "Search"}
            </button>
          </div>
          
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
            📊 {language === "hindi" ? "त्वरित आंकड़े" : "Quick Stats"}
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
    {showQuickStats && (
  <div className={styles.quickStatsModal}>
    <div className={styles.quickStatsContent}>
      <div className={styles.modalHeader}>
        <h3>📊 {language === "hindi" ? "त्वरित बिजनेस आंकड़े" : "Quick Business Stats"}</h3>
        <button
          className={styles.closeBtn}
          onClick={() => dispatch(toggleQuickStats())}
        >
          ✕
        </button>
      </div>
      
      {quickStats ? (
        // Render stats normally
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statValue}>
              {quickStats.totalOrders?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "कुल ऑर्डर" : "Total Orders"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>
              ₹{quickStats.totalSales?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "कुल बिक्री" : "Total Sales"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statValue}>
              {quickStats.totalCustomers?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "कुल ग्राहक" : "Total Customers"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🚚</div>
            <div className={styles.statValue}>
              {quickStats.completedDeliveries?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "पूर्ण डिलीवरी" : "Completed Deliveries"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statValue}>
              {quickStats.stockItems?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "स्टॉक आइटम" : "Stock Items"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⚠️</div>
            <div className={styles.statValue}>
              ₹{quickStats.totalOutstanding?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "बकाया राशि" : "Outstanding Amount"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statValue}>
              {quickStats.pendingDeliveries?.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN') || 0}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "पेंडिंग डिलीवरी" : "Pending Deliveries"}
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📈</div>
            <div className={styles.statValue}>
              {quickStats.avgOrderValue ? `₹${quickStats.avgOrderValue.toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN')}` : 'N/A'}
            </div>
            <div className={styles.statLabel}>
              {language === "hindi" ? "औसत ऑर्डर" : "Avg Order Value"}
            </div>
          </div>
        </div>
      ) : (
        // Show loading or error message
        <div className={styles.statsLoading}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
          <p className={styles.loadingText}>
            {language === "hindi" ? "बिजनेस आंकड़े लोड हो रहे हैं..." : "Loading business stats..."}
          </p>
          <p className={styles.loadingSubtext}>
            {language === "hindi" ? "कृपया प्रतीक्षा करें..." : "Please wait..."}
          </p>
        </div>
      )}
      
      {quickStats && quickStats.timestamp && (
        <div className={styles.statsFooter}>
          <div className={styles.footerLeft}>
            <small>
              {language === "hindi" ? "अंतिम अपडेट: " : "Last Updated: "}
              {new Date(quickStats.timestamp).toLocaleString(language === 'hindi' ? 'hi-IN' : 'en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </small>
          </div>
          <div className={styles.footerRight}>
            <small>
              {language === "hindi" ? "Sagar के AI द्वारा विश्लेषित" : "Analyzed by Sagar's AI"}
            </small>
          </div>
        </div>
      )}
    </div>
  </div>
)}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel - Chat */}
        <div className={styles.chatPanel}>
          {/* Chat Container */}
          <div className={styles.chatContainer}>
            {/* Welcome Message */}
            {!answer && conversation.length === 0 && (
              <div className={styles.welcomeMessage}>
                <div className={styles.welcomeIcon}>🤖</div>
                <h3>{language === "hindi" ? "नमस्ते! मैं हूँ Sagar का AI असिस्टेंट" : "Hello! I'm Sagar's AI Assistant"}</h3>
                <p>
                  {language === "hindi" 
                    ? "मैं आपके बिजनेस डेटा का विश्लेषण कर सकता हूँ। आप मुझसे पूछ सकते हैं:"
                    : "I can analyze your business data. You can ask me about:"}
                </p>
                <div className={styles.welcomeFeatures}>
                  <span>📊 {language === "hindi" ? "ऑर्डर और बिक्री" : "Orders & Sales"}</span>
                  <span>📦 {language === "hindi" ? "स्टॉक और इन्वेंटरी" : "Stock & Inventory"}</span>
                  <span>👥 {language === "hindi" ? "ग्राहक विश्लेषण" : "Customer Analysis"}</span>
                  <span>🚚 {language === "hindi" ? "डिलीवरी ट्रैकिंग" : "Delivery Tracking"}</span>
                  <span>💰 {language === "hindi" ? "भुगतान और वित्त" : "Payments & Finance"}</span>
                  <span>📍 {language === "hindi" ? "क्षेत्रवार प्रदर्शन" : "Area-wise Performance"}</span>
                </div>
              </div>
            )}

            {/* Conversation History */}
            {conversation.slice().reverse().map((conv) => (
              <React.Fragment key={conv.id}>
                {/* Question */}
                <div className={`${styles.message} ${styles.question}`}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageIcon}>👤</span>
                    <span className={styles.messageTime}>
                      {formatDate(conv.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {conv.question}
                  </div>
                </div>

                {/* Answer */}
                <div className={`${styles.message} ${styles.answer}`}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageIcon}>🤖</span>
                    <span className={styles.messageTime}>
                      {formatDate(conv.timestamp)}
                    </span>
                  </div>
                  <div
                    className={styles.messageContent}
                    dangerouslySetInnerHTML={{
                      __html: renderAnswer(conv.answer),
                    }}
                  />
                </div>
              </React.Fragment>
            ))}

            {/* Current Answer */}
            {answer && (
              <div className={`${styles.message} ${styles.answer} ${styles.currentAnswer}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageIcon}>🤖</span>
                  <span className={styles.messageTime}>
                    {formatDate(new Date())}
                  </span>
                </div>
                <div
                  className={styles.messageContent}
                  dangerouslySetInnerHTML={{
                    __html: renderAnswer(answer.answer),
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
                    ? "डेटा विश्लेषण किया जा रहा है..."
                    : "Analyzing data..."}
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
                    ? "अपना प्रश्न यहाँ टाइप करें (जैसे: 4 फरवरी 2026 को कितने ऑर्डर?)..."
                    : "Type your question here (e.g., How many orders on 4 February 2026?)..."
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
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClear}
                  disabled={loading}
                >
                  {language === "hindi" ? "साफ करें" : "Clear"}
                </button>
                
                <button
                  type="button"
                  className={styles.categoriesBtn}
                  onClick={() => setShowCategories(!showCategories)}
                >
                  {showCategories ? "▲" : "▼"} {language === "hindi" ? "श्रेणियाँ" : "Categories"}
                </button>
              </div>
              
              {/* Categories Dropdown */}
              {showCategories && (
                <div className={styles.categoriesDropdown}>
                  {Object.keys(CATEGORY_QUESTIONS).map((category) => (
                    <div key={category} className={styles.categorySection}>
                      <h4 className={styles.categoryTitle}>
                        {language === "hindi" 
                          ? {
                              "orders": "ऑर्डर",
                              "sales": "बिक्री",
                              "customers": "ग्राहक",
                              "delivery": "डिलीवरी",
                              "inventory": "स्टॉक",
                              "financial": "वित्त"
                            }[category]
                          : category.charAt(0).toUpperCase() + category.slice(1)}
                      </h4>
                      <div className={styles.categoryQuestions}>
                        {CATEGORY_QUESTIONS[category][language].slice(0, 3).map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={styles.categoryChip}
                            onClick={() => handleQuickQuestion(q)}
                            disabled={loading}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Quick Questions */}
              <div className={styles.sampleQuestions}>
                <span className={styles.sampleLabel}>
                  {language === "hindi" ? "लोकप्रिय प्रश्न:" : "Popular questions:"}
                </span>
                <div className={styles.questionChips}>
                  {SAMPLE_QUESTIONS[language].slice(0, 6).map((q, idx) => (
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
              <div className={styles.historyHeader}>
                <h3 className={styles.sidePanelTitle}>
                  📜 {language === "hindi" ? "बातचीत इतिहास" : "Conversation History"}
                </h3>
                <span className={styles.historyCount}>
                  {conversation.length} {language === "hindi" ? "प्रविष्टियाँ" : "entries"}
                </span>
              </div>
              
              {/* Categories Filter */}
              <div className={styles.categories}>
                {["all", "orders", "sales", "customers", "delivery", "inventory", "financial"].map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.categoryBtn} ${
                      activeCategory === cat ? styles.activeCategory : ""
                    }`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {language === "hindi"
                      ? {
                          "all": "सभी",
                          "orders": "ऑर्डर",
                          "sales": "बिक्री",
                          "customers": "ग्राहक",
                          "delivery": "डिलीवरी",
                          "inventory": "स्टॉक",
                          "financial": "वित्त"
                        }[cat]
                      : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* History List */}
              <div className={styles.historyList}>
                {filteredConversation.length > 0 ? (
                  filteredConversation.slice().reverse().map((conv) => (
                    <div 
                      key={conv.id} 
                      className={styles.historyItem}
                      onClick={() => {
                        dispatch(setQuestion(conv.question));
                        setTimeout(() => {
                          dispatch(askAI(conv.question));
                        }, 100);
                      }}
                    >
                      <div className={styles.historyQuestion}>
                        <strong>Q:</strong> {conv.question.substring(0, 60)}
                        {conv.question.length > 60 ? "..." : ""}
                      </div>
                      <div className={styles.historyAnswer}>
                        <strong>A:</strong>{" "}
                        {conv.answer.substring(0, 80).replace(/\n/g, ' ')}
                        {conv.answer.length > 80 ? "..." : ""}
                      </div>
                      <div className={styles.historyTime}>
                        {formatDate(conv.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noHistory}>
                    {language === "hindi"
                      ? activeCategory === "all" 
                        ? "कोई बातचीत इतिहास नहीं"
                        : `इस श्रेणी में कोई बातचीत नहीं`
                      : activeCategory === "all"
                        ? "No conversation history"
                        : `No conversations in this category`}
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
                      {["📅", "📊", "📈", "💰", "🚚", "🧾", "👥", "⚠️", "📦", "📍", "👨‍💼", "📋", "🏆", "📝", "🔍", "⚡", "🎯", "📉", "✅", "🔔"][idx]}
                    </div>
                    <div className={styles.questionText}>{q}</div>
                  </button>
                ))}
              </div>
              
              {/* Assistant Info */}
              {assistantInfo && (
                <div className={styles.assistantInfo}>
                  <div className={styles.infoHeader}>
                    <span className={styles.infoIcon}>🤖</span>
                    <h4>{language === "hindi" ? "असिस्टेंट जानकारी" : "Assistant Info"}</h4>
                  </div>
                  <div className={styles.infoContent}>
                    <div className={styles.infoItem}>
                      <strong>{language === "hindi" ? "नाम:" : "Name:"}</strong> {assistantInfo.name}
                    </div>
                    <div className={styles.infoItem}>
                      <strong>{language === "hindi" ? "डेवलपर:" : "Developer:"}</strong>{" "}
                      {assistantInfo.developer}
                    </div>
                    <div className={styles.infoItem}>
                      <strong>{language === "hindi" ? "संस्करण:" : "Version:"}</strong>{" "}
                      {assistantInfo.version}
                    </div>
                    <div className={styles.infoItem}>
                      <strong>{language === "hindi" ? "संपर्क:" : "Contact:"}</strong>{" "}
                      <a href={`mailto:${assistantInfo.email}`} className={styles.contactLink}>
                        {assistantInfo.email}
                      </a>
                    </div>
                  </div>
                  <div className={styles.capabilities}>
                    <strong>{language === "hindi" ? "क्षमताएँ:" : "Capabilities:"}</strong>
                    <div className={styles.capabilityChips}>
                      {assistantInfo.capabilities.slice(0, 4).map((cap, idx) => (
                        <span key={idx} className={styles.capabilityChip}>
                          {cap}
                        </span>
                      ))}
                    </div>
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
                ? `Sagar का बिजनेस इंटेलिजेंस AI v${assistantInfo?.version || '2.0'}`
                : `Sagar's Business Intelligence AI v${assistantInfo?.version || '2.0'}`}
            </span>
          </div>
          <div className={styles.footerRight}>
            <span className={`${styles.statusDot} ${styles.active}`}></span>
            <span>
              {language === "hindi" ? "सक्रिय और चालू" : "Active and Running"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;