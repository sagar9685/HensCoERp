// RejectStock.js (Updated)
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAvailableStock, rejectStock, fetchRejectedStock } from "../../features/stockSlice";
import { fetchProductTypes, fetchWeightByType } from "../../features/productTypeSlice";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from "./rejectstock.module.css";
import { Trash2, Plus, Package, Download, ChevronLeft, ChevronRight, Calendar, Clock, Filter, AlertCircle } from "lucide-react";
import UserSideBar from "./UserSidebar";
import UserNavbar from "./UserNavBar";
import DatePickerModal from "./DatePickerModal";

const RejectStock = () => {
  const dispatch = useDispatch();

  // State from Redux
  const { available, rejected = [], loading: stockLoading } = useSelector(
    (state) => state.stock
  );

  const { types: productTypes } = useSelector((state) => state.product);

  const [rejectDateTime, setRejectDateTime] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ item_name: "", quantity: 1, weight: "", reason: "" }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
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

  const handleDateSelect = (datetime) => {
    setRejectDateTime(datetime.split('T')[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate stock availability
    const validationErrors = [];
    items.forEach((item, index) => {
      const stockExist = available.find((s) => s.item_name === item.item_name);
      if (!stockExist) {
        validationErrors.push(`${item.item_name} is not available in stock`);
      } else if (stockExist.Quantity < parseInt(item.quantity)) {
        validationErrors.push(
          `Insufficient stock for ${item.item_name}. Available: ${stockExist.Quantity}, Requested: ${item.quantity}`
        );
      }
    });

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    dispatch(rejectStock({ 
      reject_date: rejectDateTime, 
      items: items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity)
      }))
    }))
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
  const flatRejected = useMemo(() => {
    if (!Array.isArray(rejected)) return [];

    return rejected
      .map((r) => {
        if (r.items && Array.isArray(r.items)) {
          return r.items.map(item => ({
            date: r.reject_date || r.created_at || r.date,
            item_name: item.item_name,
            quantity: item.quantity,
            weight: item.weight,
            reason: item.reason,
           
          }));
        }
        return {
          date: r.reject_date || r.created_at || r.date,
          item_name: r.item_name,
          quantity: r.quantity,
          weight: r.weight,
          reason: r.reason,
       
        };
      })
      .flat()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rejected]);

  const filtered = useMemo(() => {
    const res = flatRejected.filter((item) => {
      const dateStr = item.date ? item.date.split('T')[0] : "";
      const from = searchFrom || "1900-01-01";
      const to = searchTo || "2099-12-31";
      return dateStr >= from && dateStr <= to;
    });
    return res;
  }, [flatRejected, searchFrom, searchTo]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownload = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Rejected Stock Report', 14, 22);
    
    // Add filters info
    doc.setFontSize(10);
    doc.text(`Period: ${searchFrom || 'Start'} to ${searchTo || 'End'}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);
    
    const tableColumn = ["Date", "Product Name", "Quantity", "Weight", "Reason"];
    const tableRows = filtered.map((item) => [
      item.date ? new Date(item.date).toLocaleDateString() : "",
      item.item_name,
      item.quantity,
      item.weight,
      item.reason,
      
    ]);

    autoTable(doc, {
      startY: 45,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 50 },
        5: { cellWidth: 25 }
      }
    });
    
    // Add summary
    const totalItems = filtered.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(11);
    doc.text(`Total Rejected Items: ${totalItems}`, 14, finalY + 10);
    
    doc.save(`rejected_stock_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const quickDateFilter = (days) => {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);
    
    setSearchFrom(fromDate.toISOString().split('T')[0]);
    setSearchTo(today.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  return (
    <div className="container-scroller">
      <UserSideBar />
      <div className="container-fluid page-body-wrapper">
        <UserNavbar />
        <div className={styles.container}>
          
          <div className={styles.headerCard}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className={styles.header}>
                  <Package size={24} className="mr-2 text-red-600" />
                  <h2 className="text-xl font-bold">Rejected Stock Management</h2>
                </div>
                <p className="text-gray-500 text-sm mt-2">Track and record items removed from inventory via FIFO</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => quickDateFilter(7)}
                  className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                >
                  Last 7 Days
                </button>
                <button 
                  onClick={() => quickDateFilter(30)}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                >
                  Last 30 Days
                </button>
              </div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className={styles.addRejectBtn}>
              <Plus size={18} /> Add New Rejection
            </button>
          </div>

          <div className={styles.historyCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className="font-bold">Rejection History</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Total Records: {filtered.length} | 
                  Showing {Math.min(currentItems.length, itemsPerPage)} of {filtered.length} items
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownload} className={styles.downloadBtn}>
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle size={18} className="text-amber-600" />
                <h4 className="font-semibold text-amber-800">Date Range Filter</h4>
              </div>
              <div className={styles.searchRow}>
                <div className={styles.inputGroup}>
                  <label>From Date</label>
                  <input 
                    type="date" 
                    value={searchFrom} 
                    onChange={(e) => setSearchFrom(e.target.value)}
                    max={searchTo}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>To Date</label>
                  <input 
                    type="date" 
                    value={searchTo} 
                    onChange={(e) => setSearchTo(e.target.value)}
                    min={searchFrom}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      setSearchFrom("");
                      setSearchTo("");
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setSearchFrom(today);
                      setSearchTo(today);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                  >
                    Today Only
                  </button>
                </div>
              </div>
            </div>

            {currentItems.length > 0 ? (
              <>
                <div className="overflow-x-auto">
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
                      {currentItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="font-medium">
                              {item.date ? new Date(item.date).toLocaleDateString() : "N/A"}
                            </div>
                            {/* <div className="text-xs text-gray-400">
                              {item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </div> */}
                          </td>
                          <td className="font-medium">{item.item_name}</td>
                          <td>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold">
                              {item.quantity}
                            </span>
                          </td>
                          <td><span className={styles.badge}>{item.weight}</span></td>
                          <td className="text-gray-600 max-w-xs truncate">{item.reason}</td>
                       
                       
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)} 
                    className={styles.pagBtn}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)} 
                    className={styles.pagBtn}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Package size={64} />
                <h3>No rejected items found</h3>
                <p className="text-gray-400 mt-2">
                  {searchFrom || searchTo 
                    ? "No items match your filter criteria" 
                    : "Start by adding your first rejected item"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Modal */}
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
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={rejectDateTime} 
                    onChange={(e) => setRejectDateTime(e.target.value)} 
                    required 
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2"
                  >
                    <Calendar size={16} />
                    Pick Date & Time
                  </button>
                </div>
              </div>

              <div className={styles.itemsSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h4 className="text-sm font-bold text-gray-600">Items List</h4>
                    <p className="text-xs text-gray-400">Select products from available stock</p>
                  </div>
                  <button type="button" onClick={handleAddItem} className={styles.addButton}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                {items.map((item, index) => {
                  const availableStock = available.find(s => s.item_name === item.item_name);
                  const availableQty = availableStock?.Quantity || 0;
                  
                  return (
                    <div key={index} className={styles.itemRow}>
                      <div className={styles.fieldMain}>
                        <select 
                          value={item.item_name} 
                          onChange={(e) => handleItemChange(index, "item_name", e.target.value)} 
                          required
                        >
                          <option value="">Select Product</option>
                          {productTypes.map((type, i) => (
                            <option key={i} value={type}>
                              {type} {available.find(s => s.item_name === type) && 
                                `(Available: ${available.find(s => s.item_name === type)?.Quantity || 0})`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.fieldSmall}>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="Qty" 
                            value={item.quantity} 
                            min="1" 
                            max={availableQty}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)} 
                            required 
                          />
                          {availableQty > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Max: {availableQty}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.fieldSmall}>
                        <input 
                          type="text" 
                          value={item.weight} 
                          placeholder="Weight" 
                          readOnly 
                          className={styles.readOnlyInput} 
                        />
                      </div>
                      <div className={styles.fieldMain}>
                        <input 
                          type="text" 
                          placeholder="Reason (Required)" 
                          value={item.reason} 
                          onChange={(e) => handleItemChange(index, "reason", e.target.value)} 
                          required 
                        />
                      </div>
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)} 
                          className={styles.removeBtn}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Stock Availability Summary</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.filter(item => item.item_name).map((item, idx) => {
                    const stock = available.find(s => s.item_name === item.item_name);
                    return stock && (
                      <div key={idx} className="text-sm p-2 bg-white rounded border">
                        <span className="font-medium">{item.item_name}: </span>
                        <span className={parseInt(item.quantity) > stock.Quantity ? "text-red-600" : "text-green-600"}>
                          {item.quantity} / {stock.Quantity} units
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={stockLoading} className={styles.submitBtn}>
                  {stockLoading ? "Saving..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onConfirm={handleDateSelect}
        initialDate={rejectDateTime}
      />
    </div>
  );
};

export default RejectStock;