import React, { useEffect, useState } from "react";
import styles from "./AdminDashboard.module.css";
import { FaEye, FaEdit, FaPlus, FaSearch, FaFilter, FaSyncAlt, FaShieldAlt, FaSyringe } from "react-icons/fa";
import { PiEggBold } from "react-icons/pi";
import AddOrderModal from "./AdminOrderModal/AddOrderModal";
import AddCustomerModal from "./AddCustomerModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrder } from "../features/orderSlice";
import Loader from "./Loader";
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
   const dispatch = useDispatch()

   const orders = useSelector((state)=> state.order.record);
   console.log(orders,"fetch admin side oderr");
   const loading = useSelector((state)=> state.order.loading)

   const [filteredData, setFilteredData] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const recordsPerPage = 10;
const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
 


const totalPages = Math.ceil(filteredData.length / recordsPerPage);

const formatPaymentSummary = (summary) => {
  if (!summary) return "-";

  
  return summary
    .split("|")
    .map(item => item.trim())
    .filter(item => {
      const amount = parseFloat(item.split(":")[1]);
      return amount > 0;
    })
    .join(" | ");
};



  useEffect(()=> {
      dispatch(fetchOrder())
  },[dispatch])

  useEffect(()=>{
    setFilteredData(orders || []);

  },[orders])
  
   const data = orders || [];

 
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
          setFilteredData(orders || []);
        };


                    const handleSearch = () => {
                let filtered = orders;

                Object.keys(filters).forEach((key) => {
                  const value = filters[key].trim().toLowerCase();
                  if (value) {
                    filtered = filtered.filter((item) => {
                      switch (key) {
                        case "ProductId":
                          return item.OrderID?.toString().toLowerCase().includes(value);
                        case "customer":
                          return item.CustomerName?.toLowerCase().includes(value);
                        default:
                          return item[key]?.toString().toLowerCase().includes(value);
                      }
                    });
                  }
                });

                setFilteredData(filtered);
                setCurrentPage(1);
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
                                        {loading && (
                  <div className={styles.loaderWrapper}>
                    <Loader />
                  </div>
                )}



              {
                data.length === 0 && !loading && <p> No order found...</p>
              }


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
              {currentRecords.length > 0 ? (
  currentRecords.map((row, index) => (
    <tr key={row.id} className={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
      <td>
        <span className={styles.productId}>{row.OrderID}</span>
      </td>
      <td className={styles.productName}>{row.ProductNames}</td>
      <td className={styles.tableData}>{row.CustomerName}</td>
      <td className={styles.tableData}>{row.Address}</td>
      <td className={styles.tableData}>{row.Area}</td>
      <td className={styles.tableData}>{row.ContactNo}</td>
      <td className={styles.tableData}>{row.ProductTypes}</td>
      <td className={styles.tableData}>{row.Weights}</td>
      <td className={styles.tableData}>{row.Quantities}</td>
      <td className={styles.tableData}>{row.Rates}</td>
      <td className={styles.tableData}>{row.DeliveryCharge}</td>
     <td className={styles.tableData}>
            {new Date(row.OrderDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit'
            }).replace(',', '').replace(' ', '-')}
          </td>

 <td className={styles.tableData}>
            {new Date(row.DeliveryDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit'
            }).replace(',', '').replace(' ', '-')}
          </td>

     
      <td className={styles.tableData}>{row.DeliveryManName}</td>
      <td>
        <span className={styles.paymentModeBadge}>
       {formatPaymentSummary(row.PaymentSummary)}
        </span>
      </td>
      <td className={styles.tableData}>{row.orderTakenBy}</td>
      <td className={styles.tableData}>{row.Remark}</td>
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
                  {filteredData.length > 0 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              <div className={styles.paginationPages}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <span
                    key={i}
                    className={currentPage === i + 1 ? styles.paginationActive : ""}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>

              <button
                className={styles.paginationBtn}
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                Next
              </button>
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