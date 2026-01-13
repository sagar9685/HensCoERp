import { useState, useMemo } from "react";
import { useSelector } from "react-redux";

export const useOrderFilter = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all"); // New State
  const [deliveryManFilter, setDeliveryManFilter] = useState("all"); // New State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const rawAssignedOrders = useSelector(
    (state) => state.assignedOrders.data || []
  );

  const assignedOrders = useMemo(() => {
    return rawAssignedOrders.map((o) => ({
      ...o,
      AssignID: o.AssignID ?? o.assignId ?? null,
      DeliveryManID: o.DeliveryManID ?? o.deliveryManId ?? null,
      OtherDeliveryManName:
        o.OtherDeliveryManName ?? o.otherDeliveryManName ?? null,
      DeliveryDate: o.DeliveryDate ?? o.deliveryDate ?? null,
      Remark: o.Remark ?? o.remark ?? null,
      OrderStatus: o.OrderStatus ?? o.orderStatus ?? "Pending",
    }));
  }, [rawAssignedOrders]);

  // Filter and sort logic
  const filteredAndSortedOrders = useMemo(() => {
    if (!assignedOrders) return [];

    return assignedOrders
      .filter((order) => {
        // 1. Search Logic
        const matchesSearch =
          order.CustomerName?.toLowerCase().includes(
            searchTerm.toLowerCase()
          ) ||
          order.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.OrderID?.toString().includes(searchTerm);

        // 2. Status Logic
        const status = order.OrderStatus?.trim().toLowerCase();
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "complete" && status?.includes("complete")) ||
          (statusFilter === "pending" && status?.includes("pending"));

        // 3. Area Logic
        const matchesArea = areaFilter === "all" || order.Area === areaFilter;

        // 4. Delivery Boy Logic
        const matchesDeliveryMan =
          deliveryManFilter === "all" ||
          order.DeliveryManName === deliveryManFilter;

        return (
          matchesSearch && matchesStatus && matchesArea && matchesDeliveryMan
        );
      })
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    assignedOrders,
    searchTerm,
    statusFilter,
    areaFilter,
    deliveryManFilter,
    sortConfig,
  ]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedOrders.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  // Reset to page 1 when any filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, areaFilter, deliveryManFilter]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          pageNumbers.push(i);
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const formatPaymentSummary = (summary) => {
    if (!summary) return "-";
    return summary
      .split("|")
      .map((item) => item.trim())
      .filter((item) => {
        const amount = parseFloat(item.split(":")[1]);
        return amount > 0;
      })
      .join(" | ");
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    areaFilter,
    setAreaFilter,
    deliveryManFilter,
    setDeliveryManFilter,
    sortConfig,
    currentPage,
    currentItems,
    totalPages,
    filteredAndSortedOrders,
    assignedOrders,
    handleSort,
    paginate,
    nextPage,
    prevPage,
    getPageNumbers,
    formatPaymentSummary,
    indexOfFirstItem,
    indexOfLastItem,
  };
};
