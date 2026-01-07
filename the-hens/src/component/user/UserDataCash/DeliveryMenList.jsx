import React from "react";
import styles from "./UserDataTable.module.css";

export default function DeliveryMenList({
  filteredAndSortedList,
  selectedId,
  setSelectedId,
  sortConfig,
  handleSort,
  getSortIcon,
  loading,
}) {
  return (
    <div className={styles.tableSection}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>
          📋 Delivery Men List
          <span className={styles.tableCount}>
            ({filteredAndSortedList.length})
          </span>
        </h3>
        <div className={styles.tableActions}>
          <span className={styles.sortInfo}>
            Sorted by: {sortConfig.key || "None"} {getSortIcon(sortConfig.key)}
          </span>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                onClick={() => handleSort("DeliveryManID")}
                className={styles.sortableHeader}
              >
                ID {getSortIcon("DeliveryManID")}
              </th>
              <th
                onClick={() => handleSort("Name")}
                className={styles.sortableHeader}
              >
                Name {getSortIcon("Name")}
              </th>
              <th
                onClick={() => handleSort("Area")}
                className={styles.sortableHeader}
              >
                Area {getSortIcon("Area")}
              </th>
              <th
                onClick={() => handleSort("TotalCash")}
                className={`${styles.cashHeader} ${styles.sortableHeader}`}
              >
                Total Cash (₹) {getSortIcon("TotalCash")}
              </th>
              <th className={styles.actionHeader}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedList.map((item) => {
              const active = String(item.DeliveryManID) === String(selectedId);
              const cashLevel =
                item.TotalCash > 3000
                  ? "high"
                  : item.TotalCash > 1000
                  ? "medium"
                  : "low";

              return (
                <tr
                  key={item.DeliveryManID}
                  className={`${styles.tableRow} ${
                    active ? styles.rowActive : ""
                  } ${styles[cashLevel + "Cash"]}`}
                  onClick={() => setSelectedId(item.DeliveryManID)}
                >
                  <td className={styles.idCell}>
                    <span className={styles.idBadge}>
                      #{item.DeliveryManID}
                    </span>
                  </td>
                  <td className={styles.nameCell}>
                    <div className={styles.nameWrapper}>
                      <div className={styles.avatar}>
                        {item.Name.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className={styles.name}>{item.Name}</div>
                        <div className={styles.phone}>{item.MobileNo}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.areaCell}>{item.Area}</td>
                  <td className={styles[cashLevel + "Amount"]}>
                    <div className={styles.amountWrapper}>
                      <span className={styles.currency}>₹</span>
                      {Number(item.TotalCash || 0).toLocaleString()}

                      <span className={styles.decimal}>.00</span>
                    </div>
                  </td>
                  <td className={styles.actionCell}>
                    <button
                      className={styles.quickHandoverButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.DeliveryManID);
                      }}
                      title="Select for handover"
                    >
                      💰 Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAndSortedList.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>No delivery men found</p>
            <small>Try adjusting your search criteria</small>
          </div>
        )}
      </div>
    </div>
  );
}
