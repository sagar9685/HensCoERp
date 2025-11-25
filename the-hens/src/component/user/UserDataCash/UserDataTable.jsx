import React, { useEffect, useState, useMemo } from "react";
import UserSideBar from "../UserSidebar";
import UserNavbar from "../UserNavBar";
import ExcelReport from "../../CashExcelReport"; // Your existing ExcelReport component
import Invoice from "./Invoice";
import DeliveryManDetails from "./DeliveryManDetails";
import FilterSection from "./FilterSection";
import DeliveryMenList from "./DeliveryMenList";
import styles from "./UserDataTable.module.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchCashByDeliveryMen } from "../../../features/assignedOrderSlice";
import { addDenomination, handoverCash,clearMessages } from "../../../features/denominationSlice";

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const calculateTotalFromDenominations = (denominations) => {
  return DENOMINATIONS.reduce((total, value) => {
    const count = Number(denominations[value]) || 0; // NaN se 0
    return total + (value * count);
  }, 0);
};





export default function UserDataTable() {
    const [list, setList] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showInvoice, setShowInvoice] = useState(false);
    

    const [manualDenominations, setManualDenominations] = useState(
        DENOMINATIONS.reduce((acc, note) => ({ ...acc, [note]: "" }), {})
    );

    const totalHandoverAmount = useMemo(() => 
        calculateTotalFromDenominations(manualDenominations)
    , [manualDenominations]);
    
    const [successMessage, setSuccessMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [handoverHistory, setHandoverHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const dispatch = useDispatch()
    const { loading: dLoading, success: dSuccess, error: dError } = useSelector(
            (state) => state.denomination
                );

                useEffect(() => {
                if (dSuccess) {
                    setSuccessMessage(dSuccess);
                    setTimeout(() => dispatch(clearMessages()), 3000);
                }
                if (dError) {
                    setError(dError);
                    setTimeout(() => dispatch(clearMessages()), 3000);
                }
                }, [dSuccess, dError]);
   
      
    const {cashList}  = useSelector((state) => state.assignedOrders);
    console.log('deliveryMen come from cash dep',cashList)

    useEffect(()=> {
    dispatch(fetchCashByDeliveryMen());
    },[dispatch])

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setList(cashList);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [cashList]);

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

    const handleNoteCountChange = (noteValue, count) => {
        const parsedCount = parseInt(count, 10);
        setManualDenominations(prev => ({
            ...prev,
            [noteValue]: isNaN(parsedCount) || parsedCount < 0 ? "" : parsedCount,
        }));
        setError("");
        setSuccessMessage("");
    };

    const handleQuickAmount = (percentage) => {
        if (!selected) return;
        const amount = (selected.TotalCash * percentage) / 100;
        const finalAmount = Math.floor(amount);

        const autoNotes = {};
        let remaining = finalAmount;

        DENOMINATIONS.forEach(noteValue => {
            if (remaining >= noteValue) {
                const count = Math.floor(remaining / noteValue);
                autoNotes[noteValue] = count;
                remaining -= count * noteValue;
            } else {
                 autoNotes[noteValue] = "";
            }
        });

        setManualDenominations(autoNotes);
        setError("");
        setSuccessMessage(`Quick select: ₹${finalAmount.toLocaleString()} calculated and notes populated.`);
    };

const handleHandover = () => {
  if (!selected) {
    setError("Please select a delivery man first.");
    return;
  }
  if (totalHandoverAmount <= 0) {
    setError("Please enter note counts to calculate total.");
    return;
  }
  if (totalHandoverAmount > selected.TotalCash) {
    setError("Amount exceeds current balance.");
    return;
  }

  const denominationsToSend = {};
  DENOMINATIONS.forEach(note => {
    const count = manualDenominations[note];
    if (count && count > 0) denominationsToSend[note] = Number(count);
  });

  const payload = {
    deliveryManId: Number(selected.DeliveryManID),
    totalHandoverAmount: Number(totalHandoverAmount),
    denominationJSON: denominationsToSend,
    orderPaymentIds: []
  };

  // 🔥 Dispatch and wait
  dispatch(handoverCash(payload))
    .unwrap()
    .then((res) => {
      const updatedBalance = res.updatedBalance;

      // 🔥 Update UI with updatedBalance from backend
      setList(prev =>
        prev.map(item =>
          item.DeliveryManID === selected.DeliveryManID
            ? { ...item, TotalCash: updatedBalance }
            : item
        )
      );

      // Reset UI
      setManualDenominations(
        DENOMINATIONS.reduce((acc, note) => ({ ...acc, [note]: "" }), {})
      );

      setSuccessMessage(`Handover ₹${totalHandoverAmount} successful.`);
    })
    .catch((err) => {
      setError(err.message || "Handover failed");
    });
};



    const clearSelection = () => {
        setSelectedId("");
        setError("");
        setSuccessMessage("");
        setManualDenominations(
            DENOMINATIONS.reduce((acc, note) => ({ ...acc, [note]: "" }), {})
        );
    };
    
    const clearAllFilters = () => {
        setSearchTerm("");
        setFromDate("");
        setToDate("");
        setSelectedId("");
        setSortConfig({ key: null, direction: 'asc' });
    };

    const stats = useMemo(() => {
        const totalCash = filteredAndSortedList.reduce((sum, item) => sum + item.TotalCash, 0);
        const averageCash = filteredAndSortedList.length > 0 ? totalCash / filteredAndSortedList.length : 0;
        const highestCash = Math.max(...filteredAndSortedList.map(item => item.TotalCash));
        const lowestCash = Math.min(...filteredAndSortedList.map(item => item.TotalCash));

        return { totalCash, averageCash, highestCash, lowestCash };
    }, [filteredAndSortedList]);

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
  <ExcelReport 
    filteredAndSortedList={filteredAndSortedList}
    fileName="my-report.xlsx"
  >
    <button className={styles.downloadButton}>
      📊 Download Excel
    </button>
  </ExcelReport>
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

                            {/* Filter Section */}
                            <FilterSection
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                fromDate={fromDate}
                                setFromDate={setFromDate}
                                toDate={toDate}
                                setToDate={setToDate}
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                list={list}
                                onClearAllFilters={clearAllFilters}
                            />

                            {/* Main Data Grid */}
                            <div className={styles.dataGrid}>
                                {/* Delivery Men List */}
                                <DeliveryMenList
                                    filteredAndSortedList={filteredAndSortedList}
                                    selectedId={selectedId}
                                    setSelectedId={setSelectedId}
                                    sortConfig={sortConfig}
                                    handleSort={handleSort}
                                    getSortIcon={getSortIcon}
                                    loading={loading}
                                />

                                {/* Delivery Man Details */}
                               <DeliveryManDetails
    selected={selected}
    manualDenominations={manualDenominations}
    totalHandoverAmount={totalHandoverAmount}
    onNoteCountChange={handleNoteCountChange}
    onQuickAmount={handleQuickAmount}
    onHandover={handleHandover}
    onClearSelection={clearSelection}
    onGenerateInvoice={() => setShowInvoice(true)} 
     dLoading={dLoading}   // <-- Add this
/>


                            </div>

                            {/* Invoice Component */}
                           {showInvoice && (
    <Invoice
        selected={selected}
        manualDenominations={manualDenominations}
        totalHandoverAmount={totalHandoverAmount}
        onClose={() => setShowInvoice(false)}
    />
)}

                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}