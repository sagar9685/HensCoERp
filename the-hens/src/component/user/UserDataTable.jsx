import React, { useEffect, useState, useMemo } from "react";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavbar";
import styles from "./UserDataTable.module.css";

export default function UserDataTable({ apiEndpoint = "/api/deliverymen/cash" }) {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [handoverAmount, setHandoverAmount] = useState(""); 
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [handoverHistory, setHandoverHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quickAmount, setQuickAmount] = useState("");

  const sampleData = [
    { DeliveryManID: 1, Name: "Rohit Lodhi", TotalCash: 1200, Phone: "+91 9876543210", Area: "Mumbai Central" },
    { DeliveryManID: 2, Name: "Sagar Patel", TotalCash: 850, Phone: "+91 9876543211", Area: "Andheri East" },
    { DeliveryManID: 3, Name: "Amit Kumar", TotalCash: 4300, Phone: "+91 9876543212", Area: "Bandra West" },
    { DeliveryManID: 4, Name: "Priya Sharma", TotalCash: 2500, Phone: "+91 9876543213", Area: "Powai" },
    { DeliveryManID: 5, Name: "Rahul Verma", TotalCash: 1500, Phone: "+91 9876543214", Area: "Thane West" },
  ];

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setList(sampleData);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [apiEndpoint]);

  // Enhanced filtering and searching
  const filteredAndSortedList = useMemo(() => {
    let filtered = list.filter(item => 
      item.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Area.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [list, searchTerm, sortConfig]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const selected = list.find((x) => String(x.DeliveryManID) === String(selectedId));

  // Enhanced handover function with history
  const handleHandover = () => {
    const amountToDeduct = Number(handoverAmount);
    if (!selected) {
      setError("Please select a delivery man first.");
      return;
    }
    if (amountToDeduct <= 0 || isNaN(amountToDeduct)) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }
    if (amountToDeduct > selected.TotalCash) {
      setError(`Handover amount (${amountToDeduct}₹) cannot exceed Total Cash (${selected.TotalCash}₹).`);
      return;
    }
    
    setError("");
    setSuccessMessage("");
    
    const updatedList = list.map(item => 
      item.DeliveryManID === selected.DeliveryManID
        ? { ...item, TotalCash: item.TotalCash - amountToDeduct }
        : item
    );

    // Add to handover history
    const historyEntry = {
      id: Date.now(),
      deliveryManId: selected.DeliveryManID,
      deliveryManName: selected.Name,
      amount: amountToDeduct,
      date: new Date().toLocaleString(),
      previousBalance: selected.TotalCash,
      newBalance: selected.TotalCash - amountToDeduct
    };

    setHandoverHistory(prev => [historyEntry, ...prev]);
    setList(updatedList);
    setHandoverAmount("");
    setQuickAmount("");
    setSuccessMessage(`✅ Successfully handed over ₹${amountToDeduct.toFixed(2)} from ${selected.Name}.`);

    setTimeout(() => setSuccessMessage(""), 5000);
  };

  // Quick handover amounts
  const handleQuickAmount = (percentage) => {
    if (!selected) return;
    const amount = (selected.TotalCash * percentage) / 100;
    setHandoverAmount(amount.toFixed(2));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedId("");
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Export data
  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Total Cash', 'Phone', 'Area'];
    const csvData = filteredAndSortedList.map(item => [
      item.DeliveryManID,
      item.Name,
      item.TotalCash,
      item.Phone,
      item.Area
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-men-cash-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCash = filteredAndSortedList.reduce((sum, item) => sum + item.TotalCash, 0);
    const averageCash = filteredAndSortedList.length > 0 ? totalCash / filteredAndSortedList.length : 0;
    const highestCash = Math.max(...filteredAndSortedList.map(item => item.TotalCash));
    const lowestCash = Math.min(...filteredAndSortedList.map(item => item.TotalCash));

    return { totalCash, averageCash, highestCash, lowestCash };
  }, [filteredAndSortedList]);

  const clearSelection = () => {
    setSelectedId("");
    setHandoverAmount("");
    setError("");
    setSuccessMessage("");
    setQuickAmount("");
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <>
      <div className="container-scroller">
        <UserSideBar />
        <div className="container-fluid page-body-wrapper">
          <UserNavbar />
          <main className={styles.mainContent}>
            <div className={styles.container}>
              {/* Header Section */}
              <div className={styles.headerSection}>
                <h1 className={styles.title}>
                  <span className={styles.titleIcon}>🚚</span>
                  Delivery Men Cash Management
                </h1>
                <div className={styles.headerActions}>
                  <button 
                    className={styles.exportButton}
                    onClick={exportToCSV}
                    disabled={filteredAndSortedList.length === 0}
                  >
                    📊 Export CSV
                  </button>
                  <button 
                    className={styles.historyButton}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? '📋 Hide History' : '📋 Show History'}
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>👥</div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>{filteredAndSortedList.length}</span>
                    <span className={styles.statLabel}>Total Delivery Men</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>💰</div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>₹{stats.totalCash.toLocaleString()}</span>
                    <span className={styles.statLabel}>Total Cash</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📊</div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>₹{stats.averageCash.toFixed(0)}</span>
                    <span className={styles.statLabel}>Average Cash</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>⭐</div>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>₹{stats.highestCash.toLocaleString()}</span>
                    <span className={styles.statLabel}>Highest Cash</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className={styles.errorMessage}>
                  <span className={styles.messageIcon}>⚠️</span>
                  {error}
                </div>
              )}
              {successMessage && (
                <div className={styles.successMessage}>
                  <span className={styles.messageIcon}>✅</span>
                  {successMessage}
                </div>
              )}
              {loading && (
                <div className={styles.loadingMessage}>
                  <span className={styles.messageIcon}>⏳</span>
                  Loading delivery data...
                </div>
              )}

              {/* Handover History Modal */}
              {showHistory && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modal}>
                    <div className={styles.modalHeader}>
                      <h3>💰 Handover History</h3>
                      <button 
                        className={styles.modalClose}
                        onClick={() => setShowHistory(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.modalContent}>
                      {handoverHistory.length === 0 ? (
                        <div className={styles.emptyHistory}>
                          <span className={styles.emptyIcon}>📭</span>
                          <p>No handover history yet</p>
                        </div>
                      ) : (
                        <div className={styles.historyList}>
                          {handoverHistory.map(entry => (
                            <div key={entry.id} className={styles.historyItem}>
                              <div className={styles.historyInfo}>
                                <strong>{entry.deliveryManName}</strong>
                                <span>₹{entry.amount.toFixed(2)}</span>
                              </div>
                              <div className={styles.historyMeta}>
                                <span>{entry.date}</span>
                                <span>Balance: ₹{entry.previousBalance} → ₹{entry.newBalance}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Controls Section */}
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

                <div className={styles.dateGroup}>
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
                </div>
                
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
                    onClick={clearAllFilters}
                  >
                    🗑️ Clear Filters
                  </button>
                </div>
              </div>

              {/* Main Data Grid */}
              <div className={styles.dataGrid}>
                {/* Enhanced Table */}
                <div className={styles.tableSection}>
                  <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>
                      📋 Delivery Men List 
                      <span className={styles.tableCount}>({filteredAndSortedList.length})</span>
                    </h3>
                    <div className={styles.tableActions}>
                      <span className={styles.sortInfo}>
                        Sorted by: {sortConfig.key || 'None'} {getSortIcon(sortConfig.key)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th onClick={() => handleSort('DeliveryManID')} className={styles.sortableHeader}>
                            ID {getSortIcon('DeliveryManID')}
                          </th>
                          <th onClick={() => handleSort('Name')} className={styles.sortableHeader}>
                            Name {getSortIcon('Name')}
                          </th>
                          <th onClick={() => handleSort('Area')} className={styles.sortableHeader}>
                            Area {getSortIcon('Area')}
                          </th>
                          <th 
                            onClick={() => handleSort('TotalCash')} 
                            className={`${styles.cashHeader} ${styles.sortableHeader}`}
                          >
                            Total Cash (₹) {getSortIcon('TotalCash')}
                          </th>
                          <th className={styles.actionHeader}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedList.map((item) => {
                          const active = String(item.DeliveryManID) === String(selectedId);
                          const cashLevel = item.TotalCash > 3000 ? 'high' : item.TotalCash > 1000 ? 'medium' : 'low';

                          return (
                            <tr
                              key={item.DeliveryManID}
                              className={`${styles.tableRow} ${active ? styles.rowActive : ''} ${styles[cashLevel + 'Cash']}`}
                              onClick={() => setSelectedId(item.DeliveryManID)}
                            >
                              <td className={styles.idCell}>
                                <span className={styles.idBadge}>#{item.DeliveryManID}</span>
                              </td>
                              <td className={styles.nameCell}>
                                <div className={styles.nameWrapper}>
                                  <div className={styles.avatar}>
                                    {item.Name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <div className={styles.name}>{item.Name}</div>
                                    <div className={styles.phone}>{item.Phone}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={styles.areaCell}>{item.Area}</td>
                              <td className={`${styles.amount} ${styles[cashLevel + 'Amount']}`}>
                                <div className={styles.amountWrapper}>
                                  <span className={styles.currency}>₹</span>
                                  {item.TotalCash.toLocaleString()}
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

                {/* Enhanced Detail Card */}
                <div className={styles.detailCard}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <span className={styles.cardIcon}>👤</span>
                      Delivery Man Details
                    </h2>
                    {selected && (
                      <button
                        className={styles.clearButton}
                        onClick={clearSelection}
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {!selected ? (
                    <div className={styles.cardEmpty}>
                      <div className={styles.emptyIcon}>👉</div>
                      <p>Select a delivery man to view details</p>
                      <small>Click on any row in the table</small>
                    </div>
                  ) : (
                    <div className={styles.cardBody}>
                      <div className={styles.profileSection}>
                        <div className={styles.avatarLarge}>
                          {selected.Name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className={styles.profileInfo}>
                          <h3 className={styles.profileName}>{selected.Name}</h3>
                          <p className={styles.profileMeta}>ID: #{selected.DeliveryManID}</p>
                          <p className={styles.profileMeta}>{selected.Phone}</p>
                          <p className={styles.profileMeta}>📍 {selected.Area}</p>
                        </div>
                      </div>

                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Current Balance</span>
                          <span className={`${styles.detailValue} ${styles.cashValue}`}>
                            ₹{selected.TotalCash.toLocaleString()}
                          </span>
                        </div>

                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Status</span>
                          <span className={`${styles.detailValue} ${styles.statusBadge} ${
                            selected.TotalCash > 3000 ? styles.highStatus : 
                            selected.TotalCash > 1000 ? styles.mediumStatus : 
                            styles.lowStatus
                          }`}>
                            {selected.TotalCash > 3000 ? 'High Cash' : 
                             selected.TotalCash > 1000 ? 'Medium Cash' : 
                             'Low Cash'}
                          </span>
                        </div>
                      </div>

                      {/* Enhanced Handover Section */}
                      <div className={styles.handoverSection}>
                        <div className={styles.handoverHeader}>
                          <h4>💰 Cash Handover</h4>
                          <div className={styles.quickAmounts}>
                            <span>Quick Select:</span>
                            {[25, 50, 75, 100].map(percent => (
                              <button
                                key={percent}
                                className={styles.quickAmountButton}
                                onClick={() => handleQuickAmount(percent)}
                              >
                                {percent}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={styles.amountInputGroup}>
                          <label className={styles.label} htmlFor="handoverAmount">
                            Amount to Handover (₹)
                          </label>
                          <input
                            id="handoverAmount"
                            type="number"
                            placeholder="0.00"
                            className={styles.handoverInput}
                            value={handoverAmount}
                            onChange={(e) => setHandoverAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            max={selected.TotalCash}
                          />
                          <div className={styles.amountHint}>
                            Available: ₹{selected.TotalCash.toLocaleString()}
                          </div>
                        </div>

                        {handoverAmount && (
                          <div className={styles.previewSection}>
                            <div className={styles.previewRow}>
                              <span>Current Balance:</span>
                              <span>₹{selected.TotalCash.toLocaleString()}</span>
                            </div>
                            <div className={styles.previewRow}>
                              <span>Handover Amount:</span>
                              <span className={styles.deductAmount}>- ₹{Number(handoverAmount).toLocaleString()}</span>
                            </div>
                            <div className={styles.previewRow}>
                              <span>New Balance:</span>
                              <span className={styles.newBalance}>
                                ₹{(selected.TotalCash - Number(handoverAmount)).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          className={styles.handoverButton}
                          onClick={handleHandover}
                          disabled={!handoverAmount || Number(handoverAmount) > selected.TotalCash || Number(handoverAmount) <= 0}
                        >
                          💸 Confirm Handover
                        </button>
                      </div>

                      <div className={styles.cardActions}>
                        <button className={styles.secondaryButton}>
                          📞 Contact
                        </button>
                        <button className={styles.secondaryButton}>
                          📊 Full Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}