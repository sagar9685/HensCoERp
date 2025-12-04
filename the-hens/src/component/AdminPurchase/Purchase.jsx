import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaPlus } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductTypes } from '../../features/productTypeSlice';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import styles from './Purchase.module.css';
import Header from '../Header';
import PurchaseModal from './PurchaseModal';
import PurchaseTable from './PurchaseTable';
import StatsCards from './StatsCard';
import FilterSection from './FilterSection';
import { fetchPurchaseOrders, createPurchaseOrder } from '../../features/purchaseOrderSlice';

const Purchase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product?.types || []);
  
  // Get purchases from Redux store
  const { orders: purchases } = useSelector(state => state.purchaseOrder);

  // Group purchases by PO number
  const groupByPO = (purchases) => {
    const map = {};
    
    purchases.forEach(item => {
      if (!map[item.po_number]) {
        map[item.po_number] = {
          po_number: item.po_number,
          order_date: item.order_date,
          status: item.status || 'pending', // Make sure status is included
          items: [],
          total_qty: 0,
          id: item.id
        };
      }
      
      map[item.po_number].items.push({
        item_name: item.item_name || item.itemName,
        weight: item.weight,
        qty: item.quantity
      });
      
      map[item.po_number].total_qty += parseInt(item.quantity) || 0;
    });
    
    return Object.values(map);
  };

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  useEffect(() => {
    if (showAddModal) {
      dispatch(fetchProductTypes());
    }
  }, [showAddModal]);

  // Group purchases first, then filter the grouped data
  const groupedPurchases = groupByPO(purchases);
  
  // Filter grouped purchases
  const filteredPurchases = groupedPurchases.filter(purchase => {
    // Search filter - check PO number and item names
    let matchesSearch = false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // Check PO number
      matchesSearch = (purchase.po_number || '').toLowerCase().includes(searchLower);
      
      // Check item names if PO number doesn't match
      if (!matchesSearch) {
        matchesSearch = purchase.items.some(item => 
          (item.item_name || '').toLowerCase().includes(searchLower)
        );
      }
    } else {
      matchesSearch = true;
    }

    // Date filter - compare date strings
    let matchesDate = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toISOString().split('T')[0];
      const purchaseDate = purchase.order_date ? 
        new Date(purchase.order_date).toISOString().split('T')[0] : '';
      matchesDate = purchaseDate === filterDate;
    }

    // Status filter
    let matchesStatus = true;
    if (selectedStatus !== 'all') {
      matchesStatus = (purchase.status || '').toLowerCase() === selectedStatus.toLowerCase();
    }
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  // Sort filtered purchases
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    const dateA = new Date(a.order_date || 0);
    const dateB = new Date(b.order_date || 0);
    
    if (sortOrder === 'desc') {
      return dateB - dateA;
    }
    return dateA - dateB;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSubmitPurchase = async (newPurchaseData) => {
    try {
      await dispatch(createPurchaseOrder(newPurchaseData)).unwrap();
      toast.success('Purchase Order Created Successfully');
      setShowAddModal(false);
      dispatch(fetchPurchaseOrders());
    } catch (err) {
      toast.error(err?.error || 'Failed to create purchase order');
    }
  };

  const formatShortDate = (date) => {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const downloadPurchaseOrder = (purchase) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    
    let y = 40;
    
    doc.setFontSize(18);
    doc.text("Phoenix Poultry", 220, y);
    y += 30;
    
    doc.setFontSize(18);
    doc.text("Purchase Order", 220, y);
    y += 30;
    
    doc.setFontSize(12);
    doc.text(`PO Number: ${purchase.po_number}`, 40, y);  
    y += 20;
    
    doc.text(`Order Date: ${formatShortDate(purchase.order_date)}`, 40, y);
    y += 20;
    
    doc.text(`Total Quantity: ${purchase.total_qty}`, 40, y);
    y += 30;
    
    doc.line(40, y, 550, y);
    y += 25;
    
    doc.setFontSize(14);
    doc.text("Items", 40, y);
    y += 25;
    
    doc.setFontSize(12);
    
    purchase.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.item_name}`, 40, y);
      doc.text(`Weight: ${item.weight}`, 220, y);
      doc.text(`Qty: ${item.qty}`, 400, y);
      y += 20;
    });
    
    doc.save(`PurchaseOrder_${purchase.po_number}.pdf`);
  };

  const exportAllPurchases = () => {
    if (sortedPurchases.length === 0) {
      toast.warning('No purchase orders to export');
      return;
    }
    
    const doc = new jsPDF();
    let y = 20;
    
    doc.setFontSize(20);
    doc.text("All Purchase Orders", 105, y);
    y += 20;
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, y);
    y += 20;
    
    const tableData = sortedPurchases.map(purchase => [
      purchase.po_number,
      purchase.items.map(i => i.item_name).join(', '),
      formatShortDate(purchase.order_date),
      purchase.total_qty,
      purchase.status || 'N/A'
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['PO Number', 'Items', 'Date', 'Total Qty', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`PurchaseOrders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeletePurchase = (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      // Handle delete logic here
      // You'll need to dispatch a delete action
      toast.info('Delete functionality to be implemented');
    }
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

        {/* Stats Cards - passing grouped purchases for accurate stats */}
        <StatsCards purchases={sortedPurchases} />

        {/* Filters */}
        <FilterSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onExport={exportAllPurchases}
        />

        {/* Purchases Table */}
        <PurchaseTable
          purchases={sortedPurchases}
          formatDate={formatDate}
          downloadPurchaseOrder={downloadPurchaseOrder}
          onDelete={handleDeletePurchase}
        />

        {/* Add Purchase Modal */}
        <PurchaseModal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSubmitPurchase}
          productTypes={productTypes}
        />
      </div>
    </>
  );
};

export default Purchase;