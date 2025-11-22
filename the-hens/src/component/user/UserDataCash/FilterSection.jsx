import React from "react";
import styles from "./UserDataTable.module.css";

export default function FilterSection({
    searchTerm,
    setSearchTerm,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedId,
    setSelectedId,
    list,
    onClearAllFilters
}) {
    return (
        <div className={styles.controlsSection}>
            <div className={styles.searchGroup}>
                <label className={styles.label} htmlFor="search">🔍 Search Delivery Men</label>
                <input
                    id="search"
                    type="text"
                    className={styles.inputField}
                    placeholder="Search by name or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* <div className={styles.dateGroup}>
                <label className={styles.label} htmlFor="fromDate">📅 From Date</label>
                <input
                    id="fromDate"
                    type="date"
                    className={styles.inputField}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                />
            </div>

            <div className={styles.dateGroup}>
                <label className={styles.label} htmlFor="toDate">📅 To Date</label>
                <input
                    id="toDate"
                    type="date"
                    className={styles.inputField}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                />
            </div> */}
            
            <div className={styles.dropdownGroup}>
                <label className={styles.label} htmlFor="deliveryManSelect">👤 Select Delivery Man</label>
                <select
                    id="deliveryManSelect"
                    className={styles.inputField}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                >
                    <option value="">-- All Delivery Men --</option>
                    {list.map((item) => (
                        <option key={item.DeliveryManID} value={item.DeliveryManID}>
                            {item.Name} - ₹{item.TotalCash}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.controlActions}>
                <button 
                    className={styles.clearFiltersButton}
                    onClick={onClearAllFilters}
                >
                    🗑️ Clear Filters
                </button>
            </div>
        </div>
    );
}