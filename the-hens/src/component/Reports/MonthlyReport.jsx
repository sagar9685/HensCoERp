import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyReport } from "../../features/reportSlice";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import styles from "./MonthlyReport.module.css";

// Register Chart.js components (only once)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MonthlyReport = () => {
  const dispatch = useDispatch();
  const { monthly, monthlyLoading, error } = useSelector(
    (state) => state.report
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const fetchData = () => {
    dispatch(fetchMonthlyReport({ year: selectedYear, month: selectedMonth }));
  };

  // Calculate total received from payment breakdown (fallback if backend doesn't send TotalReceived)
  const totalReceived =
    monthly?.payment?.reduce((sum, p) => sum + (Number(p.Amount) || 0), 0) || 0;

  // Chart 1: Payment Methods Breakdown
  const paymentChartData = {
    labels: monthly?.payment?.map((p) => p.ModeName) || [],
    datasets: [
      {
        label: "Amount (₹)",
        data: monthly?.payment?.map((p) => Number(p.Amount) || 0) || [],
        backgroundColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#6366f1",
        ],
        borderColor: "#ffffff",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const paymentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Payment Methods Breakdown",
        font: { size: 18, weight: "bold" },
        color: "#111827",
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => ` ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: "#e5e7eb" },
        ticks: {
          callback: (value) => "₹" + value.toLocaleString("en-IN"),
          font: { size: 12 },
        },
      },
    },
  };

  // Chart 2: Sales vs Received vs Outstanding (Outstanding in RED)
  const salesVsOutstandingData = {
    labels: ["Total Sales", "Received", "Outstanding"],
    datasets: [
      {
        label: "Amount (₹)",
        data: [
          Number(monthly?.summary?.TotalSales || 0),
          totalReceived,
          Number(monthly?.summary?.TotalOutstanding || 0),
        ],
        backgroundColor: ["#3b82f6", "#10b981", "#dc2626"],
        borderColor: ["#1d4ed8", "#059669", "#b91c1c"],
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: ["#2563eb", "#059669", "#ef4444"],
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Sales vs Received vs Outstanding",
        font: { size: 18, weight: "bold" },
        color: "#111827",
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => ` ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: "#e5e7eb" },
        ticks: {
          callback: (value) => "₹" + value.toLocaleString("en-IN"),
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.header}>Monthly Report</h3>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className={styles.button}
        onClick={fetchData}
        disabled={monthlyLoading}
      >
        {monthlyLoading ? "Loading..." : "Get Monthly Report"}
      </button>

      {error && <div className={styles.error}>Error: {error}</div>}

      {/* Summary & Charts */}
      <div className={styles.summaryCard}>
        <h4 className={styles.summaryTitle}>
          {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}{" "}
          Overview
        </h4>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Total Orders</div>
            <div className={styles.statValue}>
              {monthly?.summary?.TotalOrders || 0}
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statLabel}>Total Sales</div>
            <div className={styles.statValue}>
              ₹
              {Number(monthly?.summary?.TotalSales || 0).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </div>
          </div>

          <div className={`${styles.statItem} ${styles.outstandingCard}`}>
            <div className={styles.statLabel}>Total Outstanding</div>
            <div className={`${styles.statValue} ${styles.outstanding}`}>
              ₹
              {Number(monthly?.summary?.TotalOutstanding || 0).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {monthly?.summary?.TotalSales > 0 && (
          <div className={styles.chartsSection}>
            {/* Payment Methods Chart */}
            {monthly?.payment?.length > 0 && (
              <div className={styles.chartContainer}>
                <div className={styles.chartWrapper}>
                  <Bar data={paymentChartData} options={paymentChartOptions} />
                </div>
              </div>
            )}

            {/* Sales vs Outstanding Chart */}
            <div className={styles.chartContainer}>
              <div className={styles.chartWrapper}>
                <Bar
                  data={salesVsOutstandingData}
                  options={salesChartOptions}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
