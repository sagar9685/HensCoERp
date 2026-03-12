import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductionCurrentStock } from "../../features/stockSlice";
import {
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  AlertTriangle,
  Layers,
} from "lucide-react";
import styles from "./CurrentStock.module.css";
import ProductionHeader from "./ProductionHeader";

const CurrentStockInventory = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.stock);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchProductionCurrentStock());
  }, [dispatch]);

  const filteredItems = items.filter((item) =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1>
              <Layers size={28} /> Live Farm Inventory
            </h1>
            <p>Current stock available after production and dispatch</p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={() => dispatch(fetchProductionCurrentStock())}
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {/* Stats Quick View */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <TrendingUp className={styles.iconBlue} />
            <div className={styles.statInfo}>
              <h3>{totalQty.toFixed(2)}</h3>
              <span>Total Units on Farm</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <AlertTriangle className={styles.iconOrange} />
            <div className={styles.statInfo}>
              <h3>{items.filter((i) => i.quantity < 10).length}</h3>
              <span>Low Stock Items</span>
            </div>
          </div>
        </div>

        {/* Search & Table */}
        <div className={styles.tableWrapper}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Available Quantity</th>
                <th>Weight Reference</th>
                <th>Last Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className={styles.loader}>
                    Loading Inventory...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.itemName}>{item.item_name}</td>
                    <td className={styles.qty}>{item.quantity}</td>
                    <td>{item.weight || "N/A"}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                    <td>
                      <span
                        className={
                          item.quantity > 10
                            ? styles.statusIn
                            : styles.statusLow
                        }
                      >
                        {item.quantity > 10 ? "Available" : "Low Stock"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className={styles.noData}>
                    No items found in stock
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CurrentStockInventory;
