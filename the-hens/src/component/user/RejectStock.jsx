import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAvailableStock, rejectStock, fetchRejectedStock } from "../../features/stockSlice";
import { fetchProductTypes, fetchWeightByType } from "../../features/productTypeSlice";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from "./rejectstock.module.css";
import { Trash2, Plus, Package, Download, ChevronLeft, ChevronRight } from "lucide-react";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavBar";

const RejectStock = () => {
  const dispatch = useDispatch();

  // State from Redux
 const { available, rejected = [], loading: stockLoading } = useSelector(
  (state) => state.stock
);

  useEffect(() => {
    console.log("Raw 'rejected' data from Redux:", rejected);
  }, [rejected]);


  const { types: productTypes } = useSelector((state) => state.product);

  const [rejectDate, setRejectDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState([{ item_name: "", quantity: 1, weight: "", reason: "" }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    dispatch(fetchAvailableStock());
    dispatch(fetchProductTypes());
    dispatch(fetchRejectedStock());
  }, [dispatch]);

  // --- Form Handlers ---
  const handleAddItem = () => {
    setItems([...items, { item_name: "", quantity: 1, weight: "", reason: "" }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "item_name" && value) {
      const result = await dispatch(fetchWeightByType(value)).unwrap();
      const weightValue = Array.isArray(result) ? result[0] : result;
      newItems[index].weight = weightValue || "";
    }
    setItems(newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    for (let item of items) {
      const stockExist = available.find((s) => s.item_name === item.item_name);
      if (!stockExist || stockExist.Quantity < parseInt(item.quantity)) {
        alert(`Insufficient stock for ${item.item_name}. Available: ${stockExist?.Quantity || 0}`);
        return;
      }
    }

    dispatch(rejectStock({ reject_date: rejectDate, items }))
      .unwrap()
      .then(() => {
        alert("Stock Rejected Successfully");
        setItems([{ item_name: "", quantity: 1, weight: "", reason: "" }]);
        setIsModalOpen(false);
        dispatch(fetchRejectedStock()); 
        dispatch(fetchAvailableStock());
      })
      .catch((err) => alert("Error: " + (err.message || "Failed")));
  };

  // --- Logic to show History ---
  // If your backend returns a flat array of rejected items, we use it directly.
  // If it returns nested items, we flatten them.
 const flatRejected = useMemo(() => {
  if (!Array.isArray(rejected)) return [];

  return rejected.map((r) => ({
    date: r.reject_date || r.created_at || r.date,
    item_name: r.item_name,
    quantity: r.quantity,
    weight: r.weight,
    reason: r.reason,
  }));
}, [rejected]);

  const filtered = useMemo(() => {
    const res = flatRejected.filter((item) => {
      const dateStr = item.date ? item.date.split('T')[0] : "";
      const from = searchFrom || "1900-01-01";
      const to = searchTo || "2099-12-31";
      return dateStr >= from && dateStr <= to;
    });

    // 🔍 DEBUG 3: Check if filters are hiding everything
    console.log("Filtered Data result (after date filters):", res);
    return res;
  }, [flatRejected, searchFrom, searchTo]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownload = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", "Product Name", "Quantity", "Weight", "Reason"];
    const tableRows = filtered.map((item) => [
      item.date ? item.date.split('T')[0] : "",
      item.item_name,
      item.quantity,
      item.weight,
      item.reason,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] },
    });
    doc.save("rejected_stock_report.pdf");
  };

  return (
    <div className="container-scroller">
      <UserSideBar />
      <div className="container-fluid page-body-wrapper">
        <UserNavbar />
        <div className={styles.container}>
          
          <div className={styles.headerCard}>
            <div className={styles.header}>
              <Package size={24} className="mr-2 text-red-600" />
              <h2 className="text-xl font-bold">Rejected Stock Management</h2>
            </div>
            <p className="text-gray-500 text-sm mb-4">Track and record items removed from inventory via FIFO</p>
            <button onClick={() => setIsModalOpen(true)} className={styles.addRejectBtn}>
              <Plus size={18} /> Add New Rejection
            </button>
          </div>

          <div className={styles.historyCard}>
            <div className={styles.sectionHeader}>
              <h3 className="font-bold">Rejection History</h3>
              <button onClick={handleDownload} className={styles.downloadBtn}>
                <Download size={16} /> Export PDF
              </button>
            </div>

            <div className={styles.searchRow}>
              <div className={styles.inputGroup}>
                <label>From Date</label>
                <input type="date" value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>To Date</label>
                <input type="date" value={searchTo} onChange={(e) => setSearchTo(e.target.value)} />
              </div>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Weight</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? currentItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.date ? item.date.split('T')[0] : "N/A"}</td>
                    <td className="font-medium">{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td><span className={styles.badge}>{item.weight}</span></td>
                    <td className="text-gray-500">{item.reason}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="text-center py-10 text-gray-400">No rejected items found for this period</td></tr>
                )}
              </tbody>
            </table>

            <div className={styles.pagination}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pagBtn}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pagBtn}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className="text-lg font-bold">New Rejection Entry</h2>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className="font-semibold text-sm">Date of Rejection</label>
                <input type="date" value={rejectDate} onChange={(e) => setRejectDate(e.target.value)} required />
              </div>

              <div className={styles.itemsSection}>
                <div className={styles.sectionHeader}>
                  <h4 className="text-sm font-bold text-gray-600">Items List</h4>
                  <button type="button" onClick={handleAddItem} className={styles.addButton}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className={styles.itemRow}>
                    <div className={styles.fieldMain}>
                      <select value={item.item_name} onChange={(e) => handleItemChange(index, "item_name", e.target.value)} required>
                        <option value="">Select Product</option>
                        {productTypes.map((type, i) => <option key={i} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className={styles.fieldSmall}>
                      <input type="number" placeholder="Qty" value={item.quantity} min="1" onChange={(e) => handleItemChange(index, "quantity", e.target.value)} required />
                    </div>
                    <div className={styles.fieldSmall}>
                      <input type="text" value={item.weight} placeholder="Weight" readOnly className={styles.readOnlyInput} />
                    </div>
                    <div className={styles.fieldMain}>
                      <input type="text" placeholder="Reason (Required)" value={item.reason} onChange={(e) => handleItemChange(index, "reason", e.target.value)} required />
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(index)} className={styles.removeBtn}><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={stockLoading} className={styles.submitBtn}>
                  {stockLoading ? "Saving..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectStock;