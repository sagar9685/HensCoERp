import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  fetchDeliveryPendingSummary,
  fetchDeliveryManPendingOrders,
  clearDeliveryOrders,
} from "../../features/deliveryPendingSlice";

import styles from "./DeliveryPending.module.css";
import UserSideBar from "../user/UserSidebar";
import UserNavbar from "../user/UserNavBar";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DB";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const DeliveryPending = () => {
  const dispatch = useDispatch();

  const {
    summary = [],
    selectedDeliveryMan = null,
    pendingOrders = [],
    pendingOrderSummary = {
      pendingOrders: 0,
      pendingAmount: 0,
    },
    loading = false,
    orderLoading = false,
  } = useSelector((state) => state.deliveryPending || {});

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchDeliveryPendingSummary());
  }, [dispatch]);

  useEffect(() => {
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowModal(false);
        dispatch(clearDeliveryOrders());
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showModal, dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDeliveryPendingSummary());
  };

  const handleView = (deliveryMan) => {
    setShowModal(true);
    dispatch(fetchDeliveryManPendingOrders(deliveryMan.DeliveryManID));
  };

  const handleClose = () => {
    setShowModal(false);
    dispatch(clearDeliveryOrders());
  };

  const filteredSummary = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return summary;

    return summary.filter((item) =>
      [item.DeliveryManName, item.Area, item.MobileNo, item.DeliveryManID]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [summary, searchTerm]);

  const grandPendingOrders = useMemo(
    () =>
      summary.reduce((sum, item) => sum + Number(item.PendingOrders || 0), 0),
    [summary],
  );

  const grandPendingAmount = useMemo(
    () =>
      summary.reduce((sum, item) => sum + Number(item.PendingAmount || 0), 0),
    [summary],
  );

  const deliveryBoysWithPending = useMemo(
    () => summary.filter((item) => Number(item.PendingOrders || 0) > 0).length,
    [summary],
  );

  const averagePending = deliveryBoysWithPending
    ? grandPendingAmount / deliveryBoysWithPending
    : 0;

  const exportSummaryExcel = () => {
    const rows = summary.map((item, index) => ({
      "S.No": index + 1,
      "Delivery Man": item.DeliveryManName,
      "Pending Orders": Number(item.PendingOrders || 0),
      "Pending Amount": Number(item.PendingAmount || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Summary");
    XLSX.writeFile(workbook, "Delivery_Pending_Summary.xlsx");
  };

  const exportSummaryPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Delivery Boy Pending Collection Summary", 14, 15);

    doc.setFontSize(10);
    doc.text(`Total Pending Orders: ${grandPendingOrders}`, 14, 23);
    doc.text(`Total Pending Amount: Rs. ${money(grandPendingAmount)}`, 14, 29);

    autoTable(doc, {
      startY: 35,
      head: [["S.No", "Delivery Man", "Pending Orders", "Pending Amount"]],
      body: summary.map((item, index) => [
        index + 1,
        item.DeliveryManName,
        item.PendingOrders,
        `Rs. ${money(item.PendingAmount)}`,
      ]),
    });

    doc.save("Delivery_Pending_Summary.pdf");
  };

  const exportOrdersExcel = () => {
    if (!pendingOrders.length) return;

    const rows = pendingOrders.map((order, index) => ({
      "S.No": index + 1,
      "Order ID": order.OrderID,
      Customer: order.CustomerName,
      Area: order.Area,
      "Contact No": order.ContactNo,
      "Order Date": formatDate(order.OrderDate),
      "Delivery Date": formatDate(order.DeliveryDate),
      "Items Total": Number(order.ItemsTotal || 0),
      "Delivery Charge": Number(order.DeliveryCharge || 0),
      "Order Total": Number(order.OrderTotal || 0),
      Status: order.DeliveryStatus,
    }));

    rows.push({
      "S.No": "",
      "Order ID": "",
      Customer: "",
      Area: "",
      "Contact No": "",
      "Order Date": "",
      "Delivery Date": "TOTAL",
      "Items Total": "",
      "Delivery Charge": "",
      "Order Total": Number(pendingOrderSummary.pendingAmount || 0),
      Status: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Orders");

    const fileName = `${
      selectedDeliveryMan?.Name || "DeliveryMan"
    }_Pending_Orders.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const exportOrdersPDF = () => {
    if (!pendingOrders.length) return;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(15);
    doc.text(`${selectedDeliveryMan?.Name || ""} - Pending Orders`, 14, 15);

    doc.setFontSize(10);
    doc.text(
      `Pending Orders: ${pendingOrderSummary.pendingOrders || 0}`,
      14,
      23,
    );
    doc.text(
      `Pending Amount: Rs. ${money(pendingOrderSummary.pendingAmount)}`,
      14,
      29,
    );

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "#",
          "Order",
          "Customer",
          "Area",
          "Contact",
          "Delivery Date",
          "Items",
          "Delivery",
          "Total",
        ],
      ],
      body: pendingOrders.map((order, index) => [
        index + 1,
        order.OrderID,
        order.CustomerName || "-",
        order.Area || "-",
        order.ContactNo || "-",
        formatDate(order.DeliveryDate),
        `Rs. ${money(order.ItemsTotal)}`,
        `Rs. ${money(order.DeliveryCharge)}`,
        `Rs. ${money(order.OrderTotal)}`,
      ]),
      styles: {
        fontSize: 8,
      },
    });

    doc.save(
      `${selectedDeliveryMan?.Name || "DeliveryMan"}_Pending_Orders.pdf`,
    );
  };

  return (
    <div className="container-scroller">
      <UserSideBar />

      <div className="container-fluid page-body-wrapper">
        <UserNavbar />

        <main className={styles.page}>
          <section className={styles.heroSection}>
            <div className={styles.heroGlowOne} />
            <div className={styles.heroGlowTwo} />

            <div className={styles.heroContent}>
              <div className={styles.titleWrap}>
                <div className={styles.titleIcon} aria-hidden="true">
                  ₹
                </div>

                <div>
                  <span className={styles.eyebrow}>COLLECTION CONTROL</span>
                  <h1>Pending Delivery Amount</h1>
                  <p>
                    Track delivery-boy-wise pending orders and outstanding
                    collections from one clean dashboard.
                  </p>
                </div>
              </div>

              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <span className={loading ? styles.spin : ""}>↻</span>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  className={styles.excelButton}
                  onClick={exportSummaryExcel}
                  disabled={!summary.length}
                >
                  <span>↓</span>
                  Excel
                </button>

                <button
                  type="button"
                  className={styles.pdfButton}
                  onClick={exportSummaryPDF}
                  disabled={!summary.length}
                >
                  <span>↓</span>
                  PDF
                </button>
              </div>
            </div>
          </section>

          <section className={styles.statsGrid} aria-label="Pending summary">
            <article className={`${styles.statCard} ${styles.statPrimary}`}>
              <div className={styles.statTopRow}>
                <span className={styles.statIcon}>DB</span>
                <span className={styles.statTag}>Team</span>
              </div>
              <span className={styles.statLabel}>Total Delivery Boys</span>
              <strong>{summary.length}</strong>
              <small>
                {deliveryBoysWithPending} currently have pending orders
              </small>
            </article>

            <article className={`${styles.statCard} ${styles.statWarning}`}>
              <div className={styles.statTopRow}>
                <span className={styles.statIcon}>#</span>
                <span className={styles.statTag}>Orders</span>
              </div>
              <span className={styles.statLabel}>Total Pending Orders</span>
              <strong>{grandPendingOrders}</strong>
              <small>Awaiting completion / collection</small>
            </article>

            <article className={`${styles.statCard} ${styles.statDanger}`}>
              <div className={styles.statTopRow}>
                <span className={styles.statIcon}>₹</span>
                <span className={styles.statTag}>Outstanding</span>
              </div>
              <span className={styles.statLabel}>Total Pending Amount</span>
              <strong>₹{money(grandPendingAmount)}</strong>
              <small>Current outstanding collection</small>
            </article>

            <article className={`${styles.statCard} ${styles.statSuccess}`}>
              <div className={styles.statTopRow}>
                <span className={styles.statIcon}>AVG</span>
                <span className={styles.statTag}>Average</span>
              </div>
              <span className={styles.statLabel}>Average Pending / Boy</span>
              <strong>₹{money(averagePending)}</strong>
              <small>Calculated on boys with pending orders</small>
            </article>
          </section>

          <section className={styles.dataPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>LIVE SUMMARY</span>
                <h2>Delivery Collection Overview</h2>
                <p>
                  {filteredSummary.length} of {summary.length} delivery boys
                  shown
                </p>
              </div>

              <div className={styles.searchWrap}>
                <span className={styles.searchIcon} aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search delivery boy..."
                  aria-label="Search delivery boy"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className={styles.clearSearch}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className={styles.tableContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.loader} />
                  <h3>Loading pending collections</h3>
                  <p>Please wait while we fetch the latest summary.</p>
                </div>
              ) : filteredSummary.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>⌕</div>
                  <h3>
                    {searchTerm ? "No matching delivery boy" : "No data found"}
                  </h3>
                  <p>
                    {searchTerm
                      ? "Try a different name, area or mobile number."
                      : "Pending collection data will appear here when available."}
                  </p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Delivery Boy</th>
                      <th>Pending Orders</th>
                      <th>Pending Amount</th>
                      <th className={styles.actionHead}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSummary.map((deliveryMan, index) => {
                      const hasPending =
                        Number(deliveryMan.PendingOrders || 0) > 0;

                      return (
                        <tr key={deliveryMan.DeliveryManID}>
                          <td data-label="S.No">
                            <span className={styles.serialNumber}>
                              {index + 1}
                            </span>
                          </td>

                          <td data-label="Delivery Boy">
                            <div className={styles.deliveryProfile}>
                              <div className={styles.avatar}>
                                {getInitials(deliveryMan.DeliveryManName)}
                              </div>

                              <div className={styles.deliveryMeta}>
                                <strong>{deliveryMan.DeliveryManName}</strong>
                                <span>
                                  {deliveryMan.Area || "Delivery Executive"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td data-label="Pending Orders">
                            <span
                              className={
                                hasPending
                                  ? styles.pendingBadge
                                  : styles.zeroBadge
                              }
                            >
                              <i />
                              {deliveryMan.PendingOrders || 0}
                              {hasPending ? " Pending" : " Clear"}
                            </span>
                          </td>

                          <td
                            data-label="Pending Amount"
                            className={styles.amountCell}
                          >
                            <span className={styles.amountLabel}>
                              Outstanding
                            </span>
                            <strong>₹{money(deliveryMan.PendingAmount)}</strong>
                          </td>

                          <td data-label="Action" className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.viewButton}
                              onClick={() => handleView(deliveryMan)}
                              disabled={!hasPending}
                            >
                              <span>View Details</span>
                              <b aria-hidden="true">→</b>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {showModal && (
            <div className={styles.modalOverlay} onMouseDown={handleClose}>
              <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pending-orders-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div className={styles.modalPerson}>
                    <div className={styles.modalAvatar}>
                      {getInitials(selectedDeliveryMan?.Name)}
                    </div>

                    <div>
                      <span className={styles.modalEyebrow}>
                        PENDING COLLECTION
                      </span>
                      <h2 id="pending-orders-title">
                        {selectedDeliveryMan?.Name || "Pending Orders"}
                      </h2>

                      {selectedDeliveryMan && (
                        <p>
                          <span>
                            {selectedDeliveryMan.Area || "Area not available"}
                          </span>
                          {selectedDeliveryMan.MobileNo && (
                            <>
                              <i>•</i>
                              <span>{selectedDeliveryMan.MobileNo}</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={handleClose}
                    aria-label="Close pending orders"
                  >
                    ×
                  </button>
                </div>

                {orderLoading ? (
                  <div className={styles.modalLoading}>
                    <div className={styles.loader} />
                    <h3>Loading pending orders</h3>
                    <p>Fetching delivery details and outstanding amount.</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.modalSummary}>
                      <div className={styles.modalMetric}>
                        <span>Pending Orders</span>
                        <strong>
                          {pendingOrderSummary.pendingOrders || 0}
                        </strong>
                        <small>Orders assigned to this delivery boy</small>
                      </div>

                      <div className={styles.modalMetric}>
                        <span>Pending Amount</span>
                        <strong>
                          ₹{money(pendingOrderSummary.pendingAmount)}
                        </strong>
                        <small>Total outstanding collection</small>
                      </div>

                      <div className={styles.modalExports}>
                        <span>Download report</span>
                        <div>
                          <button
                            type="button"
                            className={styles.excelButton}
                            onClick={exportOrdersExcel}
                            disabled={!pendingOrders.length}
                          >
                            ↓ Excel
                          </button>

                          <button
                            type="button"
                            className={styles.pdfButton}
                            onClick={exportOrdersPDF}
                            disabled={!pendingOrders.length}
                          >
                            ↓ PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.modalTableHeader}>
                      <div>
                        <h3>Pending Order Details</h3>
                        <p>Complete order-wise collection breakup</p>
                      </div>
                      <span className={styles.orderCountBadge}>
                        {pendingOrders.length} order
                        {pendingOrders.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className={styles.modalTableWrapper}>
                      <table className={`${styles.table} ${styles.modalTable}`}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Area</th>
                            <th>Contact</th>
                            <th>Delivery Date</th>
                            <th>Items Total</th>
                            <th>Delivery</th>
                            <th>Total</th>
                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {pendingOrders.length === 0 ? (
                            <tr>
                              <td colSpan="10">
                                <div className={styles.modalEmpty}>
                                  <span>✓</span>
                                  <h3>No pending orders</h3>
                                  <p>
                                    No outstanding delivery order was found.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            pendingOrders.map((order, index) => (
                              <tr key={order.AssignID || order.OrderID}>
                                <td>
                                  <span className={styles.serialNumber}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td>
                                  <span className={styles.orderId}>
                                    #{order.OrderID}
                                  </span>
                                </td>
                                <td>
                                  <div className={styles.customerCell}>
                                    <strong>{order.CustomerName || "-"}</strong>
                                  </div>
                                </td>
                                <td>{order.Area || "-"}</td>
                                <td>{order.ContactNo || "-"}</td>
                                <td>{formatDate(order.DeliveryDate)}</td>
                                <td>₹{money(order.ItemsTotal)}</td>
                                <td>₹{money(order.DeliveryCharge)}</td>
                                <td className={styles.modalAmount}>
                                  ₹{money(order.OrderTotal)}
                                </td>
                                <td>
                                  <span className={styles.pendingBadge}>
                                    <i />
                                    {order.DeliveryStatus || "Pending"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DeliveryPending;
