import React from 'react';
import { FaPlus, FaTrashAlt, FaEdit, FaShoppingCart } from 'react-icons/fa';
import styles from '../AddOrderModal.module.css';

const OrderItemsSection = ({ orderItems, errors, openItemModal, removeItem, getTotalAmount }) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FaShoppingCart />
          Order Items
        </h3>
        <button 
          type="button" 
          onClick={() => openItemModal()}
          className={styles.addItemButton}
        >
          <FaPlus />
          Add Item
        </button>
      </div>

      {errors.orderItems && (
        <div className={styles.errorBanner}>
          {errors.orderItems}
        </div>
      )}

      {orderItems.length === 0 ? (
        <div className={styles.emptyState}>
          <FaShoppingCart className={styles.emptyIcon} />
          <h4>No Items Added</h4>
          <p>Click "Add Item" to start adding products to your order</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Product Type</th>
                <th>Weight</th>
                <th>Quantity</th>
                <th>Rate (₹)</th>
                <th>Total (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td className={styles.indexCell}>{index + 1}</td>
                  <td className={styles.productCell}>{item.productName}</td>
                  <td className={styles.typeCell}>{item.productType}</td>
                  <td className={styles.weightCell}>{item.weight}</td>
                  <td className={styles.quantityCell}>{item.quantity}</td>
                  <td className={styles.rateCell}>₹{Number(item.rate || 0).toFixed(2)}</td>
                  <td className={styles.totalCell}>
                    ₹{(Number(item.rate || 0) * Number(item.quantity || 1)).toFixed(2)}
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      onClick={() => openItemModal(item, index)}
                      className={styles.editButton}
                      title="Edit Item"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className={styles.removeButton}
                      title="Remove Item"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.summaryRow}>
                <td colSpan="5"></td>
                <td className={styles.totalLabel}>Grand Total:</td>
                <td className={styles.grandTotal}>₹{getTotalAmount().toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};

export default OrderItemsSection;