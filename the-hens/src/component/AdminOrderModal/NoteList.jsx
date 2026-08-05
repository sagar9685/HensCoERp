import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaFileInvoice,
  FaUser,
  FaBox,
  FaTable,
  FaThLarge,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaBalanceScale,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import styles from "./NoteList.module.css";
import { getNotes, deleteNote } from "../../features/noteSlice";

import Header from "../Header";
import NoteInvoice from "./NoteInvoice";
import NoteViewModal from "./NoteViewModal";
import UpdateNote from "./UpdateNote";

const NoteList = () => {
  const dispatch = useDispatch();
  const { notes = [], loading } = useSelector((state) => state.note);

  const [selectedNote, setSelectedNote] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedViewNote, setSelectedViewNote] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [viewMode, setViewMode] = useState("table");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNote, setEditNote] = useState(null);

  useEffect(() => {
    dispatch(getNotes());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const noteTypes = useMemo(() => {
    const types = new Set(notes.map((item) => item.note_type).filter(Boolean));
    return ["All", ...Array.from(types)];
  }, [notes]);

  const totals = useMemo(() => {
    return notes.reduce(
      (acc, item) => {
        const amt = Number(item.amount) || 0;
        if (item.note_type === "Credit") acc.credit += amt;
        else if (item.note_type === "Debit") acc.debit += amt;
        return acc;
      },
      { credit: 0, debit: 0 },
    );
  }, [notes]);

  // Group items by note_no for master-detail aggregation
  const groupedNotes = useMemo(() => {
    const map = {};

    notes.forEach((item) => {
      if (!map[item.note_no]) {
        map[item.note_no] = {
          ...item,
          customer_name: item.customer_name || item.CustomerName || "—",
          invoice_no: item.invoice_no || item.InvoiceNo || "—",
          products: [],
          totalQty: 0,
          totalAmount: 0,
        };
      }

      map[item.note_no].products.push(item);
      map[item.note_no].totalQty += Number(item.note_qty || 0);
      map[item.note_no].totalAmount += Number(item.amount || 0);
    });

    return Object.values(map);
  }, [notes]);

  // Filter and Sort Grouped Notes
  const filteredGroupedNotes = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    let filtered = groupedNotes.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.note_no?.toLowerCase().includes(keyword) ||
        item.invoice_no?.toLowerCase().includes(keyword) ||
        item.customer_name?.toLowerCase().includes(keyword) ||
        item.note_type?.toLowerCase().includes(keyword) ||
        item.products.some(
          (p) =>
            p.product_name?.toLowerCase().includes(keyword) ||
            p.reason?.toLowerCase().includes(keyword),
        );

      const matchesType =
        typeFilter === "All" ? true : item.note_type === typeFilter;

      return matchesSearch && matchesType;
    });

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key] ?? "";
        let bVal = b[sortConfig.key] ?? "";

        if (sortConfig.key === "totalAmount") {
          aVal = a.totalAmount;
          bVal = b.totalAmount;
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return filtered;
  }, [groupedNotes, search, typeFilter, sortConfig]);

  // Pagination bounds
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroupedNotes.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotes = filteredGroupedNotes.slice(startIndex, endIndex);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleView = (note) => {
    setSelectedViewNote(note);
    setShowViewModal(true);
  };

  const handleEdit = (note) => {
    setEditNote(note);
    setShowEditModal(true);
  };

  const handleInvoice = (note) => {
    setSelectedNote(note);
    setShowInvoice(true);
  };

  const handleDelete = (id, noteNo) => {
    if (window.confirm(`Delete note ${noteNo}? This cannot be undone.`)) {
      dispatch(deleteNote(id));
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className={styles.sortIcon} />;
    return sortConfig.direction === "asc" ? (
      <FaSortUp className={styles.sortIconActive} />
    ) : (
      <FaSortDown className={styles.sortIconActive} />
    );
  };

  const renderPagination = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) endPage = Math.min(5, totalPages);
      else startPage = Math.max(1, totalPages - 4);
    }

    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

    return (
      <div className={styles.paginationWrapper}>
        <div className={styles.paginationInfo}>
          <span>
            Showing{" "}
            <strong>
              {filteredGroupedNotes.length === 0 ? 0 : startIndex + 1}
            </strong>
            –<strong>{Math.min(endIndex, filteredGroupedNotes.length)}</strong>{" "}
            of <strong>{filteredGroupedNotes.length}</strong>
          </span>
          <div className={styles.perPageControl}>
            <label htmlFor="perPage">Rows</label>
            <select
              id="perPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={styles.perPageSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className={styles.paginationControls}>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={styles.paginationBtn}
            aria-label="Previous page"
          >
            <FaChevronLeft />
          </button>

          {startPage > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className={styles.paginationBtn}
              >
                1
              </button>
              {startPage > 2 && (
                <span className={styles.paginationDots}>···</span>
              )}
            </>
          )}

          {pageNumbers.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setCurrentPage(num)}
              className={`${styles.paginationBtn} ${
                currentPage === num ? styles.activePage : ""
              }`}
              aria-current={currentPage === num ? "page" : undefined}
            >
              {num}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className={styles.paginationDots}>···</span>
              )}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                className={styles.paginationBtn}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className={styles.paginationBtn}
            aria-label="Next page"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const renderEmpty = () => (
    <div className={styles.emptyState}>
      <FaFileInvoice className={styles.emptyIcon} aria-hidden="true" />
      <h3>No notes found</h3>
      <p>Try a different search term or filter.</p>
    </div>
  );

  // Replace the table rendering section with this:

  const renderTableView = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.hideMobile}>#</th>
            <th
              onClick={() => handleSort("note_no")}
              className={styles.sortableHeader}
            >
              <span>Note No {sortIcon("note_no")}</span>
            </th>
            <th
              onClick={() => handleSort("note_type")}
              className={styles.sortableHeader}
            >
              <span>Type {sortIcon("note_type")}</span>
            </th>
            <th>Invoice</th>
            <th>Customer</th>
            <th className={styles.productsHeader}>
              <span>Products</span>
              <span className={styles.productSubHeader}>Qty × Rate</span>
            </th>
            <th className={styles.hideTablet}>Freight</th>
            <th
              onClick={() => handleSort("amount")}
              className={styles.sortableHeader}
            >
              <span>Amount {sortIcon("amount")}</span>
            </th>
            <th className={styles.hideMobile}>Date</th>
            <th className={styles.actionHeader}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <tr key={idx} className={styles.skeletonRow}>
                <td colSpan={10}>
                  <div className={styles.skeleton}></div>
                </td>
              </tr>
            ))
          ) : currentNotes.length === 0 ? (
            <tr>
              <td colSpan={10}>{renderEmpty()}</td>
            </tr>
          ) : (
            <AnimatePresence initial={false}>
              {currentNotes.map((item, index) => (
                <motion.tr
                  key={item.note_id || item.note_no}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: index * 0.03 }}
                  className={`${styles.tableRow} ${
                    item.note_type === "Credit"
                      ? styles.rowCredit
                      : styles.rowDebit
                  }`}
                >
                  <td className={styles.hideMobile}>
                    {startIndex + index + 1}
                  </td>
                  <td>
                    <span className={styles.noteNo}>{item.note_no}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        item.note_type === "Credit"
                          ? styles.credit
                          : styles.debit
                      }`}
                    >
                      {item.note_type === "Credit" ? (
                        <FaArrowDown />
                      ) : (
                        <FaArrowUp />
                      )}
                      {item.note_type}
                    </span>
                  </td>
                  <td>
                    <span className={styles.invoiceNo}>{item.InvoiceNo}</span>
                  </td>
                  <td>
                    <div className={styles.customerCell}>
                      <FaUser className={styles.cellIcon} aria-hidden="true" />
                      <span
                        className={styles.truncateText}
                        title={item.customer_name}
                      >
                        {item.CustomerName}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.productsCell}>
                      <div className={styles.productsList}>
                        {item.products.map((p, idx) => (
                          <div key={p.note_id} className={styles.productItem}>
                            <span className={styles.productName}>
                              {p.product_name}
                            </span>
                            <div className={styles.productDetails}>
                              <span className={styles.productQty}>
                                {p.note_qty || 0}
                              </span>
                              <span className={styles.productSeparator}>×</span>
                              <span className={styles.productRate}>
                                {formatCurrency(p.rate || 0)}
                              </span>
                              {idx < item.products.length - 1 && (
                                <span className={styles.productDivider}>|</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={styles.productSummary}>
                        <span className={styles.totalQty}>
                          Total: {item.totalQty || 0} units
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.hideTablet}>
                    <span className={styles.rateText}>
                      {formatCurrency(item.freight)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.amountText} ${
                        item.note_type === "Credit"
                          ? styles.amountCredit
                          : styles.amountDebit
                      }`}
                    >
                      {item.note_type === "Credit" ? "+" : "−"}
                      {formatCurrency(item.totalAmount)}
                    </span>
                  </td>
                  <td className={styles.hideMobile}>
                    <span className={styles.dateText}>
                      <FaCalendarAlt
                        className={styles.dateIcon}
                        aria-hidden="true"
                      />
                      {formatDate(item.note_date)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.viewBtn}
                        title="View details"
                        aria-label={`View note ${item.note_no}`}
                        onClick={() => handleView(item)}
                      >
                        <FaEye />
                      </button>

                      <button
                        type="button"
                        className={styles.editBtn}
                        title="Edit Note"
                        onClick={() => handleEdit(item)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.note_id, item.note_no)}
                        title="Delete note"
                        aria-label={`Delete note ${item.note_no}`}
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.invoiceBtn}
                        onClick={() => handleInvoice(item)}
                        title="Invoice"
                        aria-label={`Invoice for note ${item.note_no}`}
                      >
                        <FaFileInvoice aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => {
    if (loading) {
      return (
        <div className={styles.gridWrapper}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={styles.gridCardSkeleton} />
          ))}
        </div>
      );
    }

    if (currentNotes.length === 0) {
      return <div className={styles.gridWrapper}>{renderEmpty()}</div>;
    }

    return (
      <div className={styles.gridWrapper}>
        <AnimatePresence initial={false}>
          {currentNotes.map((item, index) => (
            <motion.div
              key={item.note_id || item.note_no}
              className={`${styles.gridCard} ${
                item.note_type === "Credit" ? styles.rowCredit : styles.rowDebit
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: index * 0.03 }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.noteNo}>{item.note_no}</span>
                  <span
                    className={`${styles.badge} ${
                      item.note_type === "Credit" ? styles.credit : styles.debit
                    }`}
                  >
                    {item.note_type === "Credit" ? (
                      <FaArrowDown />
                    ) : (
                      <FaArrowUp />
                    )}
                    {item.note_type}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    title="View"
                    onClick={() => handleView(item)}
                  >
                    <FaEye aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.editBtn}
                    title="Edit"
                    onClick={() => handleEdit(item)}
                  >
                    <FaEdit aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    title="Delete"
                    onClick={() => handleDelete(item.note_id, item.note_no)}
                  >
                    <FaTrash aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.invoiceBtn}
                    title="Invoice"
                    onClick={() => handleInvoice(item)}
                  >
                    <FaFileInvoice aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className={styles.cardAmountRow}>
                <span
                  className={`${styles.cardAmount} ${
                    item.note_type === "Credit"
                      ? styles.amountCredit
                      : styles.amountDebit
                  }`}
                >
                  {item.note_type === "Credit" ? "+" : "−"}
                  {formatCurrency(item.totalAmount)}
                </span>
                <span className={styles.dateText}>
                  <FaCalendarAlt
                    className={styles.dateIcon}
                    aria-hidden="true"
                  />
                  {formatDate(item.note_date || item.created_at)}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardField}>
                  <FaFileInvoice
                    className={styles.fieldIcon}
                    aria-hidden="true"
                  />
                  <span className={styles.fieldLabel}>Invoice</span>
                  <span className={styles.fieldValue}>{item.invoice_no}</span>
                </div>
                <div className={styles.cardField}>
                  <FaUser className={styles.fieldIcon} aria-hidden="true" />
                  <span className={styles.fieldLabel}>Customer</span>
                  <span className={styles.fieldValue}>
                    {item.customer_name}
                  </span>
                </div>

                {/* Grid View Product Chips */}
                <div className={styles.cardProductsSection}>
                  <div className={styles.fieldLabel}>
                    <FaBox className={styles.fieldIcon} />
                    <span>Items ({item.products.length})</span>
                  </div>
                  <div className={styles.productPillContainer}>
                    {item.products.slice(0, 2).map((p, idx) => (
                      <span
                        key={p.note_id || idx}
                        className={styles.productBadge}
                      >
                        <span className={styles.productBadgeName}>
                          {p.product_name || "Item"}
                        </span>
                        <span className={styles.productBadgeQty}>
                          × {p.note_qty}
                        </span>
                      </span>
                    ))}
                    {item.products.length > 2 && (
                      <span className={styles.moreProductsPill}>
                        +{item.products.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.pageTitle}>
              <span className={styles.titleMark} aria-hidden="true">
                <FaFileInvoice />
              </span>
              Credit / Debit Notes
            </h1>
            <p className={styles.pageSubtitle}>
              Adjustments issued against customer invoices
            </p>
          </div>
        </div>

        <div className={styles.ledgerStrip}>
          <div className={`${styles.ledgerCard} ${styles.ledgerCredit}`}>
            <span className={styles.ledgerIcon}>
              <FaArrowDown />
            </span>
            <div>
              <span className={styles.ledgerLabel}>Total Credited</span>
              <span className={styles.ledgerValue}>
                {formatCurrency(totals.credit)}
              </span>
            </div>
          </div>

          <div className={`${styles.ledgerCard} ${styles.ledgerDebit}`}>
            <span className={styles.ledgerIcon}>
              <FaArrowUp />
            </span>
            <div>
              <span className={styles.ledgerLabel}>Total Debited</span>
              <span className={styles.ledgerValue}>
                {formatCurrency(totals.debit)}
              </span>
            </div>
          </div>

          <div className={`${styles.ledgerCard} ${styles.ledgerNet}`}>
            <span className={styles.ledgerIcon}>
              <FaBalanceScale />
            </span>
            <div>
              <span className={styles.ledgerLabel}>Net Balance</span>
              <span className={styles.ledgerValue}>
                {formatCurrency(totals.credit - totals.debit)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search note, invoice, customer, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notes"
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.filterControls}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filter by note type"
            >
              {noteTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All types" : type}
                </option>
              ))}
            </select>

            <div
              className={styles.viewToggle}
              role="group"
              aria-label="Switch view"
            >
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${
                  viewMode === "table" ? styles.activeView : ""
                }`}
                onClick={() => setViewMode("table")}
                title="Table view"
                aria-pressed={viewMode === "table"}
              >
                <FaTable />
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${
                  viewMode === "grid" ? styles.activeView : ""
                }`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <FaThLarge />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "table" ? renderTableView() : renderGridView()}

        {!loading && filteredGroupedNotes.length > 0 && renderPagination()}
      </div>

      {showInvoice && (
        <NoteInvoice
          noteData={selectedNote}
          onClose={() => {
            setShowInvoice(false);
            setSelectedNote(null);
          }}
        />
      )}

      {showViewModal && (
        <NoteViewModal
          note={selectedViewNote}
          onClose={() => {
            setShowViewModal(false);
            setSelectedViewNote(null);
          }}
        />
      )}

      {showEditModal && (
        <UpdateNote
          note={editNote}
          onClose={() => {
            setShowEditModal(false);
            setEditNote(null);
          }}
        />
      )}
    </>
  );
};

export default NoteList;
