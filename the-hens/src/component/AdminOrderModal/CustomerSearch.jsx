import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaBuilding,
  FaPhoneAlt,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { searchCustomers } from "../../features/cutomerSlice";
import styles from "../AddOrderModal.module.css";
import "./CustomerSearch.css";

const CustomerSearch = ({ formData, setFormData, errors }) => {
  const dispatch = useDispatch();

  const customerSuggestions = useSelector(
    (state) => state.customer.customerSuggestions || [],
  );

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounced customer search
  useEffect(() => {
    const query = searchTerm.trim();

    if (query.length < 3) return;

    const timer = setTimeout(() => {
      dispatch(searchCustomers(query));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Keep active keyboard item visible
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleCustomerNameChange = (e) => {
    const value = e.target.value;

    setSearchTerm(value);
    setSelectedCustomerId(null);
    setActiveIndex(-1);

    setFormData((prev) => ({
      ...prev,
      customerName: value,
      address: "",
      area: "",
      contactNo: "",
      pincode: "",
      alternatePhone: "",
    }));

    setShowSuggestions(value.trim().length >= 3);
  };

  const handleSelectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customerName: cust.CustomerName || "",
      contactNo: cust.Contact_No || "",
      address: cust.Address || "",
      area: cust.Area || "",
      pincode: cust.Pincode || "",
      alternatePhone: cust.Alternate_Phone || "",
    }));

    setSelectedCustomerId(cust.CustomerId);
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setFormData((prev) => ({
      ...prev,
      customerName: "",
      contactNo: "",
      address: "",
      area: "",
      pincode: "",
      alternatePhone: "",
    }));

    setSearchTerm("");
    setSelectedCustomerId(null);
    setShowSuggestions(false);
    setActiveIndex(-1);

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !filteredCustomers.length) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : 0,
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCustomers.length - 1,
      );
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectCustomer(filteredCustomers[activeIndex]);
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  // Display every record returned by the API.
  // Filter stale Redux results while the next search is loading.
  const filteredCustomers =
    searchTerm.trim().length >= 3
      ? customerSuggestions.filter((cust) => {
          const query = searchTerm.trim().toLowerCase();

          return [cust.CustomerName, cust.Area, cust.Address].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
          );
        })
      : [];

  const highlightText = (text, query) => {
    const value = String(text || "");
    const search = query.trim();

    if (!search) return value;

    const index = value.toLowerCase().indexOf(search.toLowerCase());

    if (index === -1) return value;

    return (
      <>
        {value.slice(0, index)}
        <mark className="customer-search-highlight">
          {value.slice(index, index + search.length)}
        </mark>
        {value.slice(index + search.length)}
      </>
    );
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.inputLabel}>
        Customer Name <span className={styles.required}>*</span>
      </label>

      <div className="customer-search-wrapper" ref={wrapperRef}>
        <div
          className={`customer-search-input-container ${
            selectedCustomerId !== null ? "customer-selected" : ""
          }`}
        >
          <FaSearch className="customer-input-search-icon" />

          <input
            ref={inputRef}
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleCustomerNameChange}
            onFocus={() => {
              if (searchTerm.trim().length >= 3) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search customer name..."
            className={styles.inputField}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && filteredCustomers.length > 0}
            aria-autocomplete="list"
            aria-controls="customer-search-results"
          />

          {formData.customerName && (
            <button
              type="button"
              className="customer-clear-button"
              onClick={handleClear}
              aria-label="Clear customer"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {selectedCustomerId !== null && !showSuggestions && (
          <div className="customer-selection-confirmation">
            <FaCheckCircle />
            <span>Customer selected</span>
            {formData.area && (
              <span className="customer-selected-area">
                <FaMapMarkerAlt />
                {formData.area}
              </span>
            )}
          </div>
        )}

        {showSuggestions && searchTerm.trim().length >= 3 && (
          <div className="customer-dropdown">
            <div className="customer-dropdown-header">
              <div className="customer-dropdown-heading">
                <FaBuilding />
                <span>Matching Customers</span>
              </div>

              <span className="customer-results-count">
                {filteredCustomers.length} Records
              </span>
            </div>

            {filteredCustomers.length > 0 ? (
              <div
                className="customer-results-list"
                id="customer-search-results"
                role="listbox"
                ref={listRef}
              >
                {filteredCustomers.map((cust, index) => (
                  <div
                    key={`${cust.CustomerId}-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`customer-result-card ${
                      activeIndex === index ? "customer-result-active" : ""
                    }`}
                    onClick={() => handleSelectCustomer(cust)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="customer-result-top">
                      <div className="customer-result-avatar">
                        <FaBuilding />
                      </div>

                      <div className="customer-result-info">
                        <div className="customer-result-name">
                          {highlightText(cust.CustomerName, searchTerm)}
                        </div>

                        <div className="customer-result-area">
                          <FaMapMarkerAlt />
                          <span>
                            {highlightText(
                              cust.Area || "Area not available",
                              searchTerm,
                            )}
                          </span>
                        </div>
                      </div>

                      <span className="customer-result-number">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="customer-result-address">
                      <span className="customer-detail-label">Address</span>

                      <p title={cust.Address || "Address not available"}>
                        {cust.Address || "Address not available"}
                      </p>
                    </div>

                    {cust.Contact_No && (
                      <div className="customer-result-contact">
                        <FaPhoneAlt />
                        <span>{cust.Contact_No}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="customer-empty-state">
                <FaSearch />
                <p>No matching customers found</p>
                <span>Try another customer name or area</span>
              </div>
            )}

            <div className="customer-dropdown-footer">
              <span>Scroll to view all matching records</span>
              <span>↑ ↓ Navigate · Enter Select</span>
            </div>
          </div>
        )}
      </div>

      {errors.customerName && (
        <span className={styles.error}>{errors.customerName}</span>
      )}
    </div>
  );
};

export default CustomerSearch;
