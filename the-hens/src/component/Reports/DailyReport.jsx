import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDailyReport } from "../../features/reportSlice";
import { fetchDeliveryMen } from "../../features/assignedOrderSlice";
import { Calendar, User, Printer, FileText } from "lucide-react";
import styles from "./DailyReport.module.css";

const DailyReport = () => {
  const dispatch = useDispatch();

  // 1. Get daily report data from reportSlice
  const { daily, dailyLoading } = useSelector((state) => state.report);

  // 2. Get delivery men list from assignedOrders slice
  const { deliveryMen } = useSelector((state) => state.assignedOrders);
  console.log(deliveryMen, "delivery daily");

  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    deliveryBoyId: "all",
  });

  // Fetch delivery boys list on component mount
  useEffect(() => {
    dispatch(fetchDeliveryMen());
  }, [dispatch]);

  // Fetch daily report whenever filters change
  useEffect(() => {
    dispatch(fetchDailyReport(filters));
  }, [dispatch, filters.date, filters.deliveryBoyId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <FileText className={styles.iconPrimary} size={28} />
          <h2 className={styles.title}>Daily Collection Report</h2>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.inputGroup}>
            <Calendar size={18} />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <User size={18} />
            <select
              value={filters.deliveryBoyId}
              onChange={(e) =>
                setFilters({ ...filters, deliveryBoyId: e.target.value })
              }
            >
              <option value="all">Full Shop (All)</option>
              {/* 3. Mapping real delivery men from Redux */}
              {deliveryMen &&
                deliveryMen.map((boy) => (
                  <option key={boy.DeliveryManID} value={boy.DeliveryManID}>
                    {boy.Name || boy.Name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {dailyLoading ? (
        <div className={styles.loaderContainer}>
          <div className={styles.spinner}></div>
          <p>Generating Report...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.blue}`}>
              <span className={styles.cardLabel}>Total Gross Sales</span>
              <h3>
                ₹{Number(daily.summary?.totalSaleAmount || 0).toLocaleString()}
              </h3>
            </div>
            <div className={`${styles.statCard} ${styles.green}`}>
              <span className={styles.cardLabel}>Payment Collected</span>
              <h3>
                ₹{Number(daily.summary?.totalReceived || 0).toLocaleString()}
              </h3>
            </div>
            <div className={`${styles.statCard} ${styles.red}`}>
              <span className={styles.cardLabel}>Outstanding Balance</span>
              <h3>
                ₹{Number(daily.summary?.totalOutstanding || 0).toLocaleString()}
              </h3>
            </div>
            <div className={`${styles.statCard} ${styles.green}`}>
              <span className={styles.cardLabel}>Total Orders</span>
              <h3>
                {Number(daily.summary?.totalOrders || 0).toLocaleString()}
              </h3>
            </div>
          </div>

          <div className={styles.reportContent}>
            {/* Left: Product Table */}
            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h3>Item-wise Distribution</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Weight</th>
                    <th>Quantity</th>
                    <th>Unit Rate</th>
                    <th className={styles.textRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.products?.length > 0 ? (
                    daily.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className={styles.fontMedium}>
                          {item.ProductType}
                        </td>
                        <td>{item.Weight || "-"}</td>
                        <td>{item.Qty}</td>
                        <td>₹{item.Rate}</td>
                        <td className={`${styles.textRight} ${styles.bold}`}>
                          ₹{Number(item.Amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.noData}>
                        No orders found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right: Payment Table */}
            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h3>Collection Summary</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mode of Payment</th>
                    <th className={styles.textRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.payments?.length > 0 ? (
                    daily.payments.map((pay, idx) => (
                      <tr key={idx}>
                        <td>{pay.ModeName}</td>
                        <td
                          className={`${styles.textRight} ${styles.bold} ${styles.greenText}`}
                        >
                          ₹{Number(pay.ModeTotal).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className={styles.noData}>
                        No payments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
                {daily.payments?.length > 0 && (
                  <tfoot className={styles.tableFooter}>
                    <tr className={styles.totalRow}>
                      <td className={styles.bold}>GRAND TOTAL COLLECTION</td>
                      <td className={`${styles.textRight} ${styles.bold}`}>
                        ₹{daily.summary?.totalReceived?.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailyReport;
