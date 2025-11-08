import React, { useState } from "react";
import styles from "./AdminDashboard.module.css";
import { FaEye, FaEdit, FaPlus, FaSearch, FaFilter, FaSyncAlt, FaShieldAlt, FaSyringe } from "react-icons/fa";
import { PiEggBold } from "react-icons/pi";
import AddOrderModal from "./AddOrderModal";
import AddCustomerModal from "./AddCustomerModal";

const AdminDashboard = () => {
  const [filters, setFilters] = useState({
    ProductId: "",
    ProductName: "",
    ProductType: "",
    Weight: "",
    Rate: "",
    customer: "",
  });

  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
   const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  


  const data = [
    {
      id: "EGG102",
      productName: "Organic Brown Eggs",
      customerName: "John Restaurant",
      address: "123 Main St",
      area: "Downtown",
      contactNo: "+1-555-0123",
      productType: "Fresh Produce",
      weight: "500 gms",
      quantity: "100",
      rate: "$4.99",
      deliveryCharge: "$2.50",
      orderDate: "2024-01-15",
      deliveryDate: "2024-01-16",
      deliveryMan: "Mike Johnson",
      paymentMode: "Credit Card",
      orderTakenBy: "Sarah Wilson",
      remark: "Handle with care",
      paymentStatus: "Completed"
    },
    {
      id: "EGG103",
      productName: "Free Range White",
      customerName: "Green Cafe",
      address: "456 Oak Ave",
      area: "Uptown",
      contactNo: "+1-555-0124",
      productType: "Fresh Produce",
      weight: "500 gms",
      quantity: "75",
      rate: "$5.49",
      deliveryCharge: "$3.00",
      orderDate: "2024-01-14",
      deliveryDate: "2024-01-15",
      deliveryMan: "Emma Davis",
      paymentMode: "Cash",
      orderTakenBy: "Tom Brown",
      remark: "Early delivery requested",
      paymentStatus: "Pending"
    },
    {
      id: "EGG104",
      productName: "Farm Fresh Eggs",
      customerName: "City Diner",
      address: "789 Pine St",
      area: "Midtown",
      contactNo: "+1-555-0125",
      productType: "Organic",
      weight: "500 gms",
      quantity: "50",
      rate: "$6.99",
      deliveryCharge: "$2.00",
      orderDate: "2024-01-16",
      deliveryDate: "2024-01-17",
      deliveryMan: "John Smith",
      paymentMode: "Online",
      orderTakenBy: "Lisa Wang",
      remark: "Fragile items",
      paymentStatus: "Processing"
    }
  ];

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleClear = () => {
    setFilters({
      ProductId: "",
      ProductName: "",
      ProductType: "",
      Weight: "",
      Rate: "",
      customer: "",
    });
  };

  const handleSearch = () => {
    console.log("Searching with filters:", filters);
  };

   const handleAddOrder = (orderData) => {
    console.log("New order data:", orderData);
    // Here you would typically send the data to your backend API
    // For now, we'll just log it
    alert('Order created successfully!');
  };

    const handleAddCustomer = (customerData) => {
    console.log("New customer data:", customerData);
    // Handle customer creation
    alert('Customer added successfully!');
  };

  const getPaymentStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return styles.paymentCompleted;
      case 'pending':
        return styles.paymentPending;
      case 'failed':
        return styles.paymentFailed;
      case 'processing':
        return styles.paymentProcessing;
      default:
        return styles.paymentPending;
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <PiEggBold className={styles.titleIcon} />
            <div>
              <h1 className={styles.mainTitle}>Product Management Dashboard</h1>
              <p className={styles.subtitle}>Manage and monitor all product records</p>
            </div>
          </div>
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>24</span>
              <span className={styles.statLabel}>Active Orders</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>156</span>
              <span className={styles.statLabel}>Total Production</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className={styles.tabContainer}>
        <div className={styles.tabs}>
          {["all", "active", "inactive", "pending"].map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <div className={styles.contentCard}>
        {/* FILTERS SECTION */}
        <div className={styles.filterSection}>
          <div className={styles.filterHeader}>
            <FaFilter className={styles.filterIcon} />
            <h3>Filter Product</h3>
          </div>
          
          <div className={styles.filterGrid}>
            {Object.keys(filters).map((key) => (
              <div key={key} className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                </label>
                <input
                  type="text"
                  placeholder={`Search ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`}
                  name={key}
                  value={filters[key]}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className={styles.actionButtons}>
            <button className={styles.clearBtn} onClick={handleClear}>
              <FaSyncAlt className={styles.btnIcon} />
              Clear Filters
            </button>
            <button className={styles.searchBtn} onClick={handleSearch}>
              <FaSearch className={styles.btnIcon} />
              Search Product
            </button>

             <button className={styles.addOrder}
             onClick={()=>setIsModalOpen(true)}>
              <FaPlus className={styles.btnIcon} />
              Add New Order
            </button>

            <button className={styles.addBtn}
            onClick={()=>setIsCustomerModalOpen(true)
            }
            >
              <FaPlus className={styles.btnIcon} />
              Add New Customer
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>
              <FaShieldAlt className={styles.tableIcon} />
              Product Records
            </h3>
            <span className={styles.tableCounter}>{data.length} records found</span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Customer Name</th>
                  <th>Address</th>
                  <th>Area</th>
                  <th>Contact No</th>
                  <th>Product Type</th>
                  <th>Weight / Pack </th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Delivery Charge</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Delivery Man</th>
                  <th>Payment Mode</th>
                  <th>Order Taken By</th>
                  <th>Remark</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                      <td>
                        <span className={styles.productId}>{row.id}</span>
                      </td>
                      <td className={styles.vaccineName}>{row.productName}</td>
                      <td>{row.customerName}</td>
                      <td>{row.address}</td>
                      <td>{row.area}</td>
                      <td>{row.contactNo}</td>
                      <td>{row.productType}</td>
                      <td>{row.weight}</td>
                      <td>{row.quantity}</td>
                      <td>{row.rate}</td>
                      <td>{row.deliveryCharge}</td>
                      <td>{row.orderDate}</td>
                      <td>{row.deliveryDate}</td>
                      <td>{row.deliveryMan}</td>
                      <td>
                        <span className={styles.paymentModeBadge}>
                          {row.paymentMode}
                        </span>
                      </td>
                      <td>{row.orderTakenBy}</td>
                      <td>{row.remark}</td>
                      <td>
                        <span className={`${styles.paymentStatus} ${getPaymentStatusClass(row.paymentStatus)}`}>
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className={styles.actions}>
                        <button className={styles.actionBtn} title="View Details">
                          <FaEye />
                        </button>
                        <button className={styles.actionBtn} title="Edit Product">
                          <FaEdit />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="19" className={styles.noData}>
                      <div className={styles.noDataContent}>
                        <PiEggBold className={styles.noDataIcon} />
                        <h4>No products found</h4>
                        <p>Try adjusting your search filters or add a new product.</p>
                        <button className={styles.addBtn}>
                          <FaPlus className={styles.btnIcon} />
                          Add First Product
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {data.length > 0 && (
            <div className={styles.pagination}>
              <button className={styles.paginationBtn}>Previous</button>
              <div className={styles.paginationPages}>
                <span className={styles.paginationActive}>1</span>
                <span>2</span>
                <span>3</span>
                <span>...</span>
                <span>10</span>
              </div>
              <button className={styles.paginationBtn}>Next</button>
            </div>
          )}
        </div>
        
      </div>

 <AddOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddOrder={handleAddOrder}
      />


<AddCustomerModal 
  isOpen={isCustomerModalOpen}
  onClose={()=>setIsCustomerModalOpen(false)}
  onAddCustomer={handleAddCustomer}
  />

    </div>


     
  );
};

export default AdminDashboard;