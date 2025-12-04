import React from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaDownload,
} from 'react-icons/fa';
import styles from './Purchase.module.css';

const FilterSection = ({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  sortOrder,
  setSortOrder,
  onExport,
}) => {
  return (
    <div className={styles.filterSection}>

      {/* Search Box */}
      <div className={styles.searchBox}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search PO, item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        {searchTerm.trim() && (
          <button
            className={styles.clearBtn}
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filterControls}>

        {/* Date Filter */}
        <div className={styles.filterGroup}>
          <FaCalendarAlt className={styles.filterIcon} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={styles.dateInput}
          />
          {dateFilter && (
            <button
              className={styles.clearBtnSmall}
              onClick={() => setDateFilter('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        {/* <div className={styles.filterGroup}>
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
        </div> */}

        {/* Sort Button */}
        <button
          className={styles.sortButton}
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
          <span>Date {sortOrder === 'desc' ? 'Desc' : 'Asc'}</span>
        </button>

        {/* Export Button */}
        <button className={styles.actionButton} onClick={onExport}>
          <FaDownload />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
};

export default FilterSection;
