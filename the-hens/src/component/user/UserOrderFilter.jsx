import { useState, useMemo } from "react";
import {  useSelector } from "react-redux";
 

export const useOrderFilter = () => {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const assignedOrders = useSelector((state) => state.assignedOrders.data);

  // Filter and sort logic
const filteredAndSortedOrders = useMemo(() => {
  if (!assignedOrders) return [];

  return assignedOrders
    .filter(order => {
      const matchesSearch =
        order.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.OrderID?.toString().includes(searchTerm);

      const status = order.OrderStatus?.trim().toLowerCase();

      // Flexible status comparison
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && status?.includes("complete")) ||
        (statusFilter === "pending" && status?.includes("pending"));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
}, [assignedOrders, searchTerm, statusFilter, sortConfig]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const formatPaymentSummary = (summary) => {
    if (!summary) return "-";
    
    return summary
      .split("|")
      .map(item => item.trim())
      .filter(item => {
        const amount = parseFloat(item.split(":")[1]);
        return amount > 0;
      })
      .join(" | ");
  };

  return {
    // State
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortConfig,
    currentPage,
    itemsPerPage,
    currentItems,
    totalPages,
    filteredAndSortedOrders,
    assignedOrders,
    
    // Actions
    handleSort,
    paginate,
    nextPage,
    prevPage,
    getPageNumbers,
    formatPaymentSummary,
    
    // Data
    indexOfFirstItem,
    indexOfLastItem
  };
};