import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomerReport } from "../../features/reportSlice";
import { fetchCustomerName } from "../../features/cutomerSlice";
import styles from "./CustomerReport.module.css";

const CustomerReport = () => {
  const dispatch = useDispatch();

  const { customer, customerLoading, error } = useSelector(
    (state) => state.report,
  );
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const { customerName } = useSelector((state) => state.customer);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    dispatch(fetchCustomerName());
  }, [dispatch]);

  const handleSearch = () => {
    if (!from || !to) {
      alert("Please select From and To date");
      return;
    }
    dispatch(
      fetchCustomerReport({
        from,
        to,
        customerName: selectedCustomer,
      }),
    );
  };

  // Calculate Grand Totals for the footer
  const totalOrderAmt =
    customer?.data?.reduce((sum, i) => sum + i.OrderAmount, 0) || 0;
  const totalPaidAmt =
    customer?.data?.reduce((sum, i) => sum + i.PaidAmount, 0) || 0;
  const totalOutstandingAmt =
    customer?.data?.reduce((sum, i) => sum + i.OutstandingAmount, 0) || 0;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Customer Wise Summary</h2>

      <div className={styles.filters}>
        <div>
          <label>From Date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label>To Date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label>Customer Name</label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">All Customers</option>
            {customerName?.map((cust) => (
              <option key={cust.CustomerID} value={cust.CustomerName}>
                {cust.CustomerName}
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleSearch} className={styles.searchBtn}>
          Search
        </button>
      </div>

      {customerLoading && <p className={styles.loading}>Loading Report...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {customer?.data?.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Items (Wt x Qty @ Rate)</th>
                <th>Delivery Boy</th>
                <th>Payment Mode</th> {/* New Column */}
                <th>Order Amt</th>
                <th>Paid</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customer.data.map((item, index) => (
                <tr key={item.OrderID || index}>
                  <td>
                    {new Date(item.OrderDate).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    <strong>{item.CustomerName}</strong>
                    <br />
                    <small>{item.ContactNo}</small>
                    <br />
                    <small style={{ color: "#666" }}>{item.Area}</small>
                  </td>
                  <td style={{ fontSize: "11px" }}>
                    {item.ItemDetails?.split(" | ").map((line, i) => (
                      <div key={i}>• {line}</div>
                    ))}
                  </td>
                  <td>{item.DeliveryBoyName || "N/A"}</td>

                  {/* Display Payment Modes */}
                  <td
                    style={{
                      fontSize: "11px",
                      color: "#2e7d32",
                      fontWeight: "500",
                    }}
                  >
                    {item.PaymentModeDetails}
                  </td>

                  <td>₹{item.OrderAmount}</td>
                  <td>₹{item.PaidAmount}</td>
                  <td
                    style={{
                      color: item.OutstandingAmount > 0 ? "red" : "green",
                      fontWeight: "bold",
                    }}
                  >
                    ₹{item.OutstandingAmount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={styles.tableFooter}>
              <tr>
                <td colSpan="5" style={{ textAlign: "right" }}>
                  <strong>Grand Total:</strong>
                </td>
                <td>
                  <strong>₹{totalOrderAmt.toLocaleString()}</strong>
                </td>
                <td>
                  <strong>₹{totalPaidAmt.toLocaleString()}</strong>
                </td>
                <td>
                  <strong>₹{totalOutstandingAmt.toLocaleString()}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!customerLoading && customer?.data?.length === 0 && (
        <p className={styles.noData}>
          No records found for the selected criteria.
        </p>
      )}
    </div>
  );
};

export default CustomerReport;
