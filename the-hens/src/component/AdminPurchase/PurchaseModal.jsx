import React, { useState } from 'react';
import { 
  FaPlus, 
  FaTimesCircle, 
  FaCalendarAlt, 
  FaBox, 
  FaClipboardList,
  FaCheckCircle,
  FaMinus
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWeightByType } from '../../features/productTypeSlice';
import {createPurchaseOrder} from '../../features/purchaseOrderSlice'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Make sure to import the CSS
import styles from './Purchase.module.css';

const PurchaseModal = ({ show, onClose, productTypes }) => {
  const dispatch = useDispatch();
  const { loading} = useSelector(state => state.purchaseOrder);
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

  const removeItem = (itemId) => {
    if (newPurchase.items.length > 1) {
      setNewPurchase(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };

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

  const handleClose = () => {
    resetNewPurchase();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const result = await dispatch(createPurchaseOrder(newPurchase)).unwrap();
      toast.success(`PO Created Successfully: ${result.po_number}`);
     
                setTimeout(() => {
                resetNewPurchase();
                onClose();
                }, 500);
    } catch (err) {
      console.error(err);
   toast.error(err?.message || err?.error || "Error creating purchase order");

    }
  };

  if (!show) return null;

  return (
    <>
      
      
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={`${styles.modalContent} ${styles.addModalContent}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>
              <FaPlus style={{ marginRight: '10px' }} />
              Create New Purchase Order
            </h3>
            <button className={styles.closeButton} onClick={handleClose}>
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
              onClick={handleClose}
            >
              Cancel
            </button>
            <div className={styles.footerActions}>
              <button className={styles.primaryButton} onClick={handleSubmit} disabled={loading}>
                <FaCheckCircle /> {loading ? "Creating..." : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseModal;