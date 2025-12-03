import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaPlus } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductTypes } from '../../features/productTypeSlice';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import styles from './Purchase.module.css';
import Header from '../Header';
import PurchaseModal from './PurchaseModal';
import PurchaseTable from './PurchaseTable';
import StatsCards from './StatsCard';
import FilterSection from './FilterSection';

import { fetchPurchaseOrders,createPurchaseOrder } from '../../features/purchaseOrderSlice';
const Purchase = () => {
   
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product?.types || []);

  // Mock data - in real app, this would come from API
  const { orders: purchases  } = useSelector(state => state.purchaseOrder);
  console.log(purchases,"cooo")

   const groupByPONumber = (purchases) => {
    const map = {};
    purchases.forEach(p => {
      if (!map[p.po_number]) {
        map[p.po_number] = [];
      }
      map[p.po_number].push(p);
    });
    return Object.values(map); // array of arrays
  };

  // --- Then process purchases for table ---
 // Purchase.jsx
const groupByPO = (purchases) => {
  const map = {};

  purchases.forEach(item => {
    if (!map[item.po_number]) {
      map[item.po_number] = {
        po_number: item.po_number,
        order_date: item.order_date,
        items: [],
        total_qty: 0,
        id: item.id
      };
    }

    map[item.po_number].items.push({
      item_name: item.item_name,
      weight: item.weight,
      qty: item.quantity
    });

    map[item.po_number].total_qty += item.quantity;
  });

  return Object.values(map);
};

const grouped = groupByPO(purchases);
console.log(grouped,"group")



   useEffect(() => {
     dispatch(fetchPurchaseOrders());
   }, [dispatch]);

  useEffect(() => {
    if (showAddModal) {
      dispatch(fetchProductTypes());
    }
  }, [showAddModal]);

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
  (purchase.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (purchase.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (purchase.id || '').toLowerCase().includes(searchTerm.toLowerCase());

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

  const formatDate = (dateString) => {
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
     dispatch(fetchPurchaseOrders()); // refresh table
   } catch (err) {
     toast.error(err?.error || 'Failed to create purchase order');
   }
 };


  const downloadPurchaseOrder = (purchase) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = 40; // start position

  // TITLE
  doc.setFontSize(18);
  doc.text("Purchase Order", 220, y);
  y += 30;

  // PO DETAILS
  doc.setFontSize(12);
  doc.text(`PO Number: ${purchase.po_number}`, 40, y);  
  y += 20;

  doc.text(`Order Date: ${new Date(purchase.order_date).toLocaleDateString()}`, 40, y);
  y += 20;

  doc.text(`Total Quantity: ${purchase.total_qty}`, 40, y);
  y += 30;

  // LINE
  doc.line(40, y, 550, y);
  y += 25;

  // ITEMS TABLE HEADER
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

  // SAVE PDF
  doc.save(`PurchaseOrder_${purchase.po_number}.pdf`);
};


  const exportAllPurchases = () => {
    const doc = new jsPDF();
    
    // ... (same export code as before)
    
    doc.save(`PurchaseOrders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeletePurchase = (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
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

        {/* Stats Cards */}
        <StatsCards purchases={filteredPurchases} />

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
          purchases={grouped}
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