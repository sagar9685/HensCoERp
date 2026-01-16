import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStock, fetchAvailableStock } from "../../features/stockSlice";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavBar"; // Add import
import styles from "./stock.module.css";
import {
  BarChart3,
  Package,
  TrendingUp,
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
  Hash,
} from "lucide-react";

const Stock = () => {
  const dispatch = useDispatch();
  const { available, loading } = useSelector((state) => state.stock);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // Naya state
  const [filteredStock, setFilteredStock] = useState([]);
  const [stockStats, setStockStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStock: 0,
    totalQuantity: 0,
  });

  useEffect(() => {
    dispatch(fetchStock());
    dispatch(fetchAvailableStock());
  }, [dispatch]);

  useEffect(() => {
    if (available.length > 0) {
      const filtered = available.filter((item) =>
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStock(filtered);

      // Calculate stats
      const stats = {
        totalItems: available.length,
        lowStockItems: available.filter(
          (item) => item.available_stock > 0 && item.available_stock < 10
        ).length,
        outOfStock: available.filter((item) => item.available_stock === 0)
          .length,
        totalQuantity: available.reduce(
          (sum, item) => sum + (item.available_stock || 0),
          0
        ),
      };
      setStockStats(stats);
    }
  }, [available, searchTerm]);

  useEffect(() => {
    if (available) {
      let filtered = available.filter((item) =>
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (activeFilter == "low") {
        filtered = filtered.filter(
          (item) => item.available_stock > 0 && item.available_stock < 10
        );
      } else if (activeFilter == "out") {
        filtered = filtered.filter((item) => item.available_stock === 0);
      } else if (activeFilter == "high") {
        filtered = filtered.filter((item) => item.available_stock >= 30);
      }

      setFilteredStock(filtered);

      const stats = {
        totalItems: available.length,
        lowStockItems: available.filter(
          (item) => item.available_stock > 0 && item.available_stock < 10
        ).length,
        outOfStock: available.filter((item) => item.available_stock === 0)
          .length,
        totalQuantity: available.reduce(
          (sum, item) => sum + (item.available_stock || 0),
          0
        ),
      };
      setStockStats(stats);
    }
  }, [available, searchTerm, activeFilter]);

  const handleRefresh = () => {
    dispatch(fetchAvailableStock());
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity < 10) return "low-stock";
    if (quantity < 30) return "medium-stock";
    return "high-stock";
  };

  const getStatusIcon = (quantity) => {
    if (quantity === 0) return <AlertCircle size={20} />;
    if (quantity < 10) return <AlertCircle size={20} />;
    return <Package size={20} />;
  };

  return (
    <>
      <div className="container-scroller">
        <UserSideBar />
        <div className="container-fluid page-body-wrapper">
          <UserNavbar />
          <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <div className={styles.titleSection}>
                  <h1 className={styles.heading}>
                    <Package className={styles.headingIcon} />
                    Stock Inventory
                  </h1>
                  <p className={styles.subtitle}>
                    Real-time stock monitoring & analytics
                  </p>
                </div>
                <div className={styles.actions}>
                  <button className={styles.refreshBtn} onClick={handleRefresh}>
                    <RefreshCw size={18} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  <Package size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stockStats.totalItems}</h3>
                  <p className={styles.statLabel}>Total Items</p>
                  <div className={styles.statTrend}>
                    <TrendingUp size={16} />
                    <span>Active in inventory</span>
                  </div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
                  }}
                >
                  <Hash size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>
                    {stockStats.totalQuantity}
                  </h3>
                  <p className={styles.statLabel}>Total Quantity</p>
                  <div className={styles.statTrend}>
                    <TrendingUp size={16} />
                    <span>All items combined</span>
                  </div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)",
                  }}
                >
                  <AlertCircle size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>
                    {stockStats.lowStockItems}
                  </h3>
                  <p className={styles.statLabel}>Low Stock Items</p>
                  <span className={styles.warningBadge}>Need Attention</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
                  }}
                >
                  <BarChart3 size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stockStats.outOfStock}</h3>
                  <p className={styles.statLabel}>Out of Stock</p>
                  <p className={styles.statNote}>Require restocking</p>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className={styles.controls}>
              <div className={styles.searchBox}>
                <Search className={styles.searchIcon} size={20} />
                <input
                  type="text"
                  placeholder="Search items by name..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className={styles.clearSearch}
                    onClick={() => setSearchTerm("")}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={styles.filterTags}>
                <span
                  className={`${styles.filterTag} ${styles.tagAll} ${
                    activeFilter === "all" ? styles.active : ""
                  }`}
                  onClick={() => setActiveFilter("all")}
                  style={{ cursor: "pointer" }}
                >
                  All Items
                </span>
                <span
                  className={`${styles.filterTag} ${styles.tagLow} ${
                    activeFilter === "low" ? styles.active : ""
                  }`}
                  onClick={() => setActiveFilter("low")}
                  style={{ cursor: "pointer" }}
                >
                  Low Stock
                </span>
                <span
                  className={`${styles.filterTag} ${styles.tagOut} ${
                    activeFilter === "out" ? styles.active : ""
                  }`}
                  onClick={() => setActiveFilter("out")}
                  style={{ cursor: "pointer" }}
                >
                  Out of Stock
                </span>
                <span
                  className={`${styles.filterTag} ${styles.tagHigh} ${
                    activeFilter === "high" ? styles.active : ""
                  }`}
                  onClick={() => setActiveFilter("high")}
                  style={{ cursor: "pointer" }}
                >
                  High Stock
                </span>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Loading stock data...</p>
              </div>
            )}

            {/* Stock Items Grid */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Available Stock Items
                  <span className={styles.itemCount}>
                    {filteredStock.length} items
                  </span>
                </h2>
                <div className={styles.stockLegend}>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.highDot}`}
                    ></span>
                    High Stock
                  </div>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.mediumDot}`}
                    ></span>
                    Medium Stock
                  </div>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.lowDot}`}
                    ></span>
                    Low Stock
                  </div>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.outDot}`}
                    ></span>
                    Out of Stock
                  </div>
                </div>
              </div>

              {filteredStock.length === 0 ? (
                <div className={styles.emptyState}>
                  <Package size={64} className={styles.emptyIcon} />
                  <h3 className={styles.emptyTitle}>No stock items found</h3>
                  <p className={styles.emptyMessage}>
                    {searchTerm
                      ? "Try a different search term"
                      : "No stock data available"}
                  </p>
                </div>
              ) : (
                <div className={styles.stockGrid}>
                  {filteredStock.map((item, index) => (
                    <div
                      key={index}
                      className={`${styles.stockCard} ${
                        styles[getStockStatus(item.available_stock)]
                      }`}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.itemIcon}>
                          {getStatusIcon(item.available_stock)}
                        </div>
                        <div className={styles.stockBadge}>
                          <span className={styles.stockQuantity}>
                            {item.available_stock}
                          </span>
                          <span className={styles.stockUnit}>units</span>
                        </div>
                      </div>

                      <div className={styles.cardBody}>
                        <h4 className={styles.itemName}>{item.item_name}</h4>
                        <div className={styles.stockInfo}>
                          <div className={styles.stockDetail}>
                            <span className={styles.detailLabel}>
                              Current Stock:
                            </span>
                            <span className={styles.detailValue}>
                              {item.available_stock} units
                            </span>
                          </div>
                          <div className={styles.stockDetail}>
                            <span className={styles.detailLabel}>Status:</span>
                            <span
                              className={`${styles.statusBadge} ${
                                styles[getStockStatus(item.available_stock)]
                              }`}
                            >
                              {getStockStatus(item.available_stock).replace(
                                "-",
                                " "
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.cardFooter}>
                        <div className={styles.stockIndicator}>
                          <div className={styles.indicatorBar}>
                            <div
                              className={`${styles.indicatorFill} ${
                                styles[getStockStatus(item.available_stock)]
                              }`}
                              style={{
                                width: `${Math.min(
                                  item.available_stock * 2,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Stock;
