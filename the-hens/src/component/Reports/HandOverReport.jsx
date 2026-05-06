import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHandoverReport } from "../../features/reportSlice";
import { fetchDeliveryMen } from "../../features/assignedOrderSlice";
import styles from "./HandoverReport.module.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  FaFileExcel,
  FaFilter,
  FaRupeeSign,
  FaUserTie,
  FaCalendarAlt,
  FaSyncAlt,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaMoneyBillWave,
} from "react-icons/fa";
import { MdAttachMoney } from "react-icons/md";
import UserSideBar from "../user/UserSidebar";
import UserNavbar from "../user/UserNavBar";

const HandoverReport = () => {
  const dispatch = useDispatch();
  const { handoverData, loading, error } = useSelector((state) => state.report);
  const { deliveryMen } = useSelector((state) => state.assignedOrders);

  // State for filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const rowsPerPage = 10;

  useEffect(() => {
    dispatch(fetchHandoverReport());
    dispatch(fetchDeliveryMen());
  }, [dispatch]);

  // Helper function to format date for comparison
  const formatDateForComparison = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  // Filter Logic with search and date ranges
  const filteredData = useMemo(() => {
    return handoverData.filter((item) => {
      const itemDate = formatDateForComparison(item.HandOverDate);
      const deliveryMatch =
        selectedDeliveryBoy === "all" || item.Name === selectedDeliveryBoy;

      let dateMatch = true;
      if (fromDate && toDate) {
        dateMatch = itemDate >= fromDate && itemDate <= toDate;
      } else if (fromDate) {
        dateMatch = itemDate >= fromDate;
      } else if (toDate) {
        dateMatch = itemDate <= toDate;
      }

      const searchMatch = searchTerm
        ? item.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.Area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.MobileNo?.includes(searchTerm)
        : true;

      return deliveryMatch && dateMatch && searchMatch;
    });
  }, [handoverData, selectedDeliveryBoy, fromDate, toDate, searchTerm]);

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export to Excel with enhanced formatting
  const exportToExcel = () => {
    const formattedData = filteredData.map((item) => ({
      "Delivery Boy": item.Name,
      Area: item.Area,
      Mobile: item.MobileNo,
      "Total Amount (₹)": item.TotalHandoverAmount,
      "Handover Date": new Date(item.HandOverDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      Denomination: item.DenominationJSON,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Handover Report");

    // Auto-size columns
    const maxWidth = Object.keys(formattedData[0] || {}).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...formattedData.map((row) => String(row[key] || "").length),
        ) + 2,
    }));
    worksheet["!cols"] = maxWidth;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      fileData,
      `Cash_Handover_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Calculate statistics
  const totalHandoverAmount = filteredData.reduce(
    (total, item) => total + Number(item.TotalHandoverAmount || 0),
    0,
  );
  const uniqueDeliveryBoys = new Set(filteredData.map((item) => item.Name))
    .size;
  const averageAmount = filteredData.length
    ? totalHandoverAmount / filteredData.length
    : 0;

  // Reset all filters
  const resetFilters = () => {
    setSelectedDeliveryBoy("all");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Quick date shortcuts
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
    setCurrentPage(1);
  };

  const setThisWeek = () => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(
      today.setDate(today.getDate() - today.getDay() + 6),
    );
    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  return (
    <div className="d-flex">
      <UserSideBar />
      <div className="flex-grow-1">
        <UserNavbar />
        <div className={styles.container}>
          {/* Hero Header */}
          <div className={styles.heroSection}>
            <div className={styles.headerContent}>
              <h1 className={styles.mainHeading}>
                <FaMoneyBillWave className={styles.headerIcon} />
                Cash Handover Report
              </h1>
              <p className={styles.subtitle}>
                Track and manage delivery cash handovers efficiently
              </p>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.exportBtn} onClick={exportToExcel}>
                <FaFileExcel /> Export to Excel
              </button>
              <button
                className={styles.filterToggle}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter /> {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FaRupeeSign />
              </div>
              <div className={styles.statInfo}>
                <h3>Total Handover</h3>
                <p>₹{totalHandoverAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FaUserTie />
              </div>
              <div className={styles.statInfo}>
                <h3>Delivery Boys</h3>
                <p>{uniqueDeliveryBoys}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FaCalendarAlt />
              </div>
              <div className={styles.statInfo}>
                <h3>Total Transactions</h3>
                <p>{filteredData.length}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <MdAttachMoney />
              </div>
              <div className={styles.statInfo}>
                <h3>Average Amount</h3>
                <p>₹{averageAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className={styles.filtersCard}>
              <div className={styles.filtersGrid}>
                <div className={styles.filterGroup}>
                  <label>
                    <FaSearch /> Search Delivery Boy / Area
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, area or mobile..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <label>
                    <FaUserTie /> Delivery Boy
                  </label>
                  <select
                    value={selectedDeliveryBoy}
                    onChange={(e) => {
                      setSelectedDeliveryBoy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={styles.selectInput}
                  >
                    <option value="all">All Delivery Boys</option>
                    {deliveryMen.map((boy) => (
                      <option key={boy.DeliveryManID} value={boy.Name}>
                        {boy.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>
                    <FaCalendarAlt /> Date Range
                  </label>
                  <div className={styles.dateRange}>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={styles.dateInput}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateShortcuts}>
                    <button onClick={setToday}>Today</button>
                    <button onClick={setThisWeek}>This Week</button>
                    <button onClick={setThisMonth}>This Month</button>
                  </div>
                </div>
              </div>
              <div className={styles.filterActions}>
                <button className={styles.resetBtn} onClick={resetFilters}>
                  <FaSyncAlt /> Reset All Filters
                </button>
              </div>
            </div>
          )}

          {/* Loading and Error States */}
          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading handover data...</p>
            </div>
          )}
          {error && (
            <div className={styles.errorState}>
              <p>⚠️ Error loading data. Please try again.</p>
            </div>
          )}

          {/* Data Table */}
          {!loading && !error && (
            <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Delivery Boy</th>
                      <th>Area</th>
                      <th>Mobile</th>
                      <th>Total Amount</th>
                      <th>Handover Date</th>
                      <th>Denomination Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.length > 0 ? (
                      currentData.map((item, index) => (
                        <tr key={index}>
                          <td>{indexOfFirstRow + index + 1}</td>
                          <td>
                            <div className={styles.deliveryBoyCell}>
                              <div className={styles.avatar}>
                                {item.Name?.charAt(0) || "D"}
                              </div>
                              <span className={styles.boyName}>
                                {item.Name}
                              </span>
                            </div>
                          </td>
                          <td>{item.Area || "—"}</td>
                          <td>{item.MobileNo || "—"}</td>
                          <td className={styles.amountCell}>
                            <span className={styles.amount}>
                              ₹
                              {Number(item.TotalHandoverAmount).toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </td>
                          <td>
                            {new Date(item.HandOverDate).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className={styles.denominationCell}>
                            <span className={styles.denominationBadge}>
                              {item.DenominationJSON || "No data"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className={styles.noData}>
                          <div className={styles.noDataContent}>
                            <FaSearch size={40} />
                            <p>No handover records found</p>
                            <button onClick={resetFilters}>
                              Clear Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.paginationWrapper}>
                  <div className={styles.paginationInfo}>
                    Showing {indexOfFirstRow + 1} to{" "}
                    {Math.min(indexOfLastRow, filteredData.length)} of{" "}
                    {filteredData.length} entries
                  </div>
                  <div className={styles.pagination}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={styles.pageNav}
                    >
                      <FaChevronLeft />
                    </button>
                    <div className={styles.pageNumbers}>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={
                                currentPage === pageNum ? styles.activePage : ""
                              }
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span>...</span>
                          <button onClick={() => handlePageChange(totalPages)}>
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={styles.pageNav}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandoverReport;
