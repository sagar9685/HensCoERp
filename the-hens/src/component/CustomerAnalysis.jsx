import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWeekWise,
  fetchMonthWise,
  fetchYearWise,
} from "../features/customerAnalysisSlice";
import styles from "./CustomerAnalysis.module.css";
import Header from "./Header";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  Calendar,
  TrendingUp,
  Users,
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const CustomerAnalysis = () => {
  const dispatch = useDispatch();
  const { weekWise, monthWise, yearWise, loading } = useSelector(
    (state) => state.customerAnalysis
  );

  const [type, setType] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (type === "week") dispatch(fetchWeekWise());
    if (type === "month") dispatch(fetchMonthWise());
    if (type === "year") dispatch(fetchYearWise());
  }, [type, dispatch]);

  const data =
    type === "week" ? weekWise : type === "month" ? monthWise : yearWise;

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = data.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.CustomerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.OrderYear.toString().includes(searchQuery);

      const matchesYear =
        filterYear === "" || item.OrderYear.toString() === filterYear;

      return matchesSearch && matchesYear;
    });

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, filterYear, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = useMemo(() => {
    return filteredData.slice(indexOfFirstRow, indexOfLastRow);
  }, [filteredData, indexOfFirstRow, indexOfLastRow]);

  // Get unique years for filter
  const uniqueYears = useMemo(() => {
    const years = new Set(data.map((item) => item.OrderYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  // Page number generation
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (startPage > 1) {
        if (startPage > 2) pageNumbers.unshift("...");
        pageNumbers.unshift(1);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Analysis");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Save file
    saveAs(
      dataBlob,
      `customer_analysis_${type}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const getTypeStats = () => {
    const totalOrders = filteredData.reduce(
      (sum, item) => sum + item.TotalOrders,
      0
    );
    const uniqueCustomers = new Set(
      filteredData.map((item) => item.CustomerName)
    ).size;

    return { totalOrders, uniqueCustomers };
  };

  const stats = getTypeStats();

  // Handle pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when rows per page changes
  };

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterYear, type]);

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Customer Order Frequency Analysis</h1>
            <p className={styles.subtitle}>
              Track customer purchasing patterns over time
            </p>
          </div>

          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={24} />
              </div>
              <div>
                <h3>{stats.uniqueCustomers}</h3>
                <p>Total Customers</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h3>{stats.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                type === "week" ? styles.active : ""
              }`}
              onClick={() => setType("week")}
            >
              <Calendar size={16} />
              Week Wise
            </button>
            <button
              className={`${styles.tab} ${
                type === "month" ? styles.active : ""
              }`}
              onClick={() => setType("month")}
            >
              <TrendingUp size={16} />
              Month Wise
            </button>
            <button
              className={`${styles.tab} ${
                type === "year" ? styles.active : ""
              }`}
              onClick={() => setType("year")}
            >
              <Users size={16} />
              Year Wise
            </button>
          </div>

          <div className={styles.searchExport}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} size={18} />
              <input
                type="text"
                placeholder="Search customers or years..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterContainer}>
              <button
                className={styles.filterToggle}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter size={16} />
                Filter
                <ChevronDown
                  size={16}
                  className={isFilterOpen ? styles.rotate : ""}
                />
              </button>

              {isFilterOpen && (
                <div className={styles.filterDropdown}>
                  <label>Filter by Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="">All Years</option>
                    {uniqueYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button onClick={exportToExcel} className={styles.exportButton}>
              <Download size={18} />
              Export Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading customer data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={48} />
            <h3>No results found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div className={styles.tableTitle}>
                  Showing {indexOfFirstRow + 1} -{" "}
                  {Math.min(indexOfLastRow, filteredData.length)} of{" "}
                  {filteredData.length} records
                </div>
                <div className={styles.rowsPerPageSelector}>
                  <label htmlFor="rowsPerPage">Rows per page:</label>
                  <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    className={styles.rowsPerPageSelect}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("CustomerName")}
                      className={styles.sortable}
                    >
                      Customer {getSortIndicator("CustomerName")}
                    </th>
                    <th
                      onClick={() => handleSort("OrderYear")}
                      className={styles.sortable}
                    >
                      Year {getSortIndicator("OrderYear")}
                    </th>
                    {type === "week" && (
                      <th
                        onClick={() => handleSort("OrderWeek")}
                        className={styles.sortable}
                      >
                        Week {getSortIndicator("OrderWeek")}
                      </th>
                    )}
                    {type === "month" && (
                      <th
                        onClick={() => handleSort("OrderMonth")}
                        className={styles.sortable}
                      >
                        Month {getSortIndicator("OrderMonth")}
                      </th>
                    )}
                    <th
                      onClick={() => handleSort("TotalOrders")}
                      className={styles.sortable}
                    >
                      Total Orders {getSortIndicator("TotalOrders")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? styles.evenRow : ""}
                    >
                      <td className={styles.customerCell}>
                        <div className={styles.customerAvatar}>
                          {row.CustomerName.charAt(0).toUpperCase()}
                        </div>
                        <span>{row.CustomerName}</span>
                      </td>
                      <td>
                        <span className={styles.yearBadge}>
                          {row.OrderYear}
                        </span>
                      </td>
                      {type === "week" && (
                        <td>
                          <span className={styles.weekBadge}>
                            Week {row.OrderWeek}
                          </span>
                        </td>
                      )}
                      {type === "month" && (
                        <td>
                          <span className={styles.monthBadge}>
                            {new Date(0, row.OrderMonth - 1).toLocaleString(
                              "default",
                              { month: "long" }
                            )}
                          </span>
                        </td>
                      )}
                      <td>
                        <div className={styles.orderCount}>
                          <div
                            className={styles.orderBar}
                            style={{
                              width: `${Math.min(
                                (row.TotalOrders /
                                  Math.max(
                                    ...filteredData.map((d) => d.TotalOrders)
                                  )) *
                                  100,
                                100
                              )}%`,
                            }}
                          ></div>
                          <span className={styles.orderNumber}>
                            {row.TotalOrders}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.paginationContainer}>
                <div className={styles.paginationInfo}>
                  Page {currentPage} of {totalPages}
                </div>

                <div className={styles.paginationControls}>
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                    aria-label="First page"
                  >
                    <ChevronsLeft size={16} />
                  </button>

                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {getPageNumbers().map((pageNumber, index) => (
                    <React.Fragment key={index}>
                      {pageNumber === "..." ? (
                        <span className={styles.paginationEllipsis}>...</span>
                      ) : (
                        <button
                          onClick={() => goToPage(pageNumber)}
                          className={`${styles.paginationButton} ${
                            currentPage === pageNumber ? styles.activePage : ""
                          }`}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={
                            currentPage === pageNumber ? "page" : undefined
                          }
                        >
                          {pageNumber}
                        </button>
                      )}
                    </React.Fragment>
                  ))}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                    aria-label="Last page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>

                <div className={styles.jumpToPage}>
                  <label htmlFor="jumpToPageInput">Go to page:</label>
                  <input
                    id="jumpToPageInput"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = Math.max(
                        1,
                        Math.min(totalPages, Number(e.target.value))
                      );
                      goToPage(page);
                    }}
                    className={styles.jumpToPageInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.tableFooter}>
              <div className={styles.resultsInfo}>
                Showing {indexOfFirstRow + 1} -{" "}
                {Math.min(indexOfLastRow, filteredData.length)} of{" "}
                {filteredData.length} records
              </div>
              <div className={styles.downloadInfo}>
                <Download size={14} />
                <span>Data ready for export</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CustomerAnalysis;
