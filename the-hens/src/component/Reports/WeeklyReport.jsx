import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWeeklyReport } from "../../features/reportSlice";
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

import styles from "./WeeklyReport.module.css";

// Register Chart.js (only once)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const WeeklyReport = () => {
  const dispatch = useDispatch();
  const { weekly, weeklyLoading, error } = useSelector((state) => state.report);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const getMaxWeeks = (year, month) => {
    const lastDay = new Date(year, month, 0).getDate();
    return Math.ceil(lastDay / 7);
  };

  const maxWeeks = getMaxWeeks(selectedYear, selectedMonth);

  useEffect(() => {
    setSelectedWeek(1);
  }, [selectedYear, selectedMonth]);

  const fetchData = () => {
    dispatch(
      fetchWeeklyReport({
        year: selectedYear,
        month: selectedMonth,
        week: selectedWeek,
      })
    );
  };

  // Prepare chart data: Top Items Sold by Quantity
  const itemsSoldData = {
    labels:
      weekly?.data
        ?.reduce((acc, row) => {
          const name = row.ProductName || row.ProductType || "Unknown";
          const qty = Number(row.QuantitySold) || 0;
          const existing = acc.find((item) => item.name === name);
          if (existing) {
            existing.qty += qty;
          } else {
            acc.push({ name, qty });
          }
          return acc;
        }, [])
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10)
        .map((item) => item.name) || [],

    datasets: [
      {
        label: "Quantity Sold",
        data:
          weekly?.data
            ?.reduce((acc, row) => {
              const name = row.ProductName || row.ProductType || "Unknown";
              const qty = Number(row.QuantitySold) || 0;
              const existing = acc.find((item) => item.name === name);
              if (existing) {
                existing.qty += qty;
              } else {
                acc.push({ name, qty });
              }
              return acc;
            }, [])
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10)
            .map((item) => item.qty) || [],
        backgroundColor: "#3b82f6",
        borderColor: "#1d4ed8",
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: "#2563eb",
      },
    ],
  };

  const itemsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Top 10 Items Sold by Quantity (Week)",
        font: { size: 18, weight: "bold" },
        color: "#111827",
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => `${context.parsed.y} units`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: "#e5e7eb" },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.header}>Weekly Report</h3>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
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

        <div className={styles.filterGroup}>
          <label>Week:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
          >
            {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => {
              const start = (w - 1) * 7 + 1;
              const end = Math.min(
                w * 7,
                new Date(selectedYear, selectedMonth, 0).getDate()
              );
              return (
                <option key={w} value={w}>
                  Week {w} ({start} – {end})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <button
        className={styles.button}
        onClick={fetchData}
        disabled={weeklyLoading}
      >
        {weeklyLoading ? "Loading..." : "Get Weekly Report"}
      </button>

      {error && <div className={styles.error}>Error: {error}</div>}

      {weeklyLoading ? (
        <p className={styles.noData}>Loading report...</p>
      ) : weekly?.data?.length > 0 ? (
        <>
          <h4 className={styles.reportTitle}>
            Week {selectedWeek} Report ({selectedMonth}/{selectedYear})
          </h4>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                  <th>Product</th>
                  <th className={styles.rightAlign}>Qty Sold</th>
                  <th className={styles.rightAlign}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {weekly.data.map((row, index) => (
                  <tr key={index}>
                    <td>
                      {new Date(row.OrderDate)
                        .toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                        .replace(/ /g, "-")}
                    </td>
                    <td>{row.Orders}</td>
                    <td>
                      ₹
                      {Number(row.TotalSales || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>{row.ProductName || row.ProductType || "—"}</td>
                    <td className={styles.rightAlign}>
                      {row.QuantitySold || 0}
                    </td>
                    <td className={styles.rightAlign}>
                      ₹
                      {Number(
                        row.ProductTotalAmount || row.ProductSales || 0
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Professional Chart: Items Sold by Quantity */}
          <div className={styles.chartSection}>
            <div className={styles.chartContainer}>
              <Bar data={itemsSoldData} options={itemsChartOptions} />
            </div>
          </div>
        </>
      ) : (
        <p className={styles.noData}>
          No data available for Week {selectedWeek} of {selectedMonth}/
          {selectedYear}
        </p>
      )}
    </div>
  );
};

export default WeeklyReport;
