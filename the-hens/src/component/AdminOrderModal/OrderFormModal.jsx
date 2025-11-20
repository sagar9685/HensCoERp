import React from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../AddOrderModal.module.css';

const OrderFormModal = ({
  isItemModalOpen,
  closeItemModal,
  currentItem,
  editingIndex,
  handleItemChange,
  handleProductTypeChange,
  productTypes,
  errors,
  saveItem
}) => {
  if (!isItemModalOpen) return null;

  return (
    <div className={styles.itemModalOverlay}>
      <div className={styles.itemModalContent}>
        <div className={styles.itemModalHeader}>
          <h3 className={styles.itemModalTitle}>
            {editingIndex !== null ? 'Edit Item' : 'Add New Item'}
          </h3>
          <button 
            onClick={closeItemModal}
            className={styles.closeItemButton}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.itemModalBody}>
          <div className={styles.itemForm}>
            {/* Product Name */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Product Name <span className={styles.required}>*</span></label>
              <select
                name="productName"
                value={currentItem.productName}
                onChange={handleItemChange}
                className={styles.inputField}
              >
                <option value="">Select product</option>
                <option value="Chicken">Chicken</option>
                <option value="Egg">Egg</option>
              </select>
              {errors.productName && <span className={styles.error}>{errors.productName}</span>}
            </div>

            {/* Product Type */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Product Type <span className={styles.required}>*</span></label>
              <select
                name="productType"
                value={currentItem.productType}
                onChange={handleProductTypeChange}
                className={styles.selectField}
              >
                <option value="">Select product type</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.productType && <span className={styles.error}>{errors.productType}</span>}
            </div>

            {/* Weight (Auto-filled) */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Weight (kg/pc) <span className={styles.required}>*</span></label>
              <input
                type="text"
                name="weight"
                value={currentItem.weight}
                readOnly
                placeholder="Auto-filled"
                className={`${styles.inputField} ${styles.readOnly}`}
              />
            </div>

            {/* Quantity */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Quantity <span className={styles.required}>*</span></label>
              <input
                type="number"
                name="quantity"
                value={currentItem.quantity}
                onChange={handleItemChange}
                placeholder="Enter quantity"
                min="1"
                className={styles.inputField}
              />
              {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
            </div>
            
            {/* Rate */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Rate (₹) <span className={styles.required}>*</span></label>
              <input
                type="number"
                name="rate"
                value={currentItem.rate}
                onChange={handleItemChange}
                placeholder="Enter rate"
                min="0"
                step="0.01"
                className={styles.inputField}
              />
              {errors.rate && <span className={styles.error}>{errors.rate}</span>}
            </div>

            {/* Total Calculation */}
            <div className={styles.calculationBox}>
              <div className={styles.calculationRow}>
                <span>Quantity:</span>
                <span>{currentItem.quantity || 0}</span>
              </div>
              <div className={styles.calculationRow}>
                <span>Rate per item:</span>
                <span>₹{Number(currentItem.rate || 0).toFixed(2)}</span>
              </div>
              <div className={styles.calculationRow}>
                <span>Total Amount:</span>
                <span className={styles.calculationTotal}>
                  ₹{(Number(currentItem.quantity || 0) * Number(currentItem.rate || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.itemModalFooter}>
          <button 
            onClick={closeItemModal}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            onClick={saveItem}
            className={styles.saveItemButton}
          >
            {editingIndex !== null ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderFormModal;