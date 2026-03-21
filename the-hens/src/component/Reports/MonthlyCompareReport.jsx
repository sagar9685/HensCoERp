import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyCompare } from "../../features/reportSlice";
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
  LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import styles from "./MonthlyCompare.module.css";

const MonthlyCompareReport = () => {
  const dispatch = useDispatch();
  const { monthlyCompare, compareLoading } = useSelector(
    (state) => state.report,
  );
  const [filters, setFilters] = useState({ year: 2026, month: 3 });
  const [viewMode, setViewMode] = useState("grid");
  const chartRefs = useRef({});

  useEffect(() => {
    dispatch(fetchMonthlyCompare(filters));
  }, [dispatch, filters]);

  if (compareLoading)
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loader}></div>
        <p>Syncing Analytics...</p>
      </div>
    );

  if (!monthlyCompare) return null;

  // Formatters
  const formatCurrency = (val) =>
    `₹${new Intl.NumberFormat("en-IN").format(val || 0)}`;
  const formatCompact = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  // Prepare Data for Charts
  const allRevenueData = [...monthlyCompare.productRevenue].sort(
    (a, b) => b.CurrentRevenue - a.CurrentRevenue,
  );

  // Top 10 Products by Revenue
  const topProducts = allRevenueData.slice(0, 10);

  // Egg Data with Growth
  const eggData = monthlyCompare.eggComparison.map((item) => ({
    ...item,
    Growth: (
      ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
      100
    ).toFixed(1),
    QtyGrowth: (
      ((item.CurrentQty - item.PreviousQty) / item.PreviousQty) *
      100
    ).toFixed(1),
  }));

  // Chicken Data with Growth
  const chickenData = monthlyCompare.chickenComparison.map((item) => ({
    ...item,
    Growth: (
      ((item.CurrentAmount - item.PreviousAmount) / item.PreviousAmount) *
      100
    ).toFixed(1),
    QtyGrowth: (
      ((item.CurrentQty - item.PreviousQty) / item.PreviousQty) *
      100
    ).toFixed(1),
  }));

  // Bulk vs Retail Data
  const bulkRetailData = monthlyCompare.bulkRetail;

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
    "#9B59B6",
    "#3498DB",
    "#E67E22",
    "#1ABC9C",
    "#E74C3C",
  ];

  // Download Excel with Charts
  const downloadExcel = async () => {
    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      ["MONTHLY PERFORMANCE SUMMARY"],
      ["Metric", "Current", "Previous", "Growth"],
      [
        "Total Sales",
        monthlyCompare.salesComparison.CurrentMonthSales,
        monthlyCompare.salesComparison.PreviousTwoMonthSales,
        `${monthlyCompare.salesComparison.GrowthPercent}%`,
      ],
      ["", "", "", ""],
      ["EGG PRODUCTS"],
      [
        "Total Egg Pcs",
        monthlyCompare.summary.egg.current.pcs,
        monthlyCompare.summary.egg.previous.pcs,
        `${(((monthlyCompare.summary.egg.current.pcs - monthlyCompare.summary.egg.previous.pcs) / monthlyCompare.summary.egg.previous.pcs) * 100).toFixed(2)}%`,
      ],
      [
        "Total Egg Revenue",
        monthlyCompare.summary.egg.current.amount,
        monthlyCompare.summary.egg.previous.amount,
        `${(((monthlyCompare.summary.egg.current.amount - monthlyCompare.summary.egg.previous.amount) / monthlyCompare.summary.egg.previous.amount) * 100).toFixed(2)}%`,
      ],
      [
        "Average Egg Price",
        monthlyCompare.summary.egg.current.avg,
        monthlyCompare.summary.egg.previous.avg,
        `${(((monthlyCompare.summary.egg.current.avg - monthlyCompare.summary.egg.previous.avg) / monthlyCompare.summary.egg.previous.avg) * 100).toFixed(2)}%`,
      ],
      ["", "", "", ""],
      ["CHICKEN PRODUCTS"],
      [
        "Total Chicken KG",
        monthlyCompare.summary.chicken.current.kg,
        monthlyCompare.summary.chicken.previous.kg,
        `${(((monthlyCompare.summary.chicken.current.kg - monthlyCompare.summary.chicken.previous.kg) / monthlyCompare.summary.chicken.previous.kg) * 100).toFixed(2)}%`,
      ],
      [
        "Total Chicken Revenue",
        monthlyCompare.summary.chicken.current.amount,
        monthlyCompare.summary.chicken.previous.amount,
        `${(((monthlyCompare.summary.chicken.current.amount - monthlyCompare.summary.chicken.previous.amount) / monthlyCompare.summary.chicken.previous.amount) * 100).toFixed(2)}%`,
      ],
      [
        "Average Chicken Price",
        monthlyCompare.summary.chicken.current.avg,
        monthlyCompare.summary.chicken.previous.avg,
        `${(((monthlyCompare.summary.chicken.current.avg - monthlyCompare.summary.chicken.previous.avg) / monthlyCompare.summary.chicken.previous.avg) * 100).toFixed(2)}%`,
      ],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // 2. Egg Products Detailed Sheet
    const eggDetails = monthlyCompare.eggComparison.map((item) => ({
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

    // 3. Chicken Products Detailed Sheet
    const chickenDetails = monthlyCompare.chickenComparison.map((item) => ({
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

    // 4. Product Revenue Sheet
    const revenueDetails = monthlyCompare.productRevenue.map((item) => ({
      "Product Type": item.ProductType,
      "Current Revenue": item.CurrentRevenue,
      "Previous Revenue": item.PreviousRevenue,
      "Revenue Change": item.CurrentRevenue - item.PreviousRevenue,
      "Growth %": (
        ((item.CurrentRevenue - item.PreviousRevenue) / item.PreviousRevenue) *
        100
      ).toFixed(2),
    }));
    const revenueSheet = XLSX.utils.json_to_sheet(revenueDetails);
    XLSX.utils.book_append_sheet(workbook, revenueSheet, "Product Revenue");

    // 5. Bulk vs Retail Sheet
    const bulkRetailDetails = monthlyCompare.bulkRetail.map((item) => ({
      "Customer Type": item.CustomerType,
      "Product Type": item.ProductType,
      "Total Quantity": item.TotalQty,
    }));
    const bulkRetailSheet = XLSX.utils.json_to_sheet(bulkRetailDetails);
    XLSX.utils.book_append_sheet(workbook, bulkRetailSheet, "Bulk vs Retail");

    // Auto-size columns function
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
    autoSizeColumns(revenueSheet);
    autoSizeColumns(bulkRetailSheet);

    // Download workbook
    XLSX.writeFile(
      workbook,
      `Monthly_Report_${filters.year}_${filters.month}.xlsx`,
    );
  };

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>📊 Monthly Performance Dashboard</h2>
          <p className={styles.subtitle}>
            Detailed analysis for{" "}
            {new Date(0, filters.month - 1).toLocaleString("en", {
              month: "long",
            })}{" "}
            {filters.year}
          </p>
        </div>

        <div className={styles.filterGroup}>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className={styles.yearInput}
          />
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className={styles.monthSelect}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>
          <div className={styles.viewToggle}>
            <button
              className={viewMode === "grid" ? styles.active : ""}
              onClick={() => setViewMode("grid")}
            >
              📋 Grid
            </button>
            <button
              className={viewMode === "chart" ? styles.active : ""}
              onClick={() => setViewMode("chart")}
            >
              📊 Charts
            </button>
          </div>
          <button onClick={downloadExcel} className={styles.downloadBtn}>
            📥 Download Excel
          </button>
        </div>
      </header>

      {/* KPI OVERVIEW */}
      <div className={styles.topCards}>
        <div className={styles.card}>
          <span className={styles.cardIcon}>💰</span>
          <div>
            <span className={styles.cardLabel}>Current Revenue</span>
            <h3 className={styles.cardValue}>
              {formatCurrency(monthlyCompare.salesComparison.CurrentMonthSales)}
            </h3>
            <p
              className={
                monthlyCompare.salesComparison.GrowthPercent >= 0
                  ? styles.positive
                  : styles.negative
              }
            >
              {monthlyCompare.salesComparison.GrowthPercent >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(monthlyCompare.salesComparison.GrowthPercent)}% vs
              Previous
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon}>🥚</span>
          <div>
            <span className={styles.cardLabel}>Egg Sales</span>
            <h3 className={styles.cardValue}>
              {formatCurrency(monthlyCompare.summary.egg.current.amount)}
            </h3>
            <small>
              {monthlyCompare.summary.egg.current.pcs.toLocaleString()} Pcs |
              Avg ₹{monthlyCompare.summary.egg.current.avg.toFixed(2)}
            </small>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon}>🍗</span>
          <div>
            <span className={styles.cardLabel}>Chicken Sales</span>
            <h3 className={styles.cardValue}>
              {formatCurrency(monthlyCompare.summary.chicken.current.amount)}
            </h3>
            <small>
              {monthlyCompare.summary.chicken.current.kg.toFixed(1)} Kg | Avg ₹
              {monthlyCompare.summary.chicken.current.avg.toFixed(2)}
            </small>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon}>📈</span>
          <div>
            <span className={styles.cardLabel}>Sales Mix</span>
            <h3 className={styles.cardValue}>
              {(
                (monthlyCompare.summary.egg.current.amount /
                  monthlyCompare.salesComparison.CurrentMonthSales) *
                100
              ).toFixed(1)}
              % Egg
            </h3>
            <small>
              {(
                (monthlyCompare.summary.chicken.current.amount /
                  monthlyCompare.salesComparison.CurrentMonthSales) *
                100
              ).toFixed(1)}
              % Chicken
            </small>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* PRODUCT PERFORMANCE ANALYSIS GRID */
        <>
          <div className={styles.sectionHeader}>
            <h3>📦 Egg Products Performance</h3>
          </div>
          <div className={styles.performanceGrid}>
            {monthlyCompare.eggComparison.map((item, idx) => (
              <div key={idx} className={styles.productMiniCard}>
                <div className={styles.miniHeader}>
                  {item.ProductType}
                  <span
                    className={
                      item.CurrentAmount >= item.PreviousAmount
                        ? styles.posDot
                        : styles.negDot
                    }
                  ></span>
                </div>
                <div className={styles.miniBody}>
                  <div className={styles.statRow}>
                    <span>Revenue</span>
                    <strong>{formatCurrency(item.CurrentAmount)}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Quantity</span>
                    <strong>{item.CurrentQty.toLocaleString()}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.faded}>Previous</span>
                    <span className={styles.faded}>
                      {formatCurrency(item.PreviousAmount)} (
                      {item.PreviousQty.toLocaleString()})
                    </span>
                  </div>
                  <div className={styles.growthIndicator}>
                    {(
                      ((item.CurrentAmount - item.PreviousAmount) /
                        item.PreviousAmount) *
                      100
                    ).toFixed(1)}
                    % change
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <h3>🍗 Chicken Products Performance</h3>
          </div>
          <div className={styles.performanceGrid}>
            {monthlyCompare.chickenComparison.map((item, idx) => (
              <div key={idx} className={styles.productMiniCard}>
                <div className={styles.miniHeader}>
                  {item.ProductType}
                  <span
                    className={
                      item.CurrentAmount >= item.PreviousAmount
                        ? styles.posDot
                        : styles.negDot
                    }
                  ></span>
                </div>
                <div className={styles.miniBody}>
                  <div className={styles.statRow}>
                    <span>Revenue</span>
                    <strong>{formatCurrency(item.CurrentAmount)}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Quantity (Kg)</span>
                    <strong>{item.CurrentQty}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.faded}>Previous</span>
                    <span className={styles.faded}>
                      {formatCurrency(item.PreviousAmount)} ({item.PreviousQty}{" "}
                      Kg)
                    </span>
                  </div>
                  <div className={styles.growthIndicator}>
                    {(
                      ((item.CurrentAmount - item.PreviousAmount) /
                        item.PreviousAmount) *
                      100
                    ).toFixed(1)}
                    % change
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <h3>📊 Bulk vs Retail Analysis</h3>
          </div>
          <div className={styles.bulkRetailTable}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Customer Type</th>
                  <th>Product Type</th>
                  <th>Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {monthlyCompare.bulkRetail.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.CustomerType}</td>
                    <td>{item.ProductType}</td>
                    <td>{item.TotalQty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* CHART VISUALIZATION MODE */
        <div className={styles.chartWrapper}>
          {/* Revenue Overview Chart */}
          <div className={styles.chartCardFull}>
            <h3>💰 Revenue Overview - Top 10 Products</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={topProducts}
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
                  name="Current Revenue"
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
                  name="Previous Revenue"
                  fill="#6AD2FF"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.row}>
            {/* Egg Products Volume Chart */}
            <div className={styles.chartCard}>
              <h3>🥚 Egg Products - Volume Comparison</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={eggData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E0E5F2"
                  />
                  <XAxis
                    dataKey="ProductType"
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  <Bar
                    dataKey="CurrentQty"
                    name="Current Qty"
                    fill="#4318FF"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="PreviousQty"
                    name="Previous Qty"
                    fill="#6AD2FF"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chicken Products Volume Chart */}
            <div className={styles.chartCard}>
              <h3>🍗 Chicken Products - Volume Comparison</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chickenData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E0E5F2"
                  />
                  <XAxis
                    dataKey="ProductType"
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="CurrentQty"
                    name="Current Qty (Kg)"
                    fill="#05CD99"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="PreviousQty"
                    name="Previous Qty (Kg)"
                    fill="#A3AED0"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Distribution - Clean Horizontal Bar Chart for All Products */}
          <div className={styles.chartCardFull}>
            <h3>💰 Revenue Distribution - All Products (Sorted by Revenue)</h3>
            <div className={styles.revenueDistributionContainer}>
              <ResponsiveContainer
                width="100%"
                height={Math.max(500, allRevenueData.length * 35)}
              >
                <BarChart
                  data={allRevenueData}
                  layout="vertical"
                  margin={{ top: 20, right: 50, left: 120, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
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
          </div>

          <div className={styles.row}>
            {/* Revenue Breakdown Table with Visual Bars */}
            <div className={styles.chartCard}>
              <h3>📊 Revenue Breakdown by Product</h3>
              <div className={styles.revenueTable}>
                <table className={styles.revenueDataTable}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Revenue</th>
                      <th>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRevenueData.map((item, idx) => {
                      const sharePercent = (
                        (item.CurrentRevenue /
                          monthlyCompare.salesComparison.CurrentMonthSales) *
                        100
                      ).toFixed(1);
                      return (
                        <tr key={idx} className={idx < 3 ? styles.topRank : ""}>
                          <td className={styles.rankCell}>
                            {idx === 0 && "🏆"}
                            {idx === 1 && "🥈"}
                            {idx === 2 && "🥉"}
                            {idx > 2 && `${idx + 1}`}
                          </td>
                          <td className={styles.productCell}>
                            {item.ProductType}
                          </td>
                          <td className={styles.revenueCell}>
                            {formatCurrency(item.CurrentRevenue)}
                          </td>
                          <td className={styles.shareCell}>
                            <div className={styles.shareBar}>
                              <div
                                className={styles.shareFill}
                                style={{
                                  width: `${sharePercent}%`,
                                  backgroundColor: COLORS[idx % COLORS.length],
                                }}
                              />
                              <span className={styles.shareText}>
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

            {/* Growth Analysis Chart */}
            <div className={styles.chartCard}>
              <h3>📈 Growth Analysis - Top Products</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={allRevenueData.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="ProductType" width={90} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
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
          </div>

          <div className={styles.row}>
            {/* Bulk vs Retail Chart */}
            <div className={styles.chartCard}>
              <h3>🏪 Bulk vs Retail Distribution</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={bulkRetailData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ProductType"
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="TotalQty" fill="#4318FF" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="TotalQty" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue Summary Stats */}
            <div className={styles.chartCard}>
              <h3>📊 Revenue Summary</h3>
              <div className={styles.summaryStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Revenue</span>
                  <span className={styles.statValueLarge}>
                    {formatCurrency(
                      monthlyCompare.salesComparison.CurrentMonthSales,
                    )}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Egg Revenue</span>
                  <span className={styles.statValue}>
                    {formatCurrency(monthlyCompare.summary.egg.current.amount)}
                  </span>
                  <span
                    className={
                      monthlyCompare.summary.egg.current.amount >=
                      monthlyCompare.summary.egg.previous.amount
                        ? styles.positiveSmall
                        : styles.negativeSmall
                    }
                  >
                    {(
                      ((monthlyCompare.summary.egg.current.amount -
                        monthlyCompare.summary.egg.previous.amount) /
                        monthlyCompare.summary.egg.previous.amount) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>
                    Total Chicken Revenue
                  </span>
                  <span className={styles.statValue}>
                    {formatCurrency(
                      monthlyCompare.summary.chicken.current.amount,
                    )}
                  </span>
                  <span
                    className={
                      monthlyCompare.summary.chicken.current.amount >=
                      monthlyCompare.summary.chicken.previous.amount
                        ? styles.positiveSmall
                        : styles.negativeSmall
                    }
                  >
                    {(
                      ((monthlyCompare.summary.chicken.current.amount -
                        monthlyCompare.summary.chicken.previous.amount) /
                        monthlyCompare.summary.chicken.previous.amount) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Average Order Value</span>
                  <span className={styles.statValue}>
                    {formatCurrency(
                      monthlyCompare.salesComparison.CurrentMonthSales /
                        (eggData.length + chickenData.length),
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Insights Footer */}
          <div className={styles.summaryCard}>
            <h3>💡 Key Performance Insights</h3>
            <div className={styles.insightsGrid}>
              <div className={styles.insightBox}>
                <strong>🏆 Top Performer</strong>
                <p>{allRevenueData[0]?.ProductType}</p>
                <span className={styles.insightValue}>
                  {formatCurrency(allRevenueData[0]?.CurrentRevenue)}
                </span>
              </div>
              <div className={styles.insightBox}>
                <strong>📈 Fastest Growing</strong>
                <p>
                  {
                    [...monthlyCompare.productRevenue].sort(
                      (a, b) =>
                        (b.CurrentRevenue - b.PreviousRevenue) /
                          b.PreviousRevenue -
                        (a.CurrentRevenue - a.PreviousRevenue) /
                          a.PreviousRevenue,
                    )[0]?.ProductType
                  }
                </p>
                <span className={styles.positiveInsight}>
                  {(
                    (([...monthlyCompare.productRevenue].sort(
                      (a, b) =>
                        (b.CurrentRevenue - b.PreviousRevenue) /
                          b.PreviousRevenue -
                        (a.CurrentRevenue - a.PreviousRevenue) /
                          a.PreviousRevenue,
                    )[0]?.CurrentRevenue -
                      [...monthlyCompare.productRevenue].sort(
                        (a, b) =>
                          (b.CurrentRevenue - b.PreviousRevenue) /
                            b.PreviousRevenue -
                          (a.CurrentRevenue - a.PreviousRevenue) /
                            a.PreviousRevenue,
                      )[0]?.PreviousRevenue) /
                      [...monthlyCompare.productRevenue].sort(
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
              <div className={styles.insightBox}>
                <strong>⚠️ Needs Attention</strong>
                <p>
                  {
                    [...monthlyCompare.productRevenue].sort(
                      (a, b) =>
                        (a.CurrentRevenue - a.PreviousRevenue) /
                          a.PreviousRevenue -
                        (b.CurrentRevenue - b.PreviousRevenue) /
                          b.PreviousRevenue,
                    )[0]?.ProductType
                  }
                </p>
                <span className={styles.negativeInsight}>
                  {(
                    (([...monthlyCompare.productRevenue].sort(
                      (a, b) =>
                        (a.CurrentRevenue - a.PreviousRevenue) /
                          a.PreviousRevenue -
                        (b.CurrentRevenue - b.PreviousRevenue) /
                          b.PreviousRevenue,
                    )[0]?.CurrentRevenue -
                      [...monthlyCompare.productRevenue].sort(
                        (a, b) =>
                          (a.CurrentRevenue - a.PreviousRevenue) /
                            a.PreviousRevenue -
                          (b.CurrentRevenue - b.PreviousRevenue) /
                            b.PreviousRevenue,
                      )[0]?.PreviousRevenue) /
                      [...monthlyCompare.productRevenue].sort(
                        (a, b) =>
                          (a.CurrentRevenue - a.PreviousRevenue) /
                            a.PreviousRevenue -
                          (b.CurrentRevenue - b.PreviousRevenue) /
                            b.PreviousRevenue,
                      )[0]?.PreviousRevenue) *
                    100
                  ).toFixed(1)}
                  % Decline
                </span>
              </div>
              <div className={styles.insightBox}>
                <strong>📦 Bulk vs Retail</strong>
                <p>
                  Bulk:{" "}
                  {bulkRetailData
                    .filter((b) => b.CustomerType === "BULK")
                    .reduce((sum, b) => sum + b.TotalQty, 0)
                    .toLocaleString()}{" "}
                  units
                </p>
                <p>
                  Retail:{" "}
                  {bulkRetailData
                    .filter((b) => b.CustomerType === "RETAIL")
                    .reduce((sum, b) => sum + b.TotalQty, 0)
                    .toLocaleString()}{" "}
                  units
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyCompareReport;
