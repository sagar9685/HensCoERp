import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaCalendarAlt, 
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaPrint,
  FaFileExport,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaShoppingCart,
  FaBox,
  FaTruck,
  FaCheckCircle,
  FaInfoCircle,
  FaClipboardList,
  FaClock,
  FaTimesCircle,
  FaSave,
  FaMinus,
  FaDownload
} from 'react-icons/fa';
import styles from './Purchase.module.css';
import Header from './Header';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductTypes, fetchWeightByType } from '../features/productTypeSlice';
 import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

 


const Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    orderDate: new Date().toISOString().split('T')[0],
    items: [
      {
        id: Date.now(),
        itemName: '',
        weight: '',
        weightOptions: [], 
        quantity: 1,
        unitPrice: 0,
        total: 0
      }
    ],
    supplier: '',
    notes: ''
  });

  // Mock data - in real app, this would come from API
  const mockPurchases = [
    {
      id: 'PO-2024-001',
      itemName: 'Premium Laptop Dell XPS',
      supplier: 'Tech Distributors Inc.',
      date: '2024-01-15',
      quantity: 5,
      unitPrice: 1299.99,
      total: 6499.95,
      status: 'completed',
      category: 'Electronics',
      deliveryDate: '2024-01-20',
      paymentStatus: 'paid'
    },
    {
      id: 'PO-2024-002',
      itemName: 'Office Chairs Ergonomic',
      supplier: 'Office Comfort Ltd.',
      date: '2024-01-14',
      quantity: 12,
      unitPrice: 249.99,
      total: 2999.88,
      status: 'pending',
      category: 'Furniture',
      deliveryDate: '2024-01-25',
      paymentStatus: 'pending'
    },
    {
      id: 'PO-2024-003',
      itemName: 'Coffee Machine Commercial',
      supplier: 'BrewTech Solutions',
      date: '2024-01-12',
      quantity: 3,
      unitPrice: 899.99,
      total: 2699.97,
      status: 'processing',
      category: 'Appliances',
      deliveryDate: '2024-01-18',
      paymentStatus: 'paid'
    },
    {
      id: 'PO-2024-004',
      itemName: 'Network Router Enterprise',
      supplier: 'NetGear Systems',
      date: '2024-01-10',
      quantity: 8,
      unitPrice: 399.99,
      total: 3199.92,
      status: 'completed',
      category: 'Networking',
      deliveryDate: '2024-01-15',
      paymentStatus: 'paid'
    },
    {
      id: 'PO-2024-005',
      itemName: 'Desk Organizers Set',
      supplier: 'Office Depot',
      date: '2024-01-08',
      quantity: 25,
      unitPrice: 29.99,
      total: 749.75,
      status: 'cancelled',
      category: 'Office Supplies',
      deliveryDate: '2024-01-12',
      paymentStatus: 'refunded'
    },
    {
      id: 'PO-2024-006',
      itemName: 'Projector 4K UHD',
      supplier: 'AV Solutions Corp',
      date: '2024-01-05',
      quantity: 2,
      unitPrice: 1499.99,
      total: 2999.98,
      status: 'completed',
      category: 'AV Equipment',
      deliveryDate: '2024-01-10',
      paymentStatus: 'paid'
    },
    {
      id: 'PO-2024-007',
      itemName: 'Whiteboard Magnetic',
      supplier: 'Classroom Essentials',
      date: '2024-01-03',
      quantity: 6,
      unitPrice: 199.99,
      total: 1199.94,
      status: 'pending',
      category: 'Office Supplies',
      deliveryDate: '2024-01-15',
      paymentStatus: 'pending'
    },
    {
      id: 'PO-2024-008',
      itemName: 'Air Purifier HEPA',
      supplier: 'Clean Air Tech',
      date: '2024-01-02',
      quantity: 4,
      unitPrice: 349.99,
      total: 1399.96,
      status: 'processing',
      category: 'Appliances',
      deliveryDate: '2024-01-09',
      paymentStatus: 'partial'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setPurchases(mockPurchases);
  }, []);

  useEffect(() => {
    if (showAddModal) {
      dispatch(fetchProductTypes());
    }
  }, [showAddModal]);

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter ? purchase.date === dateFilter : true;
    const matchesStatus = selectedStatus === 'all' || purchase.status === selectedStatus;
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    if (sortOrder === 'desc') {
      return new Date(b.date) - new Date(a.date);
    }
    return new Date(a.date) - new Date(b.date);
  });

  
  const handleCloseDetails = () => {
    setSelectedPurchase(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Add new item row in the purchase form
  const addNewItem = () => {
    setNewPurchase(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now() + Math.random(),
          itemName: '',
          weight: '',
          weightOptions: [],
          quantity: 1,
          unitPrice: 0,
          total: 0
        }
      ]
    }));
  };

  // Remove item row from purchase form
  const removeItem = (itemId) => {
    if (newPurchase.items.length > 1) {
      setNewPurchase(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };

  // Update item in the purchase form
  const updateItem = (itemId, field, value) => {
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // Calculate total for the purchase
  const calculateTotal = () => {
    return newPurchase.items.reduce((sum, item) => sum + item.total, 0);
  };

  // Submit new purchase order
  const handleSubmitPurchase = () => {
    const newPurchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
      itemName: newPurchase.items.length === 1 ? newPurchase.items[0].itemName : `${newPurchase.items.length} Items`,
      supplier: newPurchase.supplier,
      date: newPurchase.orderDate,
      quantity: newPurchase.items.reduce((sum, item) => sum + item.quantity, 0),
      unitPrice: newPurchase.items.length > 0 ? calculateTotal() / newPurchase.items.length : 0,
      total: calculateTotal(),
      status: 'pending',
      category: 'Multiple',
      deliveryDate: newPurchase.orderDate,
      paymentStatus: 'pending'
    };

    setPurchases(prev => [newPurchaseOrder, ...prev]);
    setShowAddModal(false);
    resetNewPurchase();
  };

  const resetNewPurchase = () => {
    setNewPurchase({
      orderDate: new Date().toISOString().split('T')[0],
      items: [
        {
          id: Date.now(),
          itemName: '',
          weight: '',
          weightOptions: [], 
          quantity: 1,
          unitPrice: 0,
          total: 0
        }
      ],
      supplier: '',
      notes: ''
    });
  };

  const totalPurchases = filteredPurchases.reduce((sum, item) => sum + item.total, 0);
  const totalItems = filteredPurchases.reduce((sum, item) => sum + item.quantity, 0);
  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product?.types || []);

  // Handle product selection and fetch weight options
  const handleSelectProduct = async (id, productName) => {
    if (!productName) {
      setNewPurchase(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === id
            ? {
                ...item,
                itemName: '', 
                weight: "", 
                weightOptions: [],
              }
            : item
        ),
      }));
      return;
    }

    try {
      const response = await dispatch(fetchWeightByType(productName)).unwrap();
      
      let weightOptions = [];
      
      if (Array.isArray(response)) {
        weightOptions = response;
      } else if (typeof response === 'string') {
        let cleanedString = response.trim();
        cleanedString = cleanedString.replace(/\n/g, ' ');
        cleanedString = cleanedString.replace(/\s+/g, ' ');
        
        if (cleanedString.includes(',')) {
          weightOptions = cleanedString.split(',').map(item => item.trim());
        } else if (cleanedString.includes(';')) {
          weightOptions = cleanedString.split(';').map(item => item.trim());
        } else {
          const words = cleanedString.split(' ');
          if (words.length >= 2) {
            weightOptions = [words.join(' ')];
          } else {
            weightOptions = [cleanedString];
          }
        }
        
        weightOptions = weightOptions.filter(option => option.trim() !== '');
      }
      
      setNewPurchase(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === id
            ? {
                ...item,
                itemName: productName,
                weight: "", 
                weightOptions: weightOptions,
              }
            : item
        ),
      }));
    } catch (error) {
      console.error("Failed to fetch weights:", error);
      setNewPurchase(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === id
            ? {
                ...item,
                itemName: productName,
                weight: "", 
                weightOptions: [],
              }
            : item
        ),
      }));
    }
  };

  // Download Purchase Order as PDF
 // Download Purchase Order as PDF
const downloadPurchaseOrder = (purchase) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('PURCHASE ORDER', 105, 20, { align: 'center' });

  // Company info
  doc.setFontSize(10);
  doc.text('The Hens Co', 20, 35);
  doc.text('Head Office (Gorakhpur)', 20, 40);
  doc.text('Jabalpur, M.P.', 20, 45);
  doc.text('Phone: 9685043467', 20, 50);
  doc.text('Email: info@henscompany.com', 20, 55);

  // PO details
  doc.setTextColor(40, 40, 40);
  doc.text(`PO Number: ${purchase.id}`, 140, 35);
  doc.text(`Date: ${formatDate(purchase.date)}`, 140, 40);
  doc.text(`Status: ${purchase.status.toUpperCase()}`, 140, 45);

  // Supplier info
  doc.setFontSize(12);
  doc.text('Supplier Information:', 20, 70);
  doc.setFontSize(10);
  doc.text(purchase.supplier, 20, 77);

  // Items table - Using autoTable correctly
  autoTable(doc, {  // <-- Use autoTable as a function, not doc.autoTable()
    startY: 85,
    head: [['Item', 'Quantity']],
    body: [
      [
        purchase.itemName,
        purchase.quantity?.toString() || '0',
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // Get the final Y position after the table
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Totals
  doc.setFontSize(11);
   
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  

  // Footer
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, finalY + 20, { align: 'center' });
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 105, finalY + 25, { align: 'center' });

  // Save PDF
  doc.save(`PurchaseOrder_${purchase.id}.pdf`);
};

// Also update the exportAllPurchases function to use autoTable correctly:

  // Export all purchases as PDF
  const exportAllPurchases = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('PURCHASE ORDERS REPORT', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Total Orders: ${filteredPurchases.length}`, 20, 40);
    doc.text(`Total Value: $${totalPurchases.toFixed(2)}`, 20, 45);
    
    // Prepare table data
    const tableData = filteredPurchases.map(purchase => [
      purchase.id,
      purchase.itemName,
      formatDate(purchase.date),
      purchase.quantity.toString(),
      `$${purchase.total.toFixed(2)}`,
      purchase.status
    ]);
    
    // Add table
    doc.autoTable({
      startY: 55,
      head: [['PO Number', 'Item', 'Date', 'Quantity', 'Total', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 }
    });
    
    // Save the PDF
    doc.save(`PurchaseOrders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Header />
      <div className={styles.purchaseContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              <FaShoppingCart className={styles.titleIcon} />
              Purchase Orders
            </h1>
            <p className={styles.subtitle}>Manage and track all purchase orders</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
              <FaPlus />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaShoppingCart />
            </div>
            <div className={styles.statContent}>
              <h3>{filteredPurchases.length}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaBox />
            </div>
            <div className={styles.statContent}>
              <h3>{totalItems}</h3>
              <p>Total Items</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaTruck />
            </div>
            <div className={styles.statContent}>
              <h3>{filteredPurchases.filter(p => p.status === 'completed').length}</h3>
              <p>Delivered</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.revenueIcon}`}>
              <FaCheckCircle />
            </div>
            <div className={styles.statContent}>
              <h3>${totalPurchases.toLocaleString()}</h3>
              <p>Total Value</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by item or PO number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterControls}>
            <div className={styles.filterGroup}>
              <FaCalendarAlt className={styles.filterIcon} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={styles.dateInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <FaFilter className={styles.filterIcon} />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.statusSelect}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              className={styles.sortButton}
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
              <span>Date {sortOrder === 'desc' ? 'Desc' : 'Asc'}</span>
            </button>

            <button className={styles.actionButton} onClick={exportAllPurchases}>
              <FaDownload />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Purchases Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableWrapper}>
            <table className={styles.purchasesTable}>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Item Name</th>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPurchases.length > 0 ? (
                  sortedPurchases.map((purchase) => (
                    <tr key={purchase.id} className={styles.tableRow}>
                      <td className={styles.poNumber}>
                        <span className={styles.poBadge}>{purchase.id}</span>
                      </td>
                      <td className={styles.itemName}>
                        <div className={styles.itemInfo}>
                          <FaBox className={styles.itemIcon} />
                          <div>
                            <strong>{purchase.itemName}</strong>
                            <small>{purchase.category}</small>
                          </div>
                        </div>
                      </td>
                      <td className={styles.date}>
                        {formatDate(purchase.date)}
                      </td>
                      <td className={styles.quantity}>
                        <span className={styles.qtyBadge}>{purchase.quantity}</span>
                      </td>
                      <td className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => downloadPurchaseOrder(purchase)}
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={styles.noData}>
                      <FaShoppingCart />
                      <p>No purchase orders found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Purchase Modal */}
        {showAddModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div className={`${styles.modalContent} ${styles.addModalContent}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>
                  <FaPlus style={{ marginRight: '10px' }} />
                  Create New Purchase Order
                </h3>
                <button className={styles.closeButton} onClick={() => setShowAddModal(false)}>
                  <FaTimesCircle />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  {/* Order Date */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>
                      <FaCalendarAlt style={{ marginRight: '8px' }} />
                      Order Information
                    </h4>
                    <div className={styles.formGroup}>
                      <label>Order Date</label>
                      <input 
                        type="date" 
                        className={styles.formInput}
                        value={newPurchase.orderDate}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Purchase Items */}
                  <div className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.sectionTitle}>
                        <FaBox style={{ marginRight: '8px' }} />
                        Purchase Items
                      </h4>
                      <button 
                        type="button" 
                        className={styles.addItemButton}
                        onClick={addNewItem}
                      >
                        <FaPlus /> Add Item
                      </button>
                    </div>

                    <div className={styles.itemsTableContainer}>
                      <table className={styles.itemsTable}>
                        <thead>
                          <tr>
                            <th style={{ width: '40%' }}>Item Name</th>
                            <th style={{ width: '40%' }}>Weight</th>
                            <th style={{ width: '15%' }}>Quantity</th>
                            <th style={{ width: '5%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newPurchase.items.map((item) => (
                            <tr key={item.id} className={styles.itemRow}>
                              <td>
                                <select
                                  className={styles.tableInput}
                                  value={item.itemName}
                                  onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                                >
                                  <option value="">Select Product</option>
                                  {productTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  className={styles.tableInput}
                                  value={item.weight}
                                  onChange={(e) => updateItem(item.id, "weight", e.target.value)}
                                >
                                  <option value="">Select Weight</option>
                                  {item.weightOptions && item.weightOptions.length > 0 ? (
                                    item.weightOptions.map((w, index) => (
                                      <option key={index} value={w}>{w}</option>
                                    ))
                                  ) : (
                                    <option disabled>Select product first</option>
                                  )}
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className={styles.tableInput}
                                  style={{ textAlign: 'center' }}
                                />
                              </td>
                              <td>
                                <button 
                                  type="button" 
                                  className={styles.removeItemButton}
                                  onClick={() => removeItem(item.id)}
                                  title="Remove item"
                                  disabled={newPurchase.items.length === 1}
                                >
                                  <FaMinus />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className={styles.itemsFooter}>
                            <td colSpan="2"></td>
                            <td className={styles.totalLabel}>
                              <strong>Total Items:</strong>
                            </td>
                            <td className={styles.totalValue}>
                              <strong>{newPurchase.items.length}</strong>
                            </td>
                          </tr>
                          <tr className={styles.itemsFooter}>
                            <td colSpan="2"></td>
                            <td className={styles.totalLabel}>
                              <strong>Total Quantity:</strong>
                            </td>
                            <td className={styles.totalValue}>
                              <strong>{newPurchase.items.reduce((sum, item) => sum + item.quantity, 0)}</strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>
                      <FaClipboardList style={{ marginRight: '8px' }} />
                      Additional Notes
                    </h4>
                    <div className={styles.formGroup}>
                      <label>Order Notes</label>
                      <textarea 
                        className={styles.textarea}
                        rows="3"
                        placeholder="Enter any special instructions or notes for this order..."
                        value={newPurchase.notes}
                        onChange={(e) => setNewPurchase(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button 
                  className={styles.secondaryButton} 
                  onClick={() => {
                    setShowAddModal(false);
                    resetNewPurchase();
                  }}
                >
                  Cancel
                </button>
                <div className={styles.footerActions}>
                  <button className={styles.primaryButton} onClick={handleSubmitPurchase}>
                    <FaCheckCircle /> Create Purchase Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Details Modal */}
        {selectedPurchase && (
          <div className={styles.modalOverlay} onClick={handleCloseDetails}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Purchase Order Details</h3>
                <button className={styles.closeButton} onClick={handleCloseDetails}>
                  <FaTimesCircle />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>PO Number</label>
                    <p>{selectedPurchase.id}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Item Name</label>
                    <p>{selectedPurchase.itemName}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Order Date</label>
                    <p>{formatDate(selectedPurchase.date)}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Quantity</label>
                    <p>{selectedPurchase.quantity}</p>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.secondaryButton} onClick={handleCloseDetails}>
                  Close
                </button>
                <button 
                  className={styles.primaryButton} 
                  onClick={() => downloadPurchaseOrder(selectedPurchase)}
                >
                  <FaDownload /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Purchase;