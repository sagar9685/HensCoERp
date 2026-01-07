import Header from "./Header";
import styles from "./Customer.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useMemo } from "react";
import {
  fetchArea,
  fetchCustomerName,
  updateCustomer,
} from "../features/cutomerSlice";
import AddCustomerModal from "./AddCustomerModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faEdit,
  faUser,
  faMapMarkerAlt,
  faPhone,
  faBuilding,
  faTimes,
  faPlus,
  faCheck,
  faFilter,
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";

function Customer() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterArea, setFilterArea] = useState("all");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const {
    customerName = [],
    isLoading,
    error,
    areaData = [],
  } = useSelector((state) => state.customer);

  useEffect(() => {
    dispatch(fetchCustomerName());
    dispatch(fetchArea());
  }, [dispatch]);

  useEffect(() => {
    // Reset to first page when search or filter changes
    setCurrentPage(1);
  }, [searchTerm, filterArea]);

  const handleEditClick = (customer) => {
    setEditingCustomer(customer.CustomerId);
    setEditForm({
      CustomerName: customer.CustomerName || "",
      Address: customer.Address || "",
      Contact_No: customer.Contact_No || "",
      Area: customer.Area || "",
      Pincode: customer.Pincode || "",
      Gst_No: customer.Gst_No || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = (customerId) => {
    dispatch(updateCustomer({ id: customerId, data: editForm }));
    setEditingCustomer(null);
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
  };

  // Optimized filtering logic
  const filteredCustomers = useMemo(() => {
    return customerName.filter((customer) => {
      const name = customer.CustomerName?.toLowerCase() || "";
      const area = customer.Area?.toLowerCase() || "";
      const contact = customer.Contact_No || "";
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        name.includes(search) ||
        area.includes(search) ||
        contact.includes(search);
      const matchesFilter =
        filterArea === "all" || customer.Area === filterArea;

      return matchesSearch && matchesFilter;
    });
  }, [customerName, searchTerm, filterArea]);

  const areas = useMemo(
    () => [...new Set(customerName.map((c) => c.Area))],
    [customerName]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show first page, last page, and pages around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the start
      if (currentPage <= 2) {
        startPage = 2;
        endPage = 4;
      }
      // Adjust if we're at the end
      else if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
        endPage = totalPages - 1;
      }

      pageNumbers.push(1);
      if (startPage > 2) pageNumbers.push("...");

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) pageNumbers.push("...");
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Loading logic changed: Only show full screen loader if no data exists
  if (isLoading && customerName.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  if (error && customerName.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Customers</h2>
        <p>{error}</p>
        <button
          onClick={() => dispatch(fetchCustomerName())}
          className={styles.retryBtn}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>
            <FontAwesomeIcon icon={faUser} className={styles.titleIcon} />
            Customer Management
          </h1>
          <p className={styles.subtitle}>
            Manage your customer information efficiently
          </p>
        </div>

        <div className={styles.controlsSection}>
          <div className={styles.searchContainer}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search customers by name, area, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Areas</option>
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={styles.addButton}
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <FontAwesomeIcon icon={faPlus} /> Add New Customer
            </button>
          </div>
        </div>

        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <FontAwesomeIcon icon={faUser} className={styles.statIcon} />
            <div className={styles.statContent}>
              <h3>{customerName.length}</h3>
              <p>Total Customers</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <FontAwesomeIcon icon={faBuilding} className={styles.statIcon} />
            <div className={styles.statContent}>
              <h3>{areas.length}</h3>
              <p>Areas Covered</p>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className={styles.resultsInfo}>
          <p>
            Showing{" "}
            <span className={styles.highlight}>
              {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)}
            </span>
            of{" "}
            <span className={styles.highlight}>{filteredCustomers.length}</span>{" "}
            customers
            {searchTerm && ` for "${searchTerm}"`}
            {filterArea !== "all" && ` in ${filterArea}`}
          </p>
        </div>

        <div className={styles.customersGrid}>
          {currentCustomers.map((customer) => (
            <div key={customer.CustomerId} className={styles.customerCard}>
              {editingCustomer === customer.CustomerId ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    name="CustomerName"
                    value={editForm.CustomerName}
                    onChange={handleEditChange}
                    className={styles.editInput}
                    placeholder="Customer Name"
                  />
                  <input
                    type="text"
                    name="Address"
                    value={editForm.Address}
                    onChange={handleEditChange}
                    className={styles.editInput}
                    placeholder="Address"
                  />
                  <input
                    type="tel"
                    name="Contact_No"
                    value={editForm.Contact_No}
                    onChange={handleEditChange}
                    className={styles.editInput}
                    placeholder="Phone Number"
                  />
                  <input
                    type="text"
                    name="Pincode"
                    value={editForm.Pincode}
                    onChange={handleEditChange}
                    className={styles.editInput}
                    placeholder="Pincode"
                  />
                  <input
                    type="text"
                    name="Gst_No"
                    value={editForm.Gst_No}
                    onChange={handleEditChange}
                    className={styles.editInput}
                    placeholder="GST Number"
                  />
                  <select
                    name="Area"
                    value={editForm.Area}
                    onChange={handleEditChange}
                    className={styles.editInput}
                  >
                    <option value="">Select Area</option>
                    {Array.isArray(areaData) &&
                      areaData.map((area) => (
                        <option key={area.areaId} value={area.areaName}>
                          {area.areaName}
                        </option>
                      ))}
                  </select>
                  <div className={styles.editActions}>
                    <button
                      onClick={() => handleSaveEdit(customer.CustomerId)}
                      className={styles.saveBtn}
                    >
                      <FontAwesomeIcon icon={faCheck} /> Update
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={styles.cancelBtn}
                    >
                      <FontAwesomeIcon icon={faTimes} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.cardHeader}>
                    <div className={styles.customerAvatar}>
                      {customer.CustomerName?.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.customerInfo}>
                      <h3 className={styles.customerName}>
                        {customer.CustomerName}
                      </h3>
                      <span className={styles.customerId}>
                        ID: {customer.CustomerId}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => handleEditClick(customer)}
                        className={styles.editBtn}
                        title="Edit"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon
                        icon={faMapMarkerAlt}
                        className={styles.detailIcon}
                      />
                      <div>
                        <p className={styles.detailLabel}>Address</p>
                        <p className={styles.detailValue}>{customer.Address}</p>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon
                        icon={faPhone}
                        className={styles.detailIcon}
                      />
                      <div>
                        <p className={styles.detailLabel}>Phone</p>
                        <p className={styles.detailValue}>
                          {customer.Contact_No}
                        </p>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon
                        icon={faBuilding}
                        className={styles.detailIcon}
                      />
                      <div>
                        <p className={styles.detailLabel}>Area</p>
                        <p className={styles.detailValue}>
                          <span className={styles.areaBadge}>
                            {customer.Area}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && !isLoading && (
          <div className={styles.noResults}>
            <FontAwesomeIcon icon={faUser} className={styles.noResultsIcon} />
            <h3>No customers found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Pagination Component - Only show if there are more than itemsPerPage */}
        {filteredCustomers.length > itemsPerPage && (
          <div className={styles.paginationContainer}>
            <div className={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </div>

            <div className={styles.paginationControls}>
              <button
                className={styles.paginationButton}
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                title="First Page"
              >
                <FontAwesomeIcon icon={faAngleDoubleLeft} />
              </button>

              <button
                className={styles.paginationButton}
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className={styles.pageNumbers}>
                {getPageNumbers().map((pageNum, index) =>
                  pageNum === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className={styles.pageEllipsis}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      className={`${styles.pageButton} ${
                        currentPage === pageNum ? styles.activePage : ""
                      }`}
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>

              <button
                className={styles.paginationButton}
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>

              <button
                className={styles.paginationButton}
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                title="Last Page"
              >
                <FontAwesomeIcon icon={faAngleDoubleRight} />
              </button>
            </div>

            <div className={styles.itemsPerPageSelector}>
              <span>Show: </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {}}
                className={styles.pageSizeSelect}
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal Component integrate kiya */}
      <AddCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
    </>
  );
}

export default Customer;
