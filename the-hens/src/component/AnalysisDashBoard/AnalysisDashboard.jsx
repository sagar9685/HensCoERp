import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAreaWiseOrders,
  fetchAreaWiseSales,
  fetchAreaCustomerAnalysis,
  fetchMonthWiseOrders,
  fetchMonthWiseSales,
  fetchCustomerBestMonth,
  fetchProductTypeSales,
  fetchTopCustomersByRevenue,
  fetchBestAreaByRevenue,
  fetchMonthlySalesGrowth,
} from "../../features/analysisSlice";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Modal from "react-modal";
import {
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  Package,
  DollarSign,
  Maximize2,
  X,
  Filter as FilterIcon,
} from "lucide-react";
import styles from "./AnalysisDashboard.module.css";
import Header from "../Header";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

Modal.setAppElement("#root");

const AnalysisDashboard = () => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state.analysis);
  const { loading, error } = state;

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchAreaWiseOrders());
    dispatch(fetchAreaWiseSales());
    dispatch(fetchAreaCustomerAnalysis());
    dispatch(fetchMonthWiseOrders());
    dispatch(fetchMonthWiseSales());
    dispatch(fetchCustomerBestMonth());
    dispatch(fetchProductTypeSales());
    dispatch(fetchTopCustomersByRevenue());
    dispatch(fetchBestAreaByRevenue());
    dispatch(fetchMonthlySalesGrowth());
  }, [dispatch]);

  // --- Configuration Driven Approach ---
  // Isse modal ko pata chalta hai ki kis graph ke liye kaunsi 'key' uthani hai
  const allCharts = [
    {
      id: 1,
      cat: "areas",
      title: "Area Wise Total Orders",
      data: state.areaWiseOrders,
      lKey: "Area",
      vKey: "TotalOrders",
      type: "bar",
      icon: <MapPin size={20} />,
    },
    {
      id: 2,
      cat: "sales",
      title: "Area Wise Sales Revenue",
      data: state.areaWiseSales,
      lKey: "Area",
      vKey: "TotalSales",
      type: "bar",
      icon: <DollarSign size={20} />,
    },
    {
      id: 3,
      cat: "areas",
      title: "Top Customers Per Area",
      data: state.areaCustomerAnalysis,
      lKey: "CustomerName",
      vKey: "TotalOrders",
      type: "bar",
      icon: <Users size={20} />,
    },
    {
      id: 4,
      cat: "sales",
      title: "Monthly Order Trends",
      data: state.monthWiseOrders,
      lKey: "OrderMonth",
      vKey: "TotalOrders",
      type: "line",
      icon: <Calendar size={20} />,
    },
    {
      id: 5,
      cat: "sales",
      title: "Monthly Sales Revenue",
      data: state.monthWiseSales,
      lKey: "OrderMonth",
      vKey: "TotalSales",
      type: "line",
      icon: <TrendingUp size={20} />,
    },
    {
      id: 6,
      cat: "customers",
      title: "Customer's Best Month",
      data: state.customerBestMonth,
      lKey: "CustomerName",
      vKey: "TotalOrders",
      type: "bar",
      icon: <Users size={20} />,
    },
    {
      id: 7,
      cat: "sales",
      title: "Product Type Distribution",
      data: state.productTypeSales,
      lKey: "ProductType",
      vKey: "TotalSales",
      type: "doughnut",
      icon: <Package size={20} />,
    },
    {
      id: 8,
      cat: "customers",
      title: "Top 10 Customers by Revenue",
      data: state.topCustomersByRevenue,
      lKey: "CustomerName",
      vKey: "TotalSpent",
      type: "bar",
      icon: <DollarSign size={20} />,
    },
    {
      id: 9,
      cat: "areas",
      title: "Best Performing Area",
      data: state.bestAreaByRevenue,
      lKey: "Area",
      vKey: "Revenue",
      type: "pie",
      icon: <MapPin size={20} />,
    },
    {
      id: 10,
      cat: "sales",
      title: "Sales Growth Trend",
      data: state.monthlySalesGrowth,
      lKey: "OrderMonth",
      vKey: "Sales",
      type: "line",
      icon: <TrendingUp size={20} />,
    },
  ];

  // Filter Logic
  const filteredCharts = useMemo(() => {
    return activeFilter === "all"
      ? allCharts
      : allCharts.filter((c) => c.cat === activeFilter);
  }, [activeFilter, state]);

  const getChartProps = (config) => {
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#84CC16",
    ];
    return {
      labels: config.data?.map((item) => item[config.lKey] || "N/A") || [],
      datasets: [
        {
          label: config.vKey.replace(/([A-Z])/g, " $1").trim(),
          data: config.data?.map((item) => item[config.vKey] || 0) || [],
          backgroundColor:
            config.type === "bar" || config.type === "line"
              ? "rgba(59, 130, 246, 0.7)"
              : colors,
          borderColor: "#3B82F6",
          borderWidth: 1,
          fill: config.type === "line",
          tension: 0.4,
        },
      ],
    };
  };

 // Add this helper inside your component to sort data for the modal
const openModal = (config) => {
  // Create a copy and sort by value (vKey) descending
  const sortedData = config.data ? [...config.data].sort((a, b) => {
    return (b[config.vKey] || 0) - (a[config.vKey] || 0);
  }) : [];

  setModalConfig({ ...config, data: sortedData });
  setModalIsOpen(true);
};

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  if (error)
    return (
      <div className={styles.errorContainer}>
        <h3>Error: {error}</h3>
      </div>
    );

  return (
    <>
      <Header />
      <div className={styles.dashboard}>
        <div className={styles.dashboardHeader}>
          <div>
            <h1 className={styles.dashboardTitle}>Analytics Dashboard</h1>
            <p className={styles.dashboardSubtitle}>
              Data-driven insights for your business
            </p>
          </div>

          <div className={styles.filterSection}>
            <FilterIcon size={18} className={styles.filterIconMain} />
            <div className={styles.filters}>
              {["all", "sales", "customers", "areas"].map((f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${
                    activeFilter === f ? styles.active : ""
                  }`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          {filteredCharts.map((chart) => {
            const ChartComponent =
              chart.type === "line"
                ? Line
                : chart.type === "doughnut"
                ? Doughnut
                : chart.type === "pie"
                ? Pie
                : Bar;
            return (
              <div key={chart.id} className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div className={styles.chartTitleGroup}>
                    {chart.icon}
                    <h3>{chart.title}</h3>
                  </div>
                  <button
                    className={styles.expandBtn}
                    onClick={() => openModal(chart)}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
                <div className={styles.chartWrapper}>
                  <ChartComponent
                    data={getChartProps(chart)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: chart.type !== "bar" } },
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* --- PROFESSIONAL MODAL --- */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          className={styles.modal}
          overlayClassName={styles.overlay}
        >
          {modalConfig && (
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  {modalConfig.icon}
                  <h2>{modalConfig.title}</h2>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setModalIsOpen(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalChartContainer}>
                  {modalConfig.type === "line" ? (
                    <Line
                      data={getChartProps(modalConfig)}
                      options={{ maintainAspectRatio: false }}
                    />
                  ) : (
                    <Bar
                      data={getChartProps(modalConfig)}
                      options={{ maintainAspectRatio: false }}
                    />
                  )}
                </div>

                <div className={styles.tableSection}>
                  <h3>Data Breakdown</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{modalConfig.lKey}</th>
                          <th>{modalConfig.vKey.replace(/([A-Z])/g, " $1")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalConfig.data?.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item[modalConfig.lKey]}</td>
                            <td className={styles.valueCell}>
                              {modalConfig.vKey
                                .toLowerCase()
                                .includes("sales") ||
                              modalConfig.vKey
                                .toLowerCase()
                                .includes("revenue") ||
                              modalConfig.vKey.toLowerCase().includes("spent")
                                ? `₹${parseFloat(
                                    item[modalConfig.vKey] || 0
                                  ).toLocaleString()}`
                                : item[modalConfig.vKey]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default AnalysisDashboard;
