import Header from "./Header";
import styles from "./Customer.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchCustomerName } from "../features/cutomerSlice";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faEdit, 
  faTrash, 
  faUser, 
  faMapMarkerAlt, 
  faPhone, 
  faBuilding,
  faTimes,
  faCheck,
  faPlus,
  faFilter
} from '@fortawesome/free-solid-svg-icons';

function Customer() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    CustomerName: "",
    Address: "",
    Contact_No: "",
    Area: ""
  });
  const [filterArea, setFilterArea] = useState("all");

  const { customerName, isLoading, error } = useSelector((state) => state.customer);
  
  useEffect(() => {
    dispatch(fetchCustomerName());
  }, [dispatch]);

  const handleEditClick = (customer) => {
    setEditingCustomer(customer.CustomerId);
    setEditForm({
      CustomerName: customer.CustomerName,
      Address: customer.Address,
      Contact_No: customer.Contact_No,
      Area: customer.Area
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = (customerId) => {
    dispatch(updateCustomer({ id: customerId, data: editForm }));
    setEditingCustomer(null);
  };

  const handleCancelEdit = () => {
    setEditingCustomer(null);
  };

  const handleDelete = (customerId) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      dispatch(deleteCustomer(customerId));
    }
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCustomer = () => {
    // Here you would dispatch an action to add the customer
    console.log("Add new customer:", newCustomer);
    setNewCustomer({ CustomerName: "", Address: "", Contact_No: "", Area: "" });
    setShowAddForm(false);
  };

  const filteredCustomers = customerName.filter(customer => {
    const matchesSearch = customer.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.Area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.Contact_No.includes(searchTerm);
    
    const matchesFilter = filterArea === "all" || customer.Area === filterArea;
    
    return matchesSearch && matchesFilter;
  });

  const areas = [...new Set(customerName.map(customer => customer.Area))];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Customers</h2>
        <p>{error}</p>
        <button onClick={() => dispatch(fetchCustomerName())} className={styles.retryBtn}>
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
          <p className={styles.subtitle}>Manage your customer information efficiently</p>
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
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <button 
              className={styles.addButton}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add New Customer
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className={styles.addForm}>
            <h3>Add New Customer</h3>
            <div className={styles.formGrid}>
              <input
                type="text"
                name="CustomerName"
                placeholder="Customer Name"
                value={newCustomer.CustomerName}
                onChange={handleNewCustomerChange}
                className={styles.formInput}
              />
              <input
                type="text"
                name="Address"
                placeholder="Address"
                value={newCustomer.Address}
                onChange={handleNewCustomerChange}
                className={styles.formInput}
              />
              <input
                type="tel"
                name="Contact_No"
                placeholder="Phone Number"
                value={newCustomer.Contact_No}
                onChange={handleNewCustomerChange}
                className={styles.formInput}
              />
              <input
                type="text"
                name="Area"
                placeholder="Area"
                value={newCustomer.Area}
                onChange={handleNewCustomerChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formActions}>
              <button onClick={handleAddCustomer} className={styles.saveBtn}>
                <FontAwesomeIcon icon={faCheck} />
                Save Customer
              </button>
              <button onClick={() => setShowAddForm(false)} className={styles.cancelBtn}>
                <FontAwesomeIcon icon={faTimes} />
                Cancel
              </button>
            </div>
          </div>
        )}

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

        <div className={styles.customersGrid}>
          {filteredCustomers.map((customer) => (
            <div key={customer.CustomerId} className={styles.customerCard}>
              {editingCustomer === customer.CustomerId ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    name="CustomerName"
                    value={editForm.CustomerName}
                    onChange={handleEditChange}
                    className={styles.editInput}
                  />
                  <input
                    type="text"
                    name="Address"
                    value={editForm.Address}
                    onChange={handleEditChange}
                    className={styles.editInput}
                  />
                  <input
                    type="tel"
                    name="Contact_No"
                    value={editForm.Contact_No}
                    onChange={handleEditChange}
                    className={styles.editInput}
                  />
                  <input
                    type="text"
                    name="Area"
                    value={editForm.Area}
                    onChange={handleEditChange}
                    className={styles.editInput}
                  />
                  <div className={styles.editActions}>
                    <button 
                      onClick={() => handleSaveEdit(customer.CustomerId)}
                      className={styles.saveBtn}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      Save
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className={styles.cancelBtn}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.cardHeader}>
                    <div className={styles.customerAvatar}>
                      {customer.CustomerName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.customerInfo}>
                      <h3 className={styles.customerName}>{customer.CustomerName}</h3>
                      <span className={styles.customerId}>ID: {customer.CustomerId}</span>
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        onClick={() => handleEditClick(customer)}
                        className={styles.editBtn}
                        title="Edit"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.CustomerId)}
                        className={styles.deleteBtn}
                        title="Delete"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.detailIcon} />
                      <div>
                        <p className={styles.detailLabel}>Address</p>
                        <p className={styles.detailValue}>{customer.Address}</p>
                      </div>
                    </div>
                    
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon icon={faPhone} className={styles.detailIcon} />
                      <div>
                        <p className={styles.detailLabel}>Phone</p>
                        <p className={styles.detailValue}>{customer.Contact_No}</p>
                      </div>
                    </div>
                    
                    <div className={styles.detailItem}>
                      <FontAwesomeIcon icon={faBuilding} className={styles.detailIcon} />
                      <div>
                        <p className={styles.detailLabel}>Area</p>
                        <p className={styles.detailValue}>
                          <span className={styles.areaBadge}>{customer.Area}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className={styles.noResults}>
            <FontAwesomeIcon icon={faUser} className={styles.noResultsIcon} />
            <h3>No customers found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
}

export default Customer;