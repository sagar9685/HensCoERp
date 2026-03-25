import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomerDateRangeReport } from "../../features/reportSlice";
import axios from "axios";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  Legend,
} from "recharts";
import {
  Calendar,
  User,
  MapPin,
  Download,
  TrendingUp,
  ShoppingBag,
  TrendingDown,
  Filter,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import styles from "./CustomerDateRangeReport.module.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// Helper function to sort dates
const sortByDate = (a, b) => {
  return new Date(a.OrderDate) - new Date(b.OrderDate);
};

const CustomerDateRangeReport = () => {
  const dispatch = useDispatch();
  const { data = [] } = useSelector(
    (state) => state.report.customerDateRange || {},
  );
  const loading = useSelector((state) => state.report.customerDateRangeLoading);

  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState("all");
  const [area, setArea] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/customers`)
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error("Error fetching customers", err));
  }, []);

  const handleCustomer = (value) => {
    setCustomer(value);
    const selected = customers.find((c) => c.CustomerName === value);
    setArea(selected?.Area || "");
  };

  const handleSearch = () => {
    if (from && to) {
      dispatch(fetchCustomerDateRangeReport({ from, to, customer, status }));
    }
  };

  const handleReset = () => {
    setCustomer("all");
    setArea("");
    setFrom("");
    setTo("");
    setStatus("all");
  };

  // Format and sort the data for display
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort by date first
    const sortedData = [...data].sort(sortByDate);

    // Format dates and ensure proper values
    return sortedData.map((item) => ({
      ...item,
      originalDate: item.OrderDate,
      OrderDate: formatDate(item.OrderDate),
      TotalSales: Number(item.TotalSales || 0),
      TotalOrders: Number(item.TotalOrders || 0),
    }));
  }, [data]);

  const totals = useMemo(() => {
    return formattedData.reduce(
      (acc, curr) => ({
        sales: acc.sales + Number(curr.TotalSales || 0),
        orders: acc.orders + Number(curr.TotalOrders || 0),
      }),
      { sales: 0, orders: 0 },
    );
  }, [formattedData]);

  // Prepare data for per-date line chart with proper sorting
  const chartData = useMemo(() => {
    const sortedData = [...formattedData].sort((a, b) => {
      return new Date(a.originalDate) - new Date(b.originalDate);
    });

    return sortedData.map((item) => ({
      date: item.OrderDate,
      originalDate: item.originalDate,
      sales: Number(item.TotalSales || 0),
      orders: Number(item.TotalOrders || 0),
      customerName: item.CustomerName,
      area: item.Area,
    }));
  }, [formattedData]);

  const exportToCSV = () => {
    if (formattedData.length === 0) return;

    const headers = [
      "Order Date",
      "Customer Name",
      "Area",
      "Total Orders",
      "Total Sales (₹)",
    ];
    const csvData = formattedData.map((row) => [
      row.OrderDate,
      row.CustomerName,
      row.Area,
      row.TotalOrders,
      row.TotalSales,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_report_${formatDate(from)}_to_${formatDate(to)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipDate}>{label}</p>
          <p className={styles.tooltipSales}>
            💰 Sales: ₹ {payload[0].value.toLocaleString()}
          </p>
          {payload[1] && (
            <p className={styles.tooltipOrders}>
              📦 Orders: {payload[1].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className={styles.emptyChart}>
          <RefreshCw size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-400">No data available for selected range</p>
          <p className="text-gray-400 text-sm">
            Please select date range and click Generate
          </p>
        </div>
      );
    }

    switch (chartType) {
      case "line":
        return (
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#facc15" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) => `₹${value / 1000}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ fill: "#f97316", r: 4, strokeWidth: 2, stroke: "white" }}
              activeDot={{
                r: 6,
                fill: "#f97316",
                stroke: "white",
                strokeWidth: 2,
              }}
              name="Sales Amount (₹)"
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#areaGradient)"
              name="Sales Amount (₹)"
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#orderGradient)"
              name="Orders Count"
            />
          </AreaChart>
        );

      case "composed":
        return (
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="url(#barGradient)"
              name="Sales Amount (₹)"
              barSize={40}
              radius={[8, 8, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 4 }}
              name="Orders Count"
            />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.mainTitle}>
              Analytics Dashboard
              <span className={styles.titleBadge}>Live</span>
            </h1>
            <p className={styles.subtitle}>
              Real-time performance insights for The Hens Co.
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className={styles.exportBtn}
            disabled={formattedData.length === 0}
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Cards */}
      <div className={styles.filterWrapper}>
        <div className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <select
                className={styles.selectInput}
                value={customer}
                onChange={(e) => handleCustomer(e.target.value)}
              >
                <option value="all">All Customers</option>
                {customers.map((c, i) => (
                  <option key={i} value={c.CustomerName}>
                    {c.CustomerName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputWrapper}>
              <MapPin className={styles.inputIcon} size={18} />
              <input
                type="text"
                placeholder="Area"
                className={styles.textInput}
                value={area}
                readOnly
              />
            </div>

            <div className={styles.inputWrapper}>
              <Calendar className={styles.inputIcon} size={18} />
              <input
                type="date"
                className={styles.dateInput}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className={styles.inputWrapper}>
              <Calendar className={styles.inputIcon} size={18} />
              <input
                type="date"
                className={styles.dateInput}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <button onClick={handleSearch} className={styles.generateBtn}>
              <RefreshCw size={18} />
              Generate Report
            </button>

            <button onClick={handleReset} className={styles.resetBtn}>
              <Filter size={18} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardOrange}`}>
          <div className={styles.statCardContent}>
            <div>
              <p className={styles.statLabel}>Total Revenue</p>
              <h3 className={styles.statValue}>
                ₹ {totals.sales.toLocaleString()}
              </h3>
              <p className={styles.statTrend}>+12.5% from last period</p>
            </div>
            <div className={styles.statIcon}>
              <TrendingUp size={32} />
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardWhite}`}>
          <div className={styles.statCardContent}>
            <div>
              <p className={styles.statLabel}>Total Orders</p>
              <h3 className={styles.statValue}>{totals.orders}</h3>
              <p className={styles.statTrend}>+8.2% from last period</p>
            </div>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
              <ShoppingBag size={32} />
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardBlue}`}>
          <div className={styles.statCardContent}>
            <div>
              <p className={styles.statLabel}>Avg. Order Value</p>
              <h3 className={styles.statValue}>
                ₹{" "}
                {totals.orders ? (totals.sales / totals.orders).toFixed(0) : 0}
              </h3>
              <p className={styles.statTrend}>Per transaction</p>
            </div>
            <div className={styles.statIcon}>
              <TrendingUp size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section with Controls */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>
              <span className={styles.titleAccent}></span>
              Sales Performance Trend
            </h3>
            <p className={styles.chartSubtitle}>
              Per date analysis - showing data points for each selected date
            </p>
          </div>
          <div className={styles.chartControls}>
            <button
              className={`${styles.chartTypeBtn} ${chartType === "line" ? styles.activeChartBtn : ""}`}
              onClick={() => setChartType("line")}
            >
              Line
            </button>
            <button
              className={`${styles.chartTypeBtn} ${chartType === "area" ? styles.activeChartBtn : ""}`}
              onClick={() => setChartType("area")}
            >
              Area
            </button>
            <button
              className={`${styles.chartTypeBtn} ${chartType === "composed" ? styles.activeChartBtn : ""}`}
              onClick={() => setChartType("composed")}
            >
              Composed
            </button>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.tableWrapper}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Detailed Transaction Records</h3>
          <p className={styles.tableSubtitle}>
            Showing {formattedData.length} records
          </p>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.tableTh}>Date</th>
                <th className={styles.tableTh}>Customer</th>
                <th className={styles.tableTh}>Location</th>
                <th className={`${styles.tableTh} text-center`}>Orders</th>
                <th className={`${styles.tableTh} text-right`}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Fetching records...</p>
                  </td>
                </tr>
              ) : formattedData.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.emptyState}>
                    <RefreshCw size={40} className="text-gray-300 mb-2" />
                    <p>No data found</p>
                    <p className="text-sm">
                      Select date range and click Generate
                    </p>
                  </td>
                </tr>
              ) : (
                formattedData.map((row, i) => (
                  <tr key={i} className={styles.tableRow}>
                    <td className={styles.tableTd}>
                      <span className={styles.dateBadge}>{row.OrderDate}</span>
                    </td>
                    <td className={`${styles.tableTd} ${styles.customerName}`}>
                      {row.CustomerName}
                    </td>
                    <td className={styles.tableTd}>
                      <span className={styles.locationBadge}>
                        <MapPin size={12} /> {row.Area}
                      </span>
                    </td>
                    <td className={`${styles.tableTd} text-center`}>
                      <span className={styles.orderBadge}>
                        {row.TotalOrders}
                      </span>
                    </td>
                    <td
                      className={`${styles.tableTd} text-right ${styles.amountCell}`}
                    >
                      ₹ {Number(row.TotalSales).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDateRangeReport;
