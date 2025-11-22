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

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const calculateTotalFromDenominations = (denominations) => {
    return DENOMINATIONS.reduce((total, value) => {
        const count = denominations[value] || 0;
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
        const amountToDeduct = totalHandoverAmount;
        
        if (!selected) {
            setError("Please select a delivery man first.");
            return;
        }
        if (amountToDeduct <= 0) {
            setError("Please enter a total handover amount greater than zero by adjusting note counts.");
            return;
        }
        if (amountToDeduct > selected.TotalCash) {
            setError(`Handover total (${amountToDeduct}₹) cannot exceed Total Cash (${selected.TotalCash}₹).`);
            return;
        }
        
        setError("");
        setSuccessMessage("");
        
        const updatedList = list.map(item => 
            item.DeliveryManID === selected.DeliveryManID
                ? { ...item, TotalCash: item.TotalCash - amountToDeduct }
                : item
        );

        const historyEntry = {
            id: Date.now(),
            deliveryManId: selected.DeliveryManID,
            deliveryManName: selected.Name,
            amount: amountToDeduct,
            date: new Date().toLocaleString(),
            previousBalance: selected.TotalCash,
            newBalance: selected.TotalCash - amountToDeduct,
            notesHandedOver: DENOMINATIONS.map(note => ({ 
                value: note, 
                count: manualDenominations[note] || 0 
            })).filter(n => n.count > 0)
        };

        setHandoverHistory(prev => [historyEntry, ...prev]);
        setList(updatedList);
        
        setManualDenominations(
            DENOMINATIONS.reduce((acc, note) => ({ ...acc, [note]: "" }), {})
        );
        
        setSuccessMessage(`✅ Successfully handed over ₹${amountToDeduct.toFixed(2)} from ${selected.Name} using specified notes.`);
        
        setTimeout(() => setSuccessMessage(""), 5000);

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
    onGenerateInvoice={() => setShowInvoice(true)}   // <-- Add this
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