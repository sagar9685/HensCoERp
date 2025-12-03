import React from 'react';
import { 
  FaSearch, 
  FaCalendarAlt, 
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaDownload
} from 'react-icons/fa';
import styles from './Purchase.module.css';

const FilterSection = ({ 
  searchTerm, 
  setSearchTerm, 
  dateFilter, 
  setDateFilter, 
  selectedStatus, 
  setSelectedStatus, 
  sortOrder, 
  setSortOrder, 
  onExport 
}) => {
  return (
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

        <button className={styles.actionButton} onClick={onExport}>
          <FaDownload />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
};

export default FilterSection;