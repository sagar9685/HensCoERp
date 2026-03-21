import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWeeklyCompare } from "../../features/reportSlice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import styles from "./WeeklyCompare.module.css";
import Footer from "../Footer";

const WeeklyCompare = () => {
  const dispatch = useDispatch();

  const { weeklyCompare, weeklyCompareLoading } = useSelector(
    (state) => state.report,
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [viewMode, setViewMode] = useState("grid");

  // Max weeks
  const getMaxWeeks = (year, month) => {
    const lastDay = new Date(year, month, 0).getDate();
    return Math.ceil(lastDay / 7);
  };

  const maxWeeks = getMaxWeeks(selectedYear, selectedMonth);

  useEffect(() => {
    setSelectedWeek(1);
  }, [selectedYear, selectedMonth]);

  // Convert week → startDate & endDate
  const getWeekDates = () => {
    const start = (selectedWeek - 1) * 7 + 1;
    const end = Math.min(
      selectedWeek * 7,
      new Date(selectedYear, selectedMonth, 0).getDate(),
    );

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0",
    )}-${String(start).padStart(2, "0")}`;

    const endDate = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0",
    )}-${String(end).padStart(2, "0")}`;

    return { startDate, endDate };
  };

  const fetchData = () => {
    const { startDate, endDate } = getWeekDates();
    dispatch(fetchWeeklyCompare({ startDate, endDate }));
  };

  // Format currency
  const formatCurrency = (val) =>
    `₹${new Intl.NumberFormat("en-IN").format(val || 0)}`;

  const formatCompact = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  // Check if data exists
  const hasData =
    weeklyCompare &&
    (weeklyCompare.eggComparison?.length ||
      weeklyCompare.chickenComparison?.length);

  const {
    weekRange = {},
    eggComparison = [],
    chickenComparison = [],
    salesComparison = {},
  } = weeklyCompare || {};

  // Prepare data for charts
  const eggChartData = eggComparison.map((item) => ({
    name: item.ProductType,
    currentQty: item.CurrentQty,
    previousQty: item.PreviousQty,
    currentAmount: item.CurrentAmount,
    previousAmount: item.PreviousAmount,
    growth: (
      ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
      100
    ).toFixed(1),
  }));

  const chickenChartData = chickenComparison.map((item) => ({
    name: item.ProductType,
    currentQty: item.CurrentQty,
    previousQty: item.PreviousQty,
    currentAmount: item.CurrentAmount,
    previousAmount: item.PreviousAmount,
    growth: (
      ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
      100
    ).toFixed(1),
  }));

  // Prepare revenue data for all products
  const allProductsRevenue = [
    ...eggComparison.map((item) => ({
      ProductType: item.ProductType,
      CurrentRevenue: item.CurrentAmount,
      PreviousRevenue: item.PreviousAmount,
      category: "Egg",
    })),
    ...chickenComparison.map((item) => ({
      ProductType: item.ProductType,
      CurrentRevenue: item.CurrentAmount,
      PreviousRevenue: item.PreviousAmount,
      category: "Chicken",
    })),
  ].sort((a, b) => b.CurrentRevenue - a.CurrentRevenue);

  // Colors
  const COLORS = [
    "#4318FF",
    "#6AD2FF",
    "#2B3674",
    "#FFB547",
    "#EE5D50",
    "#05CD99",
    "#FF5722",
    "#A3AED0",
    "#FF6B6B",
    "#4ECDC4",
  ];

  // Download Excel
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      ["WEEKLY PERFORMANCE SUMMARY"],
      ["Metric", "Current Week", "Previous Week", "Growth"],
      [
        "Total Sales",
        salesComparison?.CurrentWeekSales || 0,
        salesComparison?.PreviousWeekSales || 0,
        `${salesComparison?.GrowthPercent || 0}%`,
      ],
      ["", "", "", ""],
      ["Week Range"],
      [
        "Current Week",
        weekRange?.currentWeek?.from || "",
        "to",
        weekRange?.currentWeek?.to || "",
      ],
      [
        "Previous Week",
        weekRange?.previousWeek?.from || "",
        "to",
        weekRange?.previousWeek?.to || "",
      ],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // 2. Egg Products Sheet
    const eggDetails = eggComparison.map((item) => ({
      "Product Type": item.ProductType,
      "Current Qty": item.CurrentQty,
      "Previous Qty": item.PreviousQty,
      "Qty Change": item.CurrentQty - item.PreviousQty,
      "Qty Growth %": (
        ((item.CurrentQty - item.PreviousQty) / item.PreviousQty) *
        100
      ).toFixed(2),
      "Current Revenue": item.CurrentAmount,
      "Previous Revenue": item.PreviousAmount,
      "Revenue Change": item.CurrentAmount - item.PreviousAmount,
      "Revenue Growth %": (
        ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
        100
      ).toFixed(2),
    }));
    const eggSheet = XLSX.utils.json_to_sheet(eggDetails);
    XLSX.utils.book_append_sheet(workbook, eggSheet, "Egg Products");

    // 3. Chicken Products Sheet
    const chickenDetails = chickenComparison.map((item) => ({
      "Product Type": item.ProductType,
      "Current Qty": item.CurrentQty,
      "Previous Qty": item.PreviousQty,
      "Qty Change": item.CurrentQty - item.PreviousQty,
      "Qty Growth %": (
        ((item.CurrentQty - item.PreviousQty) / item.PreviousQty) *
        100
      ).toFixed(2),
      "Current Revenue": item.CurrentAmount,
      "Previous Revenue": item.PreviousAmount,
      "Revenue Change": item.CurrentAmount - item.PreviousAmount,
      "Revenue Growth %": (
        ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
        100
      ).toFixed(2),
    }));
    const chickenSheet = XLSX.utils.json_to_sheet(chickenDetails);
    XLSX.utils.book_append_sheet(workbook, chickenSheet, "Chicken Products");

    // Auto-size columns
    const autoSizeColumns = (sheet) => {
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      if (!sheet["!cols"]) sheet["!cols"] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10;
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = cell.v.toString();
            maxWidth = Math.max(maxWidth, cellValue.length);
          }
        }
        sheet["!cols"][col] = { wch: Math.min(maxWidth + 2, 50) };
      }
    };

    autoSizeColumns(summarySheet);
    autoSizeColumns(eggSheet);
    autoSizeColumns(chickenSheet);

    // Download
    XLSX.writeFile(
      workbook,
      `Weekly_Report_${selectedYear}_${selectedMonth}_Week${selectedWeek}.xlsx`,
    );
  };

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>📊 Weekly Performance Dashboard</h2>
            <p className={styles.subtitle}>
              Week {selectedWeek} •{" "}
              {new Date(selectedYear, selectedMonth - 1).toLocaleString(
                "default",
                { month: "long" },
              )}{" "}
              {selectedYear}
            </p>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={viewMode === "grid" ? styles.active : ""}
              onClick={() => setViewMode("grid")}
            >
              📋 Table View
            </button>
            <button
              className={viewMode === "chart" ? styles.active : ""}
              onClick={() => setViewMode("chart")}
            >
              📊 Chart View
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersCard}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={styles.select}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className={styles.select}
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
              <label>Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className={styles.select}
              >
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => {
                  const start = (w - 1) * 7 + 1;
                  const end = Math.min(
                    w * 7,
                    new Date(selectedYear, selectedMonth, 0).getDate(),
                  );
                  return (
                    <option key={w} value={w}>
                      Week {w} ({start} – {end})
                    </option>
                  );
                })}
              </select>
            </div>

            <button className={styles.fetchBtn} onClick={fetchData}>
              {weeklyCompareLoading ? "Loading..." : "Get Report"}
            </button>

            {hasData && (
              <button className={styles.downloadBtn} onClick={downloadExcel}>
                📥 Download Excel
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {weeklyCompareLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Loading weekly report...</p>
          </div>
        )}

        {/* No Data */}
        {!weeklyCompareLoading && !hasData && (
          <div className={styles.noDataCard}>
            <div className={styles.noDataIcon}>📭</div>
            <h3>No Data Available</h3>
            <p>
              No data found for Week {selectedWeek} of{" "}
              {new Date(selectedYear, selectedMonth - 1).toLocaleString(
                "default",
                { month: "long" },
              )}{" "}
              {selectedYear}
            </p>
            <button onClick={fetchData} className={styles.retryBtn}>
              Try Again
            </button>
          </div>
        )}

        {/* Data Display */}
        {!weeklyCompareLoading && hasData && (
          <>
            {/* Week Range Cards */}
            <div className={styles.weekRangeContainer}>
              <div className={styles.weekCard}>
                <div className={styles.weekBadge}>Current Week</div>
                <div className={styles.weekDates}>
                  {weekRange?.currentWeek?.from} → {weekRange?.currentWeek?.to}
                </div>
              </div>
              <div className={styles.weekCard}>
                <div className={styles.weekBadge}>Previous Week</div>
                <div className={styles.weekDates}>
                  {weekRange?.previousWeek?.from} →{" "}
                  {weekRange?.previousWeek?.to}
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className={styles.kpiContainer}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiIcon}>💰</div>
                <div className={styles.kpiContent}>
                  <span className={styles.kpiLabel}>Current Week Sales</span>
                  <h3 className={styles.kpiValue}>
                    {formatCurrency(salesComparison?.CurrentWeekSales || 0)}
                  </h3>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiIcon}>📊</div>
                <div className={styles.kpiContent}>
                  <span className={styles.kpiLabel}>Previous Week Sales</span>
                  <h3 className={styles.kpiValue}>
                    {formatCurrency(salesComparison?.PreviousWeekSales || 0)}
                  </h3>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiIcon}>📈</div>
                <div className={styles.kpiContent}>
                  <span className={styles.kpiLabel}>Week-over-Week Growth</span>
                  <h3
                    className={
                      salesComparison?.GrowthPercent >= 0
                        ? styles.positive
                        : styles.negative
                    }
                  >
                    {salesComparison?.GrowthPercent >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(salesComparison?.GrowthPercent || 0)}%
                  </h3>
                </div>
              </div>
            </div>

            {viewMode === "grid" ? (
              /* Table View */
              <>
                {/* Egg Products Table */}
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3>🥚 Egg Products Comparison</h3>
                    <span className={styles.productCount}>
                      {eggComparison.length} products
                    </span>
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Product Type</th>
                          <th>Current Qty</th>
                          <th>Previous Qty</th>
                          <th>Qty Change</th>
                          <th>Current Amount</th>
                          <th>Previous Amount</th>
                          <th>Revenue Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eggComparison.map((row, i) => {
                          const qtyChange = row.CurrentQty - row.PreviousQty;
                          const revenueChange =
                            row.CurrentAmount - row.PreviousAmount;
                          return (
                            <tr key={i}>
                              <td className={styles.productName}>
                                {row.ProductType}
                              </td>
                              <td>{row.CurrentQty.toLocaleString()}</td>
                              <td>{row.PreviousQty.toLocaleString()}</td>
                              <td
                                className={
                                  qtyChange >= 0
                                    ? styles.positiveText
                                    : styles.negativeText
                                }
                              >
                                {qtyChange >= 0 ? "+" : ""}
                                {qtyChange}
                              </td>
                              <td className={styles.revenue}>
                                {formatCurrency(row.CurrentAmount)}
                              </td>
                              <td>{formatCurrency(row.PreviousAmount)}</td>
                              <td
                                className={
                                  revenueChange >= 0
                                    ? styles.positiveText
                                    : styles.negativeText
                                }
                              >
                                {revenueChange >= 0 ? "+" : ""}
                                {formatCurrency(revenueChange)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Chicken Products Table */}
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3>🍗 Chicken Products Comparison</h3>
                    <span className={styles.productCount}>
                      {chickenComparison.length} products
                    </span>
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Product Type</th>
                          <th>Current Qty (Kg)</th>
                          <th>Previous Qty (Kg)</th>
                          <th>Qty Change</th>
                          <th>Current Amount</th>
                          <th>Previous Amount</th>
                          <th>Revenue Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chickenComparison.map((row, i) => {
                          const qtyChange = row.CurrentQty - row.PreviousQty;
                          const revenueChange =
                            row.CurrentAmount - row.PreviousAmount;
                          return (
                            <tr key={i}>
                              <td className={styles.productName}>
                                {row.ProductType}
                              </td>
                              <td>{row.CurrentQty}</td>
                              <td>{row.PreviousQty}</td>
                              <td
                                className={
                                  qtyChange >= 0
                                    ? styles.positiveText
                                    : styles.negativeText
                                }
                              >
                                {qtyChange >= 0 ? "+" : ""}
                                {qtyChange}
                              </td>
                              <td className={styles.revenue}>
                                {formatCurrency(row.CurrentAmount)}
                              </td>
                              <td>{formatCurrency(row.PreviousAmount)}</td>
                              <td
                                className={
                                  revenueChange >= 0
                                    ? styles.positiveText
                                    : styles.negativeText
                                }
                              >
                                {revenueChange >= 0 ? "+" : ""}
                                {formatCurrency(revenueChange)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* Chart View */
              <div className={styles.chartsContainer}>
                {/* Revenue Overview Chart */}
                <div className={styles.chartCard}>
                  <h3>💰 Revenue Overview - All Products</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={allProductsRevenue.slice(0, 12)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                      <XAxis
                        dataKey="ProductType"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tickFormatter={(value) => formatCompact(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar
                        dataKey="CurrentRevenue"
                        name="Current Week"
                        fill="#4318FF"
                        radius={[6, 6, 0, 0]}
                      >
                        <LabelList
                          dataKey="CurrentRevenue"
                          position="top"
                          formatter={formatCompact}
                        />
                      </Bar>
                      <Bar
                        dataKey="PreviousRevenue"
                        name="Previous Week"
                        fill="#6AD2FF"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Egg Products Chart */}
                <div className={styles.chartCard}>
                  <h3>🥚 Egg Products - Quantity Comparison</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={eggChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E0E5F2"
                      />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="currentQty"
                        name="Current Week"
                        fill="#4318FF"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="previousQty"
                        name="Previous Week"
                        fill="#6AD2FF"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chicken Products Chart */}
                <div className={styles.chartCard}>
                  <h3>🍗 Chicken Products - Quantity Comparison</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={chickenChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E0E5F2"
                      />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="currentQty"
                        name="Current Week (Kg)"
                        fill="#05CD99"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="previousQty"
                        name="Previous Week (Kg)"
                        fill="#A3AED0"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Growth Analysis Chart */}
                <div className={styles.chartCard}>
                  <h3>📈 Growth Analysis - Top Performers</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={[...allProductsRevenue]
                        .sort((a, b) => b.growth - a.growth)
                        .slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 100 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="ProductType"
                        width={100}
                      />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar
                        dataKey={(data) =>
                          ((data.CurrentRevenue - data.PreviousRevenue) /
                            data.PreviousRevenue) *
                          100
                        }
                        fill="#FFB547"
                        radius={[0, 6, 6, 0]}
                      >
                        <LabelList
                          dataKey={(data) =>
                            (
                              ((data.CurrentRevenue - data.PreviousRevenue) /
                                data.PreviousRevenue) *
                              100
                            ).toFixed(1)
                          }
                          position="right"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue Distribution Pie Chart */}
                {/* Revenue Distribution - Clean Horizontal Bar Chart */}
                <div className={styles.chartCard}>
                  <h3>💰 Revenue Distribution - All Products</h3>
                  <div className={styles.revenueDistributionContainer}>
                    <ResponsiveContainer
                      width="100%"
                      height={Math.max(450, allProductsRevenue.length * 35)}
                    >
                      <BarChart
                        data={allProductsRevenue}
                        layout="vertical"
                        margin={{ top: 20, right: 50, left: 120, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatCompact(value)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="ProductType"
                          width={110}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#2b3674" }}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          cursor={{ fill: "#f4f7fe" }}
                        />
                        <Bar
                          dataKey="CurrentRevenue"
                          fill="#4318FF"
                          radius={[0, 8, 8, 0]}
                          barSize={25}
                        >
                          <LabelList
                            dataKey="CurrentRevenue"
                            position="right"
                            formatter={formatCompact}
                            style={{
                              fontSize: "11px",
                              fill: "#4318FF",
                              fontWeight: 500,
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={styles.noteText}>
                    * Sorted by revenue (highest to lowest)
                  </p>
                </div>

                {/* Revenue Breakdown Table with Visual Bars */}
                <div className={styles.chartCard}>
                  <h3>📊 Revenue Breakdown by Product</h3>
                  <div className={styles.revenueTableWrapper}>
                    <table className={styles.revenueTable}>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Product Type</th>
                          <th>Category</th>
                          <th>Revenue</th>
                          <th>Share %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProductsRevenue.map((item, idx) => {
                          const sharePercent = (
                            (item.CurrentRevenue /
                              salesComparison?.CurrentWeekSales) *
                            100
                          ).toFixed(1);
                          const isEgg = item.category === "Egg";
                          return (
                            <tr
                              key={idx}
                              className={idx < 3 ? styles.topRankRow : ""}
                            >
                              <td className={styles.rankCell}>
                                {idx === 0 && "🏆"}
                                {idx === 1 && "🥈"}
                                {idx === 2 && "🥉"}
                                {idx > 2 && `${idx + 1}`}
                              </td>
                              <td className={styles.productCell}>
                                <span
                                  className={
                                    isEgg
                                      ? styles.eggBadge
                                      : styles.chickenBadge
                                  }
                                >
                                  {isEgg ? "🥚" : "🍗"}
                                </span>
                                {item.ProductType}
                              </td>
                              <td className={styles.categoryCell}>
                                <span
                                  className={
                                    isEgg ? styles.eggTag : styles.chickenTag
                                  }
                                >
                                  {item.category}
                                </span>
                              </td>
                              <td className={styles.revenueCell}>
                                {formatCurrency(item.CurrentRevenue)}
                              </td>
                              <td className={styles.shareCell}>
                                <div className={styles.shareBarContainer}>
                                  <div className={styles.shareBarBg}>
                                    <div
                                      className={styles.shareBarFill}
                                      style={{
                                        width: `${sharePercent}%`,
                                        backgroundColor: isEgg
                                          ? "#4318FF"
                                          : "#05CD99",
                                      }}
                                    />
                                  </div>
                                  <span className={styles.sharePercentText}>
                                    {sharePercent}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Insights Footer */}
            <div className={styles.insightsCard}>
              <h3>💡 Key Insights</h3>
              <div className={styles.insightsGrid}>
                <div className={styles.insight}>
                  <strong>🏆 Top Performer</strong>
                  <p>{allProductsRevenue[0]?.ProductType}</p>
                  <span>
                    {formatCurrency(allProductsRevenue[0]?.CurrentRevenue)}
                  </span>
                </div>
                <div className={styles.insight}>
                  <strong>📈 Fastest Growing</strong>
                  <p>
                    {
                      [...allProductsRevenue].sort(
                        (a, b) =>
                          (b.CurrentRevenue - b.PreviousRevenue) /
                            b.PreviousRevenue -
                          (a.CurrentRevenue - a.PreviousRevenue) /
                            a.PreviousRevenue,
                      )[0]?.ProductType
                    }
                  </p>
                  <span className={styles.positive}>
                    {(
                      (([...allProductsRevenue].sort(
                        (a, b) =>
                          (b.CurrentRevenue - b.PreviousRevenue) /
                            b.PreviousRevenue -
                          (a.CurrentRevenue - a.PreviousRevenue) /
                            a.PreviousRevenue,
                      )[0]?.CurrentRevenue -
                        [...allProductsRevenue].sort(
                          (a, b) =>
                            (b.CurrentRevenue - b.PreviousRevenue) /
                              b.PreviousRevenue -
                            (a.CurrentRevenue - a.PreviousRevenue) /
                              a.PreviousRevenue,
                        )[0]?.PreviousRevenue) /
                        [...allProductsRevenue].sort(
                          (a, b) =>
                            (b.CurrentRevenue - b.PreviousRevenue) /
                              b.PreviousRevenue -
                            (a.CurrentRevenue - a.PreviousRevenue) /
                              a.PreviousRevenue,
                        )[0]?.PreviousRevenue) *
                      100
                    ).toFixed(1)}
                    % Growth
                  </span>
                </div>
                <div className={styles.insight}>
                  <strong>📦 Total Products</strong>
                  <p>
                    {eggComparison.length + chickenComparison.length} Products
                  </p>
                  <span>
                    {eggComparison.length} Eggs • {chickenComparison.length}{" "}
                    Chicken
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default WeeklyCompare;
