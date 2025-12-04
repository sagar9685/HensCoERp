import React from 'react';
import { FaShoppingCart, FaBox, FaTruck } from 'react-icons/fa';
import styles from './Purchase.module.css';

const StatsCards = ({ purchases }) => {
   const totalItems = purchases.reduce((sum, purchase) => {
    return sum + (purchase.total_qty || 0);
  }, 0);
  
  return (
    <div className={styles.statsContainer}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <FaShoppingCart />
        </div>
        <div className={styles.statContent}>
          <h3>{purchases.length}</h3>
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
          <h3>{purchases.filter(p => p.status === 'completed').length}</h3>
          <p>Delivered</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;