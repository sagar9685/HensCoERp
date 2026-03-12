import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductionCurrentStock } from "../../features/stockSlice";
import { fetchWeightByType } from "../../features/productTypeSlice";
import styles from "./ProductionCurrentStock.module.css";

export default function ProductionCurrentStock() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    totalWeight: 0,
    lowStock: 0,
  });

  const [defaultWeights, setDefaultWeights] = useState({});

  const { currentStock, loading } = useSelector((state) => state.stock);
  const { weight } = useSelector((state) => state.product);

  useEffect(() => {
    dispatch(fetchProductionCurrentStock());
  }, [dispatch]);

  useEffect(() => {
    const getWeights = async () => {
      if (currentStock && currentStock.length > 0) {
        currentStock.forEach(async (item) => {
          // Only fetch if weight is missing AND we haven't already fetched it for this item name
          if (
            (!item.weight || item.weight === 0) &&
            !defaultWeights[item.item_name]
          ) {
            const res = await dispatch(fetchWeightByType(item.item_name));
            if (res.payload) {
              setDefaultWeights((prev) => ({
                ...prev,
                [item.item_name]: res.payload,
              }));
            }
          }
        });
      }
    };
    getWeights();
  }, [currentStock, dispatch]); // Removed defaultWeights from dependency to avoid infinite loop
  // Safe number parsing function
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculate stats when data changes
  useEffect(() => {
    if (currentStock && Array.isArray(currentStock)) {
      const totalQty = currentStock.reduce((sum, item) => {
        const qty = parseNumber(item.quantity);
        return sum + qty;
      }, 0);

      const totalWt = currentStock.reduce((sum, item) => {
        let wt = parseNumber(item.weight || defaultWeights[item.item_name]);

        // convert grams → kg
        if (wt >= 100) {
          wt = wt / 1000;
        }

        return sum + wt;
      }, 0);

      const lowStockItems = currentStock.filter((item) => {
        const qty = parseNumber(item.quantity);
        return qty < 50;
      }).length;

      setStats({
        totalItems: currentStock.length,
        totalQuantity: totalQty,
        totalWeight: totalWt,
        lowStock: lowStockItems,
      });

      setFilteredItems(currentStock);
    }
  }, [currentStock, defaultWeights]);

  // Handle search
  useEffect(() => {
    if (currentStock && Array.isArray(currentStock)) {
      const filtered = currentStock.filter(
        (item) =>
          item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id?.toString().includes(searchTerm),
      );
      setFilteredItems(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, currentStock]);

  // Handle sorting
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredItems].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle numeric values
      if (key === "quantity" || key === "weight" || key === "id") {
        aValue = parseNumber(aValue);
        bValue = parseNumber(bValue);
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredItems(sorted);
  };

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Handle item click for details
  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "↕️";
  };

  // Format number with commas
  const formatNumber = (num) => {
    const parsed = parseNumber(num);
    return parsed.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Format weight with proper unit
  const formatWeight = (value, itemName) => {
    const weight = parseNumber(value);

    if (!weight) return "0";

    // egg based items
    if (
      itemName?.toLowerCase().includes("box") ||
      itemName?.toLowerCase().includes("tray")
    ) {
      return `${weight} Eggs`;
    }

    // gram based items
    if (weight >= 100) {
      return `${weight} g`;
    }

    // kg items
    return `${weight} kg`;
  };
  // Get stock status class
  const getStockStatusClass = (quantity) => {
    const qty = parseNumber(quantity);
    if (qty < 30) return styles.criticalStock;
    if (qty < 50) return styles.lowStock;
    if (qty < 100) return styles.mediumStock;
    return styles.highStock;
  };

  // Get stock status text
  const getStockStatusText = (quantity) => {
    const qty = parseNumber(quantity);
    if (qty < 30) return "Critical";
    if (qty < 50) return "Low";
    if (qty < 100) return "Medium";
    return "High";
  };

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.background}>
        <div className={styles.gradientOrb}></div>
        <div className={styles.gradientOrb2}></div>
      </div>

      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📦</span>
            Production Current Stock
          </h1>
          <p className={styles.subtitle}>
            Real-time inventory management dashboard
          </p>
        </div>

        {/* View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === "table" ? styles.active : ""}`}
            onClick={() => setViewMode("table")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="3"
                y1="9"
                x2="21"
                y2="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="3"
                y1="15"
                x2="21"
                y2="15"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="9"
                y1="21"
                x2="9"
                y2="3"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="15"
                y1="21"
                x2="15"
                y2="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            Table
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === "grid" ? styles.active : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="8"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="13"
                y="3"
                width="8"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="3"
                y="13"
                width="8"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="13"
                y="13"
                width="8"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            Grid
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Items</span>
            <span className={styles.statValue}>
              {formatNumber(stats.totalItems)}
            </span>
          </div>
          <div className={styles.statTrend}>+12%</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔢</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Quantity</span>
            <span className={styles.statValue}>
              {formatNumber(stats.totalQuantity)}
            </span>
          </div>
          <div className={styles.statTrendPositive}>+8%</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚖️</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Weight</span>
            <span className={styles.statValue}>
              {stats.totalWeight.toFixed(2)} kg
            </span>
          </div>
          <div className={styles.statTrend}>+5%</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚠️</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Low Stock</span>
            <span className={styles.statValue}>{stats.lowStock}</span>
          </div>
          <div className={styles.statTrendNegative}>-3%</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by item name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
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
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading stock data...</p>
        </div>
      )}

      {/* No Data State */}
      {!loading && (!filteredItems || filteredItems.length === 0) && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h3>No Stock Items Found</h3>
          <p>
            Try adjusting your search or filter to find what you're looking for.
          </p>
          <button className={styles.resetBtn} onClick={() => setSearchTerm("")}>
            Clear Filters
          </button>
        </div>
      )}

      {/* Table View */}
      {!loading && viewMode === "table" && filteredItems.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => requestSort("id")}>
                  ID {getSortIcon("id")}
                </th>
                <th onClick={() => requestSort("item_name")}>
                  Item Name {getSortIcon("item_name")}
                </th>
                <th onClick={() => requestSort("quantity")}>
                  Quantity {getSortIcon("quantity")}
                </th>
                <th onClick={() => requestSort("weight")}>
                  Weight (kg) {getSortIcon("weight")}
                </th>
                {/* <th>Status</th> */}
                <th onClick={() => requestSort("updated_at")}>
                  Updated {getSortIcon("updated_at")}
                </th>
                {/* <th>Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={styles.tableRow}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className={styles.idCell}>#{item.id || "N/A"}</td>
                  <td className={styles.nameCell}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemAvatar}>
                        {item.item_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <span>{item.item_name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className={styles.quantityCell}>
                    <span
                      className={`${styles.quantityBadge} ${getStockStatusClass(item.quantity)}`}
                    >
                      {formatNumber(item.quantity)}
                    </span>
                  </td>
                  <td className={styles.weightCell}>
                    {formatWeight(
                      item.weight || defaultWeights[item.item_name],
                      item.item_name,
                    )}
                  </td>

                  <td className={styles.dateCell}>
                    {item.updated_at ? (
                      <>
                        <span className={styles.date}>
                          {new Date(item.updated_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                        <span className={styles.time}>
                          {new Date(item.updated_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </>
                    ) : (
                      <span className={styles.date}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && filteredItems.length > 0 && (
        <div className={styles.gridContainer}>
          {currentItems.map((item, index) => (
            <div
              key={item.id || index}
              className={`${styles.gridCard} ${getStockStatusClass(item.quantity)}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardAvatar}>
                  {item.item_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className={styles.cardBadge}>#{item.id || "N/A"}</div>
              </div>

              <h3 className={styles.cardTitle}>
                {item.item_name || "Unknown Item"}
              </h3>

              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>Quantity</span>
                  <span
                    className={`${styles.cardStatValue} ${getStockStatusClass(item.quantity)}`}
                  >
                    {formatNumber(item.quantity)}
                  </span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>Weight</span>
                  <span className={styles.cardStatValue}>
                    {formatWeight(
                      item.weight || defaultWeights[item.item_name],
                      item.item_name,
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span
                  className={`${styles.cardStatus} ${getStockStatusClass(item.quantity)}`}
                >
                  {getStockStatusText(item.quantity)}
                </span>
                <span className={styles.cardDate}>
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <polyline
                points="15 18 9 12 15 6"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={i}
                  className={`${styles.pageNumber} ${currentPage === pageNum ? styles.activePage : ""}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className={styles.pageBtn}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <polyline
                points="9 18 15 12 9 6"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>

          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Item Details Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>
              ✕
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.modalAvatar}>
                {selectedItem.item_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <h2 className={styles.modalTitle}>
                  {selectedItem.item_name || "Unknown Item"}
                </h2>
                <p className={styles.modalSubtitle}>
                  Item ID: #{selectedItem.id || "N/A"}
                </p>
              </div>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalStats}>
                <div className={styles.modalStat}>
                  <span className={styles.modalStatLabel}>
                    Current Quantity
                  </span>
                  <span
                    className={`${styles.modalStatValue} ${getStockStatusClass(selectedItem.quantity)}`}
                  >
                    {formatNumber(selectedItem.quantity)} units
                  </span>
                </div>

                <div className={styles.modalStat}>
                  <span className={styles.modalStatLabel}>Total Weight</span>
                  <span className={styles.modalStatValue}>
                    {formatWeight(selectedItem.weight)}
                  </span>
                </div>

                <div className={styles.modalStat}>
                  <span className={styles.modalStatLabel}>Status</span>
                  <span
                    className={`${styles.modalStatus} ${getStockStatusClass(selectedItem.quantity)}`}
                  >
                    {getStockStatusText(selectedItem.quantity)} Stock
                  </span>
                </div>

                <div className={styles.modalStat}>
                  <span className={styles.modalStatLabel}>Last Updated</span>
                  <span className={styles.modalStatValue}>
                    {selectedItem.updated_at
                      ? new Date(selectedItem.updated_at).toLocaleString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalBtnPrimary}>Update Stock</button>
                <button className={styles.modalBtnSecondary}>
                  View History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
