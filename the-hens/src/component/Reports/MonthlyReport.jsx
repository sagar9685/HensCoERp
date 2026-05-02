import React, { useState } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { fetchMonthlyReport } from "../../features/reportSlice";
import { Bar, Doughnut } from "react-chartjs-2";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

import styles from "./MonthlyReport.module.css";
import Footer from "../Footer";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const MonthlyReport = () => {
  const dispatch = useDispatch();
  const { monthly, monthlyLoading, error } = useSelector(
    (state) => state.report,
  );

  console.log(monthly, "monthlyu report");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchData = () => {
    dispatch(fetchMonthlyReport({ year: selectedYear, month: selectedMonth }));
  };

  const formatINR = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  // --- Full Excel Export Logic ---
  const handleExportExcel = () => {
    if (!monthly?.summary) return;

    const monthName = new Date(0, selectedMonth - 1).toLocaleString("en", {
      month: "long",
    });

    const wb = XLSX.utils.book_new();
    const productData = monthly.productTypeSummary || [];

    const totalQty = productData.reduce(
      (sum, item) => sum + Number(item.TotalQty || 0),
      0,
    );

    const totalRevenue = productData.reduce(
      (sum, item) => sum + Number(item.TotalAmount || 0),
      0,
    );

    // =========================
    // PROFESSIONAL MASTER SHEET
    // =========================

    const masterSheet = [
      ["THE HENS CO - MONTHLY BUSINESS REPORT"],
      [`Month: ${monthName} ${selectedYear}`],
      [`Generated On: ${new Date().toLocaleDateString()}`],
      [],
      ["================ FINANCIAL SUMMARY ================"],
      ["Total Orders", monthly.summary.TotalOrders],
      ["Total Sales (₹)", monthly.summary.TotalSales],
      ["Total Received (₹)", monthly.summary.TotalReceived],
      ["Outstanding (₹)", monthly.summary.TotalOutstanding],
      ["Cancelled Orders Amount (₹)", monthly.summary.CancelOrderAmount],
      [],
      ["================ CHICKEN SUMMARY ================"],
      ["Total Weight (KG)", monthly.chickenSummary?.TotalKG || 0],
      ["Total Revenue (₹)", monthly.chickenSummary?.TotalAmount || 0],
      [],
      ["================ EGG SUMMARY ================"],
      ["Total Eggs (Pcs)", monthly.eggSummary?.TotalEggs || 0],
      ["Total Revenue (₹)", monthly.eggSummary?.TotalAmount || 0],
      [],
      ["================ PRODUCT PERFORMANCE ================"],
      [],
      ["Product Name", "Quantity", "Avg Rate (₹)", "Revenue (₹)"],

      ...productData.map((item) => [
        item.ProductType,
        item.TotalQty,
        item.AvgRate ? Number(item.AvgRate).toFixed(2) : "0.00",
        item.TotalAmount,
      ]),

      [],
      ["GRAND TOTAL", totalQty, "", totalRevenue],
    ];

    const wsMaster = XLSX.utils.aoa_to_sheet(masterSheet);

    wsMaster["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, wsMaster, "Monthly Report");

    // =========================
    // PAYMENT SHEET
    // =========================

    const paymentRows = [
      ["Payment Mode", "Amount (₹)"],
      ...(monthly.payment || []).map((p) => [p.ModeName, p.Amount]),
    ];

    const wsPayment = XLSX.utils.aoa_to_sheet(paymentRows);

    wsPayment["!cols"] = [{ wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, wsPayment, "Payment Breakdown");

    // =========================
    // DOWNLOAD
    // =========================

    XLSX.writeFile(
      wb,
      `TheHensCo_Professional_Monthly_Report_${monthName}_${selectedYear}.xlsx`,
    );
  };
  // Chart Configs
  const paymentChartData = {
    labels: monthly.payment?.map((p) => p.ModeName) || [],
    datasets: [
      {
        data: monthly.payment?.map((p) => p.Amount) || [],
        backgroundColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const salesVsOutstandingData = {
    labels: ["Sales", "Received", "Pending"],
    datasets: [
      {
        label: "Amount (₹)",
        data: [
          monthly.summary?.TotalSales || 0,
          monthly.summary?.TotalReceived || 0,
          monthly.summary?.TotalOutstanding || 0,
        ],
        backgroundColor: ["#3b82f6", "#10b981", "#ef4444"],
        borderRadius: 8,
      },
    ],
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>Monthly Business Insights</h1>
          <p className={styles.subtitle}>
            Track your sales, payments, and inventory performance
          </p>
        </div>

        <div className={styles.filtersCard}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Year</label>
              <select
                className={styles.select}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Month</label>
              <select
                className={styles.select}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={styles.fetchButton}
                onClick={fetchData}
                disabled={monthlyLoading}
              >
                {monthlyLoading ? (
                  <span className={styles.loadingSpinner}>🌀</span>
                ) : (
                  "Generate Report"
                )}
              </button>
              {monthly.summary && (
                <button
                  className={styles.excelButton}
                  onClick={handleExportExcel}
                >
                  📥 Download Excel
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠️</span> {error}
          </div>
        )}

        {monthly.summary && (
          <div className={styles.reportContent}>
            {/* Top Metrics Grid */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>📦</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>Total Orders</span>
                  <span className={styles.metricValue}>
                    {monthly.summary.TotalOrders}
                  </span>
                </div>
              </div>
              <div className={`${styles.metricCard} ${styles.blueBorder}`}>
                <div className={styles.metricIcon}>💰</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>Total Sales</span>
                  <span className={styles.metricValue}>
                    {formatINR(monthly.summary.TotalSales)}
                  </span>
                </div>
              </div>
              <div className={`${styles.metricCard} ${styles.greenBorder}`}>
                <div className={styles.metricIcon}>✅</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>Received</span>
                  <span className={styles.metricValue}>
                    {formatINR(monthly.summary.TotalReceived)}
                  </span>
                </div>
              </div>
              <div
                className={`${styles.metricCard} ${styles.outstandingMetric}`}
              >
                <div className={styles.metricIcon}>⏳</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>Outstanding</span>
                  <span className={styles.metricValue}>
                    {formatINR(monthly.summary.TotalOutstanding)}
                  </span>
                </div>
              </div>

              <div className={`${styles.metricCard} ${styles.redBorder}`}>
                <div className={styles.metricIcon}>❌</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>Cancelled Amount</span>
                  <span className={styles.metricValue}>
                    {formatINR(monthly.summary.CancelOrderAmount)}
                  </span>
                </div>
              </div>
              <div className={`${styles.metricCard} ${styles.orangeBorder}`}>
                <div className={styles.metricIcon}>↩️</div>
                <div className={styles.metricContent}>
                  <span className={styles.metricLabel}>RTV Amount</span>
                  <span className={styles.metricValue}>
                    {formatINR(monthly.summary.RTVAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3>Revenue Collection</h3>
                </div>
                <div className={styles.chartWrapper}>
                  <Doughnut
                    data={paymentChartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
              </div>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h3>Sales Performance</h3>
                </div>
                <div className={styles.chartWrapper}>
                  <Bar
                    data={salesVsOutstandingData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Product Category Grid (Exact data for Excel) */}
            <div className={styles.productSection}>
              <h3 className={styles.sectionTitle}>Product Performance Table</h3>
              <div className={styles.productGrid}>
                {monthly.productTypeSummary.map((item, idx) => (
                  <div key={idx} className={styles.productCard}>
                    <h4 className={styles.productName}>{item.ProductType}</h4>
                    <div className={styles.productStats}>
                      <div className={styles.productStat}>
                        <span className={styles.statLabel}>Quantity</span>
                        <span className={styles.statNumber}>
                          {item.TotalQty}
                        </span>
                      </div>
                      <div className={styles.productStat}>
                        <span className={styles.statLabel}>Avg Rate</span>
                        <span className={styles.statNumber}>
                          ₹
                          {item.AvgRate
                            ? Number(item.AvgRate).toFixed(2)
                            : "0.00"}
                        </span>
                      </div>
                      <div className={styles.productStat}>
                        <span className={styles.statLabel}>Revenue</span>
                        <span className={styles.statNumber}>
                          {formatINR(item.TotalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialty Categories */}
            <div className={styles.specialSection}>
              <div className={styles.specialGrid}>
                <div className={`${styles.specialCard} ${styles.chickenBg}`}>
                  <div className={styles.specialIcon}>🍗</div>
                  <h4>Chicken Summary</h4>
                  <div className={styles.specialStats}>
                    <div className={styles.specialStat}>
                      <span>Total Weight</span>
                      <strong>
                        {monthly.chickenSummary?.TotalKG?.toFixed(2) || "0.00"}{" "}
                        KG
                      </strong>
                    </div>
                    <div className={styles.specialStat}>
                      <span>Revenue</span>
                      <strong>
                        {formatINR(monthly.chickenSummary?.TotalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={`${styles.specialCard} ${styles.eggBg}`}>
                  <div className={styles.specialIcon}>🥚</div>
                  <h4>Egg Summary</h4>
                  <div className={styles.specialStats}>
                    <div className={styles.specialStat}>
                      <span>Total Count</span>
                      <strong>{monthly.eggSummary?.TotalEggs || 0} Pcs</strong>
                    </div>
                    <div className={styles.specialStat}>
                      <span>Revenue</span>
                      <strong>
                        {formatINR(monthly.eggSummary?.TotalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={`${styles.specialCard} ${styles.deliveryBg}`}>
                  <div className={styles.specialIcon}>🚚</div>
                  <h4>Delivery Summary</h4>
                  <div className={styles.specialStats}>
                    <div className={styles.specialStat}>
                      <span>Delivery Charge</span>
                      <strong>
                        {formatINR(
                          monthly?.deliverySummary?.TotalDeliveryCharge ?? 0,
                        )}
                      </strong>
                    </div>
                    <div className={styles.specialStat}>
                      <span>Avg per Order</span>
                      <strong>
                        {monthly?.summary?.TotalOrders > 0
                          ? formatINR(
                              (monthly?.deliverySummary?.TotalDeliveryCharge ??
                                0) / monthly?.summary?.TotalOrders,
                            )
                          : "₹0"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default MonthlyReport;
