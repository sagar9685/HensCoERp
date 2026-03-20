import React, { useEffect, useState } from "react";
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
  LineChart,
  Line,
  Area,
  ComposedChart,
  LabelList,
} from "recharts";
import styles from "./MonthlyCompare.module.css";

const MonthlyCompareReport = () => {
  const dispatch = useDispatch();
  const { monthlyCompare, compareLoading } = useSelector(
    (state) => state.report,
  );
  const [filters, setFilters] = useState({ year: 2026, month: 3 });
  const [viewMode, setViewMode] = useState("grid"); // grid or chart
  const [sortBy, setSortBy] = useState("revenue"); // revenue, quantity, growth

  useEffect(() => {
    dispatch(fetchMonthlyCompare(filters));
  }, [dispatch, filters]);

  if (compareLoading)
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Loading Analytics Dashboard...</p>
        </div>
      </div>
    );
  if (!monthlyCompare) return null;

  const formatCurrency = (val) =>
    `₹${new Intl.NumberFormat("en-IN").format(val || 0)}`;

  const formatNumber = (val) => new Intl.NumberFormat("en-IN").format(val || 0);

  const formatCompact = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  // Combine and sort products
  const allProducts = [
    ...monthlyCompare.eggComparison.map((item) => ({
      ...item,
      category: "Egg",
    })),
    ...monthlyCompare.chickenComparison.map((item) => ({
      ...item,
      category: "Chicken",
    })),
  ].sort((a, b) => {
    if (sortBy === "revenue") return b.CurrentAmount - a.CurrentAmount;
    if (sortBy === "quantity") return b.CurrentQty - a.CurrentQty;
    return (
      ((b.CurrentAmount - b.PreviousAmount) / b.PreviousAmount) * 100 -
      ((a.CurrentAmount - a.PreviousAmount) / a.PreviousAmount) * 100
    );
  });

  // Calculate growth percentage
  const calculateGrowth = (current, previous) => {
    if (!previous) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  // Top 5 products by revenue
  const topProducts = [...monthlyCompare.productRevenue]
    .sort((a, b) => b.CurrentRevenue - a.CurrentRevenue)
    .slice(0, 5);

  // Prepare trend data
  const eggTrendData = monthlyCompare.eggComparison.map((item) => ({
    name: item.ProductType,
    current: item.CurrentQty,
    previous: item.PreviousQty,
    growth: calculateGrowth(item.CurrentQty, item.PreviousQty),
  }));

  const chickenTrendData = monthlyCompare.chickenComparison.map((item) => ({
    name: item.ProductType,
    current: item.CurrentQty,
    previous: item.PreviousQty,
    growth: calculateGrowth(item.CurrentQty, item.PreviousQty),
  }));

  const COLORS = [
    "#4318FF",
    "#6AD2FF",
    "#2B3674",
    "#FFB547",
    "#EE5D50",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((item, idx) => (
            <p key={idx} className={styles.tooltipValue}>
              {item.name}:{" "}
              {item.name.includes("Amount")
                ? formatCurrency(item.value)
                : formatNumber(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>
            <span className={styles.headerIcon}>📊</span>
            Performance Analytics Dashboard
          </h2>
          <p className={styles.subtitle}>
            {new Date(filters.year, filters.month - 1).toLocaleString(
              "default",
              { month: "long" },
            )}{" "}
            {filters.year} | vs Previous Month Analysis
          </p>
        </div>
        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <label>Year</label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  year: parseInt(e.target.value) || 2026,
                })
              }
              min="2020"
              max="2030"
            />
          </div>
          <div className={styles.filterItem}>
            <label>Month</label>
            <select
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: parseInt(e.target.value) })
              }
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterItem}>
            <label>View</label>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === "grid" ? styles.activeToggle : ""}`}
                onClick={() => setViewMode("grid")}
              >
                📋 Grid
              </button>
              <button
                className={`${styles.toggleBtn} ${viewMode === "chart" ? styles.activeToggle : ""}`}
                onClick={() => setViewMode("chart")}
              >
                📊 Chart
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>💰</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Sales</span>
            <h3 className={styles.kpiValue}>
              {formatCurrency(monthlyCompare.salesComparison.CurrentMonthSales)}
            </h3>
            <p
              className={`${styles.kpiGrowth} ${monthlyCompare.salesComparison.GrowthPercent >= 0 ? styles.positive : styles.negative}`}
            >
              {monthlyCompare.salesComparison.GrowthPercent >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(monthlyCompare.salesComparison.GrowthPercent)}% vs
              Previous
            </p>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🥚</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Egg Revenue</span>
            <h3 className={styles.kpiValue}>
              {formatCurrency(monthlyCompare.summary.egg.current.amount)}
            </h3>
            <div className={styles.kpiDetails}>
              <span>
                {formatNumber(monthlyCompare.summary.egg.current.pcs)} pcs
              </span>
              <span>
                Avg ₹{monthlyCompare.summary.egg.current.avg.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🍗</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Chicken Revenue</span>
            <h3 className={styles.kpiValue}>
              {formatCurrency(monthlyCompare.summary.chicken.current.amount)}
            </h3>
            <div className={styles.kpiDetails}>
              <span>
                {monthlyCompare.summary.chicken.current.kg.toFixed(1)} kg
              </span>
              <span>
                Avg ₹{monthlyCompare.summary.chicken.current.avg.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📦</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Products</span>
            <h3 className={styles.kpiValue}>{allProducts.length}</h3>
            <div className={styles.kpiDetails}>
              <span>{monthlyCompare.eggComparison.length} Egg</span>
              <span>{monthlyCompare.chickenComparison.length} Chicken</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className={styles.sortBar}>
        <span className={styles.sortLabel}>Sort by:</span>
        <div className={styles.sortButtons}>
          <button
            className={`${styles.sortBtn} ${sortBy === "revenue" ? styles.activeSort : ""}`}
            onClick={() => setSortBy("revenue")}
          >
            💰 Revenue
          </button>
          <button
            className={`${styles.sortBtn} ${sortBy === "quantity" ? styles.activeSort : ""}`}
            onClick={() => setSortBy("quantity")}
          >
            📊 Quantity
          </button>
          <button
            className={`${styles.sortBtn} ${sortBy === "growth" ? styles.activeSort : ""}`}
            onClick={() => setSortBy("growth")}
          >
            📈 Growth
          </button>
        </div>
        <div className={styles.statsSummary}>
          <span>
            📈 Total Revenue:{" "}
            {formatCurrency(monthlyCompare.salesComparison.CurrentMonthSales)}
          </span>
          <span>
            📦 Total Units:{" "}
            {formatNumber(
              allProducts.reduce((sum, p) => sum + p.CurrentQty, 0),
            )}
          </span>
        </div>
      </div>

      {/* Product Performance Section */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>📋 Product Performance Analysis</h3>
        <div className={styles.sectionBadge}>
          {viewMode === "grid" ? "Grid View" : "Chart View"}
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className={styles.performanceGrid}>
          {allProducts.map((item, idx) => {
            const growth = calculateGrowth(
              item.CurrentAmount,
              item.PreviousAmount,
            );
            const isPositive = growth >= 0;
            const quantityGrowth = calculateGrowth(
              item.CurrentQty,
              item.PreviousQty,
            );

            return (
              <div key={idx} className={styles.productCard}>
                <div className={styles.productHeader}>
                  <span className={styles.productCategory}>
                    {item.category}
                  </span>
                  <h4 className={styles.productName}>{item.ProductType}</h4>
                </div>
                <div className={styles.productStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Revenue</span>
                    <strong className={styles.statValue}>
                      {formatCurrency(item.CurrentAmount)}
                    </strong>
                    <span
                      className={`${styles.statGrowth} ${isPositive ? styles.positiveText : styles.negativeText}`}
                    >
                      {isPositive ? "↑" : "↓"} {Math.abs(growth)}%
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Quantity</span>
                    <strong className={styles.statValue}>
                      {formatNumber(item.CurrentQty)}
                    </strong>
                    <span
                      className={`${styles.statGrowth} ${quantityGrowth >= 0 ? styles.positiveText : styles.negativeText}`}
                    >
                      {quantityGrowth >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(quantityGrowth)}%
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Previous</span>
                    <span className={styles.statPrev}>
                      {formatCurrency(item.PreviousAmount)}
                    </span>
                    <span className={styles.statPrevQty}>
                      ({formatNumber(item.PreviousQty)} units)
                    </span>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min((item.CurrentAmount / monthlyCompare.salesComparison.CurrentMonthSales) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <h3>🥚 Egg Products - Volume Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={eggTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="current"
                  name="Current Month"
                  fill="#4318FF"
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="current"
                    position="top"
                    formatter={formatNumber}
                  />
                </Bar>
                <Bar
                  dataKey="previous"
                  name="Previous Month"
                  fill="#6AD2FF"
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="previous"
                    position="top"
                    formatter={formatNumber}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3>🍗 Chicken Products - Volume Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chickenTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="current"
                  name="Current Month"
                  fill="#10B981"
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="current"
                    position="top"
                    formatter={(v) => v.toFixed(1)}
                  />
                </Bar>
                <Bar
                  dataKey="previous"
                  name="Previous Month"
                  fill="#F59E0B"
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="previous"
                    position="top"
                    formatter={(v) => v.toFixed(1)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Distribution Section */}
      <div className={styles.revenueSection}>
        <div className={styles.chartCard}>
          <h3>💰 Revenue Distribution by Product</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={monthlyCompare.productRevenue.filter(
                  (r) => r.CurrentRevenue > 0,
                )}
                dataKey="CurrentRevenue"
                nameKey="ProductType"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(1)}%)`
                }
              >
                {monthlyCompare.productRevenue.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3>🏆 Top 5 Products by Revenue</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topProducts}
              layout="vertical"
              margin={{ left: 100 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value) => formatCompact(value)}
              />
              <YAxis type="category" dataKey="ProductType" width={100} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar
                dataKey="CurrentRevenue"
                name="Revenue"
                fill="#4318FF"
                radius={[0, 8, 8, 0]}
              >
                <LabelList
                  dataKey="CurrentRevenue"
                  position="right"
                  formatter={(value) => formatCompact(value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.summaryCard}>
        <h3>📈 Key Insights</h3>
        <div className={styles.insightsGrid}>
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>🎯</div>
            <div className={styles.insightContent}>
              <strong>Top Performer</strong>
              <p>
                {topProducts[0]?.ProductType || "N/A"} -{" "}
                {formatCurrency(topProducts[0]?.CurrentRevenue || 0)}
              </p>
            </div>
          </div>
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>📈</div>
            <div className={styles.insightContent}>
              <strong>Fastest Growing</strong>
              <p>
                {allProducts.reduce(
                  (max, p) => {
                    const growth = calculateGrowth(
                      p.CurrentAmount,
                      p.PreviousAmount,
                    );
                    return growth > max.growth
                      ? { name: p.ProductType, growth }
                      : max;
                  },
                  { name: "", growth: -Infinity },
                ).name || "N/A"}
              </p>
            </div>
          </div>
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>📊</div>
            <div className={styles.insightContent}>
              <strong>Average Order Value</strong>
              <p>
                {formatCurrency(
                  monthlyCompare.salesComparison.CurrentMonthSales /
                    allProducts.length,
                )}
              </p>
            </div>
          </div>
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>🥚🍗</div>
            <div className={styles.insightContent}>
              <strong>Egg:Chicken Ratio</strong>
              <p>
                {(
                  (monthlyCompare.summary.egg.current.amount /
                    monthlyCompare.salesComparison.CurrentMonthSales) *
                  100
                ).toFixed(1)}
                % :
                {(
                  (monthlyCompare.summary.chicken.current.amount /
                    monthlyCompare.salesComparison.CurrentMonthSales) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCompareReport;
