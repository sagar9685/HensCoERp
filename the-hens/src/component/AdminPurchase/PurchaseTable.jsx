import React, { useState } from 'react';
import { FaBox, FaDownload, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './Purchase.module.css';

const PurchaseTable = ({ purchases, formatDate, downloadPurchaseOrder, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Adjust this value as needed

  // Calculate pagination
  const totalPages = Math.ceil(purchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = purchases.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.purchasesTable}>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total Qty</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {currentPurchases.length > 0 ? (
              currentPurchases.map((purchase) => (
                <tr key={purchase.po_number} className={styles.tableRow}>

                  {/* PO Number */}
                  <td className={styles.poNumber}>
                    <span className={styles.poBadge}>{purchase.po_number}</span>
                  </td>

                  {/* ITEMS – name + weight + qty */}
                  <td>
                    {purchase.items.map((item, index) => (
                      <div key={index} className={styles.itemInfo}>
                        <FaBox className={styles.itemIcon} />
                        <div>
                          <strong>{item.item_name}</strong>
                          <small>{item.weight}</small>  
                        
                        </div>
                      </div>
                    ))}
                     
                  </td>

                  {/* Date */}
                  <td className={styles.date}>
                    {formatDate(purchase.order_date)}
                  </td>

                  {/* Total Quantity */}
                  <td className={styles.quantity}>
                    <span className={styles.qtyBadge}>
                      {purchase.total_qty}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className={styles.actions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => downloadPurchaseOrder(purchase)}
                      title="Download PDF"
                    >
                      <FaDownload />
                    </button>

                   
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={styles.noData}>
                  <FaBox />
                  <p>No purchase orders found</p>
                </td>
              </tr>
            )}
          </tbody>

        </table>

        {/* Pagination Controls */}
        {purchases.length > itemsPerPage && (
          <div className={styles.pagination}>
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              <FaChevronLeft />
            </button>
            
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseTable;