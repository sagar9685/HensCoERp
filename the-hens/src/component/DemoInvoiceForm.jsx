import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveDemoInvoice, resetStatus } from "../features/demoInvoiceSlice";
import { fetchCustomerName } from "../features/cutomerSlice";
import {
  fetchProductTypes,
  fetchWeightByType,
  fetchRateByProductType,
  fetchUPCByProductType,
} from "../features/productTypeSlice";
import InvoiceGenerator from "../component/OrderInvoice";
import styles from "./DemoInvoiceForm.module.css";
import {
  FaPlus,
  FaTrash,
  FaFileInvoice,
  FaArrowLeft,
  FaSave,
} from "react-icons/fa";

const DemoInvoiceForm = () => {
  const dispatch = useDispatch();

  // Redux States
  const { loading, success } = useSelector((state) => state.demoInvoice);
  const { customerName } = useSelector((state) => state.customer);
  const { types } = useSelector((state) => state.product);

  const [showPreview, setShowPreview] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({
    ID: "", // New field for ID
    DeliveryManName: "", // New field for Delivery Man Name
    OrderTakenBy: "", // New field for Order Taken By
    InvoiceNo: `INV-${Date.now()}`,
    InvoiceDate: new Date().toISOString().split("T")[0],
    CustomerName: "",
    Address: "",
    Area: "",
    ContactNo: "",
    Gst_No: "",
    PAN_No: "",
    OrderDate: new Date().toISOString().split("T")[0],
    Po_No: "",
    Po_Date: "",
    DeliveryCharge: 0,
  });

  const [products, setProducts] = useState([
    {
      id: 1,
      name: "",
      type: "",
      weight: "",
      qty: "",
      rate: "",
      mrp: "",
      upc: "",
    },
  ]);

  useEffect(() => {
    dispatch(fetchCustomerName());
    dispatch(fetchProductTypes());
  }, [dispatch]);

  const handleCustomerChange = (e) => {
    const selectedName = e.target.value;
    const customer = customerName.find((c) => c.CustomerName === selectedName);

    if (customer) {
      setCustomerInfo({
        ...customerInfo,
        CustomerName: customer.CustomerName,
        Address: customer.Address || "",
        Area: customer.Area || "",
        ContactNo: customer.Contact_No || "",
        Gst_No: customer.Gst_No || "",
        PAN_No: customer.PAN_No || "",
      });
    } else {
      setCustomerInfo({ ...customerInfo, CustomerName: selectedName });
    }
  };

  const handleProductTypeChange = async (id, type) => {
    try {
      const weightResult = await dispatch(fetchWeightByType(type)).unwrap();
      const upcResult = await dispatch(fetchUPCByProductType(type)).unwrap();
      const rateResult = await dispatch(fetchRateByProductType(type)).unwrap();

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                type: type,
                name: type,
                weight: weightResult || "",
                rate: rateResult || 0,
                upc: upcResult || "",
              }
            : p,
        ),
      );
    } catch (err) {
      console.error("Autofill failed:", err);
    }
  };

  const addProductRow = () => {
    setProducts([
      ...products,
      {
        id: Date.now(),
        name: "",
        type: "",
        weight: "",
        qty: "",
        rate: "",
        mrp: "",
        upc: "",
      },
    ]);
  };

  const removeRow = (id) => {
    if (products.length > 1) setProducts(products.filter((p) => p.id !== id));
  };

  const handleProductFieldChange = (id, field, value) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...customerInfo,
      ID: customerInfo.ID || null, // Include new ID field
      DeliveryManName: customerInfo.DeliveryManName || null, // Include new DeliveryManName field
      OrderTakenBy: customerInfo.OrderTakenBy || null, // Include new OrderTakenBy field
      InvoiceDate: customerInfo.InvoiceDate || null,
      OrderDate: customerInfo.OrderDate || null,
      Po_Date: customerInfo.Po_Date || null,
      ProductNames: products.map((p) => p.name).join(","),
      ProductTypes: products.map((p) => p.type).join(","),
      Weights: products.map((p) => p.weight).join(","),
      Quantities: products.map((p) => p.qty).join(","),
      Rates: products.map((p) => p.rate).join(","),
      MRPs: products.map((p) => p.mrp).join(","),
      ProductUPCs: products.map((p) => p.upc).join(","),
    };
    setSubmittedData(payload);
    dispatch(saveDemoInvoice(payload));
  };

  useEffect(() => {
    if (success) {
      setShowPreview(true);
      dispatch(resetStatus());
    }
  }, [success, dispatch]);

  if (showPreview && submittedData) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <button
            className={styles.backBtn}
            onClick={() => setShowPreview(false)}
          >
            <FaArrowLeft /> Back to Form
          </button>
          <h3>Review & Generate PDF</h3>
        </div>
        <InvoiceGenerator
          orderData={submittedData}
          onClose={() => setShowPreview(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <FaFileInvoice className={styles.icon} />
        <h2>Professional Demo Invoice</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.invoiceForm}>
        {/* Section 1: ID, Delivery Man, Order Taken By & Dates */}
        <div className={styles.section}>
          <h3>Order Information & Staff Details</h3>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>ID</label>
              <input
                type="text"
                placeholder="Enter Order ID"
                value={customerInfo.ID}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    ID: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Delivery Man Name</label>
              <input
                type="text"
                placeholder="Enter Delivery Person Name"
                value={customerInfo.DeliveryManName}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    DeliveryManName: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Order Taken By</label>
              <input
                type="text"
                placeholder="Enter Staff Name"
                value={customerInfo.OrderTakenBy}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    OrderTakenBy: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 2: All Dates & Invoice Numbers */}
        <div className={styles.section}>
          <h3>Dates & Reference Info</h3>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>Invoice No</label>
              <input
                type="text"
                value={customerInfo.InvoiceNo}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    InvoiceNo: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Invoice Date</label>
              <input
                type="date"
                value={customerInfo.InvoiceDate}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    InvoiceDate: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Order Date</label>
              <input
                type="date"
                value={customerInfo.OrderDate}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    OrderDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className={styles.grid} style={{ marginTop: "15px" }}>
            <div className={styles.inputGroup}>
              <label>PO Number</label>
              <input
                type="text"
                placeholder="P.O. No"
                value={customerInfo.Po_No}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, Po_No: e.target.value })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>PO Date</label>
              <input
                type="date"
                value={customerInfo.Po_Date}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, Po_Date: e.target.value })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Packaging Charge</label>
              <input
                type="number"
                value={customerInfo.DeliveryCharge}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    DeliveryCharge: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 3: Customer Details */}
        <div className={styles.section}>
          <h3>Customer Selection & Details</h3>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>Search/Select Customer</label>
              <select
                value={customerInfo.CustomerName}
                onChange={handleCustomerChange}
              >
                <option value="">-- Choose --</option>
                {customerName?.map((c) => (
                  <option key={c.CustomerId} value={c.CustomerName}>
                    {c.CustomerName}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Customer Name (Manual Edit)</label>
              <input
                type="text"
                value={customerInfo.CustomerName}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    CustomerName: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>GST No</label>
              <input
                type="text"
                value={customerInfo.Gst_No}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, Gst_No: e.target.value })
                }
              />
            </div>
          </div>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>Address</label>
              <input
                type="text"
                style={{ width: "100%" }}
                value={customerInfo.Address}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, Address: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 4: Products */}
        <div className={styles.section}>
          <h3>Products List</h3>
          <table className={styles.productTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Type</th>
                <th>Weight</th>
                <th>Qty</th>
                <th>UPC</th>
                <th>Rate</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        handleProductTypeChange(item.id, e.target.value)
                      }
                      required
                    >
                      <option value="">-- Select --</option>
                      {types?.map((type, i) => (
                        <option key={i} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.weight}
                      onChange={(e) =>
                        handleProductFieldChange(
                          item.id,
                          "weight",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="Qty"
                      onChange={(e) =>
                        handleProductFieldChange(item.id, "qty", e.target.value)
                      }
                      required
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={item.upc}
                      onChange={(e) =>
                        handleProductFieldChange(item.id, "upc", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        handleProductFieldChange(
                          item.id,
                          "rate",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{(item.qty * item.rate || 0).toFixed(2)}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className={styles.removeBtn}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addProductRow}
            className={styles.addBtn}
          >
            <FaPlus /> Add Row
          </button>
        </div>

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? (
            "Processing..."
          ) : (
            <>
              <FaSave /> Save & View Invoice
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DemoInvoiceForm;
