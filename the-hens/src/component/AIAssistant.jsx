import React, { useState, useEffect, useRef, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  Bot,
  ArrowUp,
  Sparkles,
  Plus,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Search,
  Database,
  Building2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Users,
  Wallet,
  ShoppingBag,
  BarChart3,
  Package,
  Check,
  X,
  CornerDownLeft,
  Copy,
  CheckCheck,
  AlertCircle,
} from "lucide-react";

import { askAiAction, clearChat } from "../features/aiSlice";

import {
  searchCustomers,
  clearCustomerSuggestions,
} from "../features/cutomerSlice";

import styles from "./AiAssistant.module.css";

// =====================================================
// CONFIGURATION
// =====================================================

const PAGE_SIZE = 10;
const MIN_CUSTOMER_LENGTH = 3;
const EXCEL_MIN_ROWS = 10;

// =====================================================
// ENGLISH SUGGESTED QUESTIONS
// =====================================================

const suggestedQuestions = [
  {
    id: "sales",
    title: "Sales Overview",
    description: "Monthly sales and collections",
    question:
      "Show total sales, payments received, and outstanding balance for November 2026.",
    icon: TrendingUp,
  },
  {
    id: "customers",
    title: "Customer Insights",
    description: "Top customers by revenue",
    question: "Who are the top 10 customers by total sales this month?",
    icon: Users,
  },
  {
    id: "cash",
    title: "Cash Balances",
    description: "Delivery executive balances",
    question:
      "Which delivery executive currently has the highest cash balance?",
    icon: Wallet,
  },
  {
    id: "orders",
    title: "Order Summary",
    description: "Today's order activity",
    question: "How many active orders have been placed today?",
    icon: ShoppingBag,
  },
  {
    id: "comparison",
    title: "Sales Comparison",
    description: "Compare monthly performance",
    question:
      "Compare total sales, collections, and outstanding balances for October and November 2026.",
    icon: BarChart3,
  },
  {
    id: "inventory",
    title: "Inventory Analysis",
    description: "Product stock information",
    question: "Show recorded inventory quantities by product.",
    icon: Package,
  },
];

// =====================================================
// CUSTOMER HELPERS
// =====================================================

function getCustomerTerm(text) {
  const match = String(text || "").match(/([\p{L}\p{N}][\p{L}\p{N}.&'-]*)$/u);

  const term = match?.[1]?.trim() || "";

  return term.length >= MIN_CUSTOMER_LENGTH ? term : "";
}

function normalizeCustomerData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.customers)) {
    return payload.customers;
  }

  return [];
}

function getCustomerName(customer) {
  return String(
    customer?.CustomerName || customer?.customerName || customer?.name || "",
  ).trim();
}

function getCustomerArea(customer) {
  return customer?.Area || customer?.area || "Area not specified";
}

function insertCustomerName(text, customerName) {
  const value = String(text || "");
  const name = String(customerName || "").trim();

  if (!name) return value;

  const words = value.trim().split(/\s+/).filter(Boolean);

  // Replace the longest matching suffix.
  for (let count = Math.min(words.length, 5); count >= 1; count--) {
    const suffix = words.slice(-count).join(" ");

    if (name.toLocaleLowerCase().startsWith(suffix.toLocaleLowerCase())) {
      const prefix = words.slice(0, -count).join(" ");

      return `${prefix ? prefix + " " : ""}${name} `;
    }
  }

  const term = getCustomerTerm(value);

  if (term) {
    return value.slice(0, -term.length) + name + " ";
  }

  return `${value.trim()} ${name} `;
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

function formatCell(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatColumnName(name) {
  return String(name)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
}

// =====================================================
// EXCEL EXPORT
// =====================================================

function safeExcelValue(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  // Prevent untrusted strings becoming Excel formulas.
  if (/^\s*[=+\-@\t\r\n]/.test(text)) {
    return "'" + text;
  }

  return text;
}

async function exportToExcel(rows, question) {
  if (!Array.isArray(rows) || rows.length < EXCEL_MIN_ROWS) {
    return;
  }

  const XLSX = await import("xlsx");

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];

  const cleaned = rows.map((row) => {
    const record = {};

    columns.forEach((column) => {
      record[column] = safeExcelValue(row?.[column]);
    });

    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(cleaned, { header: columns });

  worksheet["!cols"] = columns.map((column) => {
    const maxLength = cleaned.reduce(
      (max, row) => Math.max(max, String(row[column] ?? "").length),
      column.length,
    );

    return {
      wch: Math.min(48, Math.max(16, maxLength + 3)),
    };
  });

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "ERP Results");

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  const label = String(question || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 35);

  XLSX.writeFile(workbook, `HensCo_${label || "report"}_${timestamp}.xlsx`);
}

// =====================================================
// COPY MESSAGE
// =====================================================

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ""));

      setCopied(true);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <button
      type="button"
      className={styles.messageAction}
      onClick={copyText}
      title={copied ? "Copied" : "Copy answer"}
      aria-label={copied ? "Copied" : "Copy answer"}
    >
      {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
    </button>
  );
}

// =====================================================
// RESULT TABLE
// =====================================================

function ResultTable({ rows, question, rowCount }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const columns = useMemo(
    () => [...new Set(rows.flatMap((row) => Object.keys(row || {})))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const term = search.toLocaleLowerCase();

    return rows.filter((row) =>
      columns.some((column) =>
        String(row?.[column] ?? "")
          .toLocaleLowerCase()
          .includes(term),
      ),
    );
  }, [rows, columns, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleExport = async () => {
    try {
      setExportError("");
      setExporting(true);

      await exportToExcel(rows, question);
    } catch (error) {
      console.error("Excel export error:", error);

      setExportError("Excel export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!rows.length) return null;

  const hasMoreServerRows =
    Number.isFinite(Number(rowCount)) && Number(rowCount) > rows.length;

  return (
    <section className={styles.resultCard}>
      <div className={styles.resultHeader}>
        <div className={styles.resultTitle}>
          <div className={styles.resultIcon}>
            <Database size={16} />
          </div>

          <div>
            <h4>ERP Results</h4>
            <p>
              {rows.length} record
              {rows.length !== 1 ? "s" : ""} loaded
            </p>
          </div>
        </div>

        <div className={styles.resultActions}>
          {rows.length > 5 && (
            <div className={styles.tableSearch}>
              <Search size={15} />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter results..."
                aria-label="Filter results"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {rows.length >= EXCEL_MIN_ROWS && (
            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <LoaderCircle size={15} className={styles.spinner} />
              ) : (
                <FileSpreadsheet size={16} />
              )}

              <span>Export Excel</span>
              <Download size={13} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th className={styles.numberColumn}>#</th>

              {columns.map((column) => (
                <th key={column}>{formatColumnName(column)}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={index}>
                <td className={styles.numberColumn}>
                  {(currentPage - 1) * PAGE_SIZE + index + 1}
                </td>

                {columns.map((column) => (
                  <td key={column}>{formatCell(row?.[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <div className={styles.emptyTable}>No matching records found.</div>
        )}
      </div>

      <div className={styles.resultFooter}>
        <div className={styles.resultFooterText}>
          Showing {filteredRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
          {" - "}
          {Math.min(currentPage * PAGE_SIZE, filteredRows.length)}
          {" of "}
          {filteredRows.length}
          {hasMoreServerRows && (
            <span> (more records available on server)</span>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((previous) => Math.min(totalPages, previous + 1))
              }
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {exportError && (
        <div className={styles.exportError}>
          <AlertCircle size={14} />
          {exportError}
        </div>
      )}
    </section>
  );
}

// =====================================================
// CHAT MESSAGE
// =====================================================

function ChatMessage({ chat, question }) {
  const isUser = chat.sender === "user";
  const isError = chat.status === "error";
  const isDatabase = chat.mode === "database";

  const rows = Array.isArray(chat.data) ? chat.data : [];

  return (
    <div
      className={`${styles.messageRow} ${
        isUser ? styles.userRow : styles.assistantRow
      }`}
    >
      <div
        className={`${styles.avatar} ${
          isUser ? styles.userAvatar : styles.aiAvatar
        }`}
      >
        {isUser ? <span>Y</span> : <Bot size={19} strokeWidth={2} />}
      </div>

      <div className={styles.messageMain}>
        <div className={styles.messageTitle}>
          {isUser ? "You" : "HensCo Intelligence"}

          {!isUser && isDatabase && (
            <span className={styles.dataBadge}>
              <Database size={11} />
              ERP Data
            </span>
          )}
        </div>

        <div
          className={`${styles.messageBody} ${
            isUser ? styles.userMessage : styles.aiMessage
          } ${isError ? styles.errorMessage : ""}`}
        >
          <div className={styles.messageText}>
            {chat.message || chat.text || ""}
          </div>
        </div>

        {!isUser && rows.length > 0 && (
          <ResultTable
            rows={rows}
            question={question || "ERP Report"}
            rowCount={chat.rowCount}
          />
        )}

        {!isUser && (
          <div className={styles.messageTools}>
            <CopyButton value={chat.message || chat.text} />

            {isDatabase && (
              <span className={styles.messageInfo}>
                <Database size={12} />
                {rows.length} rows
              </span>
            )}

            {chat.durationMs != null && (
              <span className={styles.messageInfo}>
                {(Number(chat.durationMs) / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MAIN AI ASSISTANT
// =====================================================

const AiAssistant = () => {
  const dispatch = useDispatch();

  const { chatHistory = [], loading = false } = useSelector(
    (state) => state.ai,
  );

  // Existing customer Redux slice
  const customerState = useSelector((state) => state.customer);

  const customerLoading = customerState?.isLoading || false;

  const customerSuggestions = customerState?.customerSuggestions;

  const customers = useMemo(() => {
    const list = normalizeCustomerData(customerSuggestions);

    return list.filter((customer) => getCustomerName(customer)).slice(0, 10);
  }, [customerSuggestions]);

  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const [showCustomers, setShowCustomers] = useState(false);

  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const [selectedCustomerName, setSelectedCustomerName] = useState("");

  const [lastQuestion, setLastQuestion] = useState("");

  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const [customerError, setCustomerError] = useState("");

  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const composerRef = useRef(null);

  const latestSearchRef = useRef(0);

  const customerTerm = getCustomerTerm(input);

  // -------------------------------------------------
  // SCROLL TO NEW MESSAGES
  // -------------------------------------------------

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [chatHistory, loading]);

  // -------------------------------------------------
  // CUSTOMER SEARCH - EXISTING REDUX ACTION
  // -------------------------------------------------

  useEffect(() => {
    if (!customerTerm || !isFocused || loading || selectedCustomerName) {
      setShowCustomers(false);
      return;
    }

    const timer = setTimeout(() => {
      const requestId = ++latestSearchRef.current;

      setCustomerError("");

      dispatch(searchCustomers(customerTerm))
        .unwrap()
        .then(() => {
          if (requestId !== latestSearchRef.current) {
            return;
          }
        })
        .catch((error) => {
          if (requestId !== latestSearchRef.current) {
            return;
          }

          console.error("Customer search:", error);

          setCustomerError("Customer search is unavailable.");
          setShowCustomers(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [customerTerm, isFocused, loading, selectedCustomerName, dispatch]);

  useEffect(() => {
    if (
      !customerTerm ||
      selectedCustomerName ||
      !isFocused ||
      loading ||
      customerError
    ) {
      setShowCustomers(false);
      return;
    }

    setActiveSuggestion(0);
    setShowCustomers(customers.length > 0);
  }, [
    customerTerm,
    customers,
    selectedCustomerName,
    isFocused,
    loading,
    customerError,
  ]);

  // -------------------------------------------------
  // OUTSIDE CLICK
  // -------------------------------------------------

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (composerRef.current && !composerRef.current.contains(event.target)) {
        setShowCustomers(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, []);

  // -------------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------------

  const sendQuestion = (question) => {
    const value = String(question || "").trim();

    if (!value || loading) return;

    latestSearchRef.current++;

    setLastQuestion(value);

    dispatch(askAiAction(value));

    setInput("");
    setShowCustomers(false);
    setSelectedCustomerName("");
    setCustomerError("");
    setShowAllSuggestions(false);

    dispatch(clearCustomerSuggestions());
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(input);
  };

  // -------------------------------------------------
  // SELECT CUSTOMER
  // -------------------------------------------------

  const selectCustomer = (customer) => {
    const name = getCustomerName(customer);

    if (!name) return;

    latestSearchRef.current++;

    setInput((previous) => insertCustomerName(previous, name));

    setSelectedCustomerName(name);
    setShowCustomers(false);
    setCustomerError("");

    dispatch(clearCustomerSuggestions());

    textareaRef.current?.focus();
  };

  // -------------------------------------------------
  // TYPING
  // -------------------------------------------------

  const handleInputChange = (event) => {
    latestSearchRef.current++;

    setInput(event.target.value);
    setSelectedCustomerName("");
    setCustomerError("");
    setShowCustomers(false);

    dispatch(clearCustomerSuggestions());
  };

  // -------------------------------------------------
  // KEYBOARD
  // -------------------------------------------------

  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (showCustomers && customers.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();

        setActiveSuggestion((previous) => (previous + 1) % customers.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        setActiveSuggestion(
          (previous) => (previous - 1 + customers.length) % customers.length,
        );
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        selectCustomer(customers[activeSuggestion]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowCustomers(false);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(input);
    }
  };

  // -------------------------------------------------
  // CLEAR CHAT
  // -------------------------------------------------

  const handleClearChat = () => {
    if (loading) return;

    latestSearchRef.current++;

    dispatch(clearChat());
    dispatch(clearCustomerSuggestions());

    setInput("");
    setLastQuestion("");
    setSelectedCustomerName("");
    setShowCustomers(false);
    setCustomerError("");
    setShowAllSuggestions(false);
  };

  // -------------------------------------------------
  // RETRY LAST QUESTION
  // -------------------------------------------------

  const retryLastQuestion = () => {
    if (!lastQuestion || loading) return;

    sendQuestion(lastQuestion);
  };

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------

  return (
    <div className={styles.app}>
      {/* HEADER */}

      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.brandLogo}>
            <Bot size={22} />
          </div>

          <div className={styles.brandText}>
            <h1>
              HensCo Intelligence
              <Sparkles size={15} />
            </h1>

            <p>AI-powered ERP assistant</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.status}>
            <span
              className={`${styles.statusDot} ${
                loading ? styles.statusLoading : ""
              }`}
            />

            <span>{loading ? "Analyzing..." : "Ready"}</span>
          </div>

          <button
            type="button"
            className={styles.iconButton}
            title="Repeat last question"
            aria-label="Repeat last question"
            disabled={!lastQuestion || loading}
            onClick={retryLastQuestion}
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            className={styles.iconButton}
            title="New conversation"
            aria-label="New conversation"
            onClick={handleClearChat}
            disabled={loading}
          >
            <Plus size={19} />
          </button>
        </div>
      </header>

      {/* MAIN CHAT */}

      <main className={styles.chatArea}>
        <div className={styles.chatContent}>
          {chatHistory.length === 0 && !loading ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeLogo}>
                <Sparkles size={29} />
              </div>

              <h2>What can I help you analyze?</h2>

              <p>
                Ask questions about ERP data, customers, sales, orders,
                payments, and business performance.
              </p>

              <div className={styles.suggestionGrid}>
                {suggestedQuestions
                  .slice(0, showAllSuggestions ? 6 : 4)
                  .map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={styles.suggestionCard}
                        onClick={() => sendQuestion(item.question)}
                      >
                        <div className={styles.suggestionIcon}>
                          <Icon size={18} />
                        </div>

                        <div className={styles.suggestionText}>
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </div>

                        <ArrowUpRight
                          size={15}
                          className={styles.suggestionArrow}
                        />
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                className={styles.moreSuggestions}
                onClick={() => setShowAllSuggestions((previous) => !previous)}
              >
                {showAllSuggestions
                  ? "Show fewer suggestions"
                  : "Explore more suggestions"}

                <ArrowUpRight size={14} />
              </button>
            </div>
          ) : (
            <div className={styles.conversation}>
              {chatHistory.map((chat, index) => {
                const question =
                  chat.question ||
                  chatHistory
                    .slice(0, index)
                    .reverse()
                    .find((item) => item.sender === "user")?.text ||
                  "";

                return (
                  <ChatMessage
                    key={`${chat.timestamp || 0}-${index}`}
                    chat={chat}
                    question={question}
                  />
                );
              })}

              {loading && (
                <div className={styles.loadingMessage}>
                  <div className={styles.aiAvatar}>
                    <Bot size={19} />
                  </div>

                  <div className={styles.loadingContent}>
                    <strong>HensCo Intelligence</strong>

                    <div className={styles.loadingDots}>
                      <span />
                      <span />
                      <span />
                    </div>

                    <p>Analyzing your ERP data...</p>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>
      </main>

      {/* COMPOSER */}

      <footer className={styles.footer}>
        <div className={styles.composerContainer} ref={composerRef}>
          {/* CUSTOMER SUGGESTIONS */}

          {showCustomers && customers.length > 0 && (
            <div
              className={styles.customerDropdown}
              role="listbox"
              aria-label="Customer suggestions"
            >
              <div className={styles.dropdownHeader}>
                <div>
                  <Building2 size={15} />
                  <strong>Customer suggestions</strong>
                </div>

                <span>{customers.length} matches</span>
              </div>

              <div className={styles.customerList}>
                {customers.map((customer, index) => (
                  <button
                    type="button"
                    key={customer.CustomerId ?? customer.customerId ?? index}
                    role="option"
                    aria-selected={index === activeSuggestion}
                    className={`${styles.customerItem} ${
                      index === activeSuggestion ? styles.customerActive : ""
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCustomer(customer)}
                    onMouseEnter={() => setActiveSuggestion(index)}
                  >
                    <div className={styles.customerAvatar}>
                      <Building2 size={17} />
                    </div>

                    <div className={styles.customerInfo}>
                      <strong>{getCustomerName(customer)}</strong>

                      <span>{getCustomerArea(customer)}</span>
                    </div>

                    {index === activeSuggestion ? (
                      <CornerDownLeft size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </button>
                ))}
              </div>

              <div className={styles.dropdownFooter}>
                <span>
                  <CornerDownLeft size={12} />
                  Enter to select
                </span>

                <span>
                  <Check size={12} />
                  Click to insert
                </span>
              </div>
            </div>
          )}

          {/* INPUT FORM */}

          <form
            className={`${styles.composer} ${
              isFocused ? styles.composerFocused : ""
            }`}
            onSubmit={handleSubmit}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              maxLength={2000}
              onChange={handleInputChange}
              onFocus={() => {
                setIsFocused(true);

                if (customers.length && !selectedCustomerName) {
                  setShowCustomers(true);
                }
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your ERP..."
              disabled={loading}
              aria-label="Ask HensCo Intelligence"
            />

            <div className={styles.composerBottom}>
              <div className={styles.composerLeft}>
                <div className={styles.customerHint}>
                  <Search size={14} />

                  <span>Type 3 letters to search customers</span>
                </div>

                {customerLoading && (
                  <LoaderCircle size={15} className={styles.spinner} />
                )}
              </div>

              <div className={styles.composerRight}>
                <span className={styles.charCount}>{input.length}/2000</span>

                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={!input.trim() || loading}
                  title="Send message"
                  aria-label="Send message"
                >
                  {loading ? (
                    <LoaderCircle size={19} className={styles.spinner} />
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </div>
            </div>
          </form>

          {customerError && (
            <p className={styles.customerError}>
              <AlertCircle size={13} />
              {customerError}
            </p>
          )}
        </div>

        <div className={styles.footerNote}>
          <span>
            <ShieldCheck size={12} />
            ERP data access is permission-based
          </span>

          <span>HensCo Intelligence • Built by Sagar Gupta</span>
        </div>
      </footer>
    </div>
  );
};

export default AiAssistant;
