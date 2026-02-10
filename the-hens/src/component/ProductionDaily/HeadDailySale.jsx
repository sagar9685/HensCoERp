import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHeadDailySale } from "../../features/headDailySaleSlice";
import styles from "./HeadDailySale.module.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  PieChart,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const HeadDailySale = () => {
  const dispatch = useDispatch();
  const { loading, data, error } = useSelector((state) => state.headDailySale);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("actual");
  const [printMode, setPrintMode] = useState(false);

  // Date Logic
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    dispatch(fetchHeadDailySale("all"));
  }, [dispatch]);

  const calculateTotal = (items) => {
    return (
      items?.reduce((acc, item) => acc + Number(item.TotalQty || 0), 0) || 0
    );
  };

  const getPredictedData = () => {
    return (
      data?.items?.map((item) => ({
        ...item,
        PredictedQty: Math.ceil(Number(item.TotalQty) * 1.1),
        Growth: "+10%",
      })) || []
    );
  };

  const predictedItems = getPredictedData();
  const totalActual = calculateTotal(data?.items);
  const totalPredicted = predictedItems.reduce(
    (acc, item) => acc + item.PredictedQty,
    0,
  );
  const growthPercentage = (
    ((totalPredicted - totalActual) / totalActual) *
    100
  ).toFixed(1);

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.width;

    // --- Header & Design ---
    doc.setFillColor(63, 81, 181);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCTION PREDICTION REPORT", pageWidth / 2, 18, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Forecast For: ${formatDate(tomorrow)}`, pageWidth / 2, 28, {
      align: "center",
    });

    // --- Table Section ---
    const tableColumn = [
      "Product Name",
      "Weight",
      "Current Sale",
      "Next Day Prediction",
      "Growth",
    ];
    const tableRows = predictedItems.map((item) => [
      item.ProductType,
      item.Weight,
      item.TotalQty.toString(),
      item.PredictedQty.toString(),
      item.Growth,
    ]);

    // IMPORTANT: autoTable ko as a function call karein na ki doc.autoTable
    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [63, 81, 181], halign: "center" },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
      },
    });

    doc.save(`Production_Report_${formatDate(tomorrow)}.pdf`);
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(false), 500);
    }, 100);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading production data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button
          className={styles.retryBtn}
          onClick={() => dispatch(fetchHeadDailySale("all"))}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.container} ${printMode ? styles.printMode : ""}`}
      >
        {/* Print Header - Only visible when printing */}
        <div className={styles.printHeader}>
          <h1>Production Prediction Report</h1>
          <div className={styles.printMeta}>
            <span>Prediction Date: {formatDate(tomorrow)}</span>
            <span>Generated: {new Date().toLocaleString()}</span>
            <span>Confidential - Production Department</span>
          </div>
        </div>

        <div className={styles.headerSection}>
          <div className={styles.headerLeft}>
            <div className={styles.dateContainer}>
              <Calendar size={20} />
              <div>
                <span className={styles.dateLabel}>YESTERDAY'S DATA</span>
                <h2>{formatDate(yesterday)}</h2>
              </div>
            </div>
            <h1 className={styles.mainTitle}>Daily Sale Analysis</h1>
            <p className={styles.subtitle}>
              Production insights based on previous day's closing stock
            </p>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.statsCard}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total Units</span>
                <span className={styles.statValue}>{totalActual}</span>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Products</span>
                <span className={styles.statValue}>
                  {data?.items?.length || 0}
                </span>
              </div>
            </div>

            <button
              className={styles.predictBtn}
              onClick={() => setIsModalOpen(true)}
            >
              <TrendingUp size={20} />
              Predict Tomorrow's Sale
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "actual" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("actual")}
          >
            <PieChart size={16} />
            Current Data
          </button>
          <button
            className={`${styles.tab} ${activeTab === "prediction" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("prediction")}
          >
            <TrendingUp size={16} />
            Predictions
          </button>
        </div>

        {/* Data Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h3>
              {activeTab === "actual"
                ? "Current Stock Levels"
                : "Tomorrow's Predictions"}
            </h3>
            <div className={styles.tableActions}>
              <button className={styles.actionBtn} onClick={handlePrint}>
                <Printer size={16} />
                Print
              </button>
              <button className={styles.actionBtn} onClick={downloadPDF}>
                <Download size={16} />
                PDF
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.productCol}>Product</th>
                  <th className={styles.weightCol}>Weight</th>
                  <th className={styles.qtyCol}>Current Qty</th>
                  {activeTab === "prediction" && (
                    <>
                      <th className={styles.predictedCol}>Predicted Qty</th>
                      <th className={styles.growthCol}>Growth</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === "actual"
                  ? data?.items?.map((item, index) => (
                      <tr key={index} className={styles.tableRow}>
                        <td className={styles.productCell}>
                          <div className={styles.productInfo}>
                            <div className={styles.productIcon}>📦</div>
                            <div>
                              <div className={styles.productName}>
                                {item.ProductType}
                              </div>
                              <div className={styles.productCode}>
                                #{index + 1001}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.weightBadge}>
                            {item.Weight}
                          </span>
                        </td>
                        <td>
                          <div className={styles.qtyCell}>
                            <span className={styles.qtyValue}>
                              {item.TotalQty}
                            </span>
                            <span className={styles.qtyUnit}>units</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  : predictedItems.map((item, index) => (
                      <tr key={index} className={styles.tableRow}>
                        <td className={styles.productCell}>
                          <div className={styles.productInfo}>
                            <div className={styles.productIcon}>🚀</div>
                            <div>
                              <div className={styles.productName}>
                                {item.ProductType}
                              </div>
                              <div className={styles.productCode}>
                                #{index + 1001}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.weightBadge}>
                            {item.Weight}
                          </span>
                        </td>
                        <td>
                          <div className={styles.qtyCell}>
                            <span className={styles.qtyValue}>
                              {item.TotalQty}
                            </span>
                            <span className={styles.qtyUnit}>units</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.predictedCell}>
                            <span className={styles.predictedValue}>
                              {item.PredictedQty}
                            </span>
                            <span className={styles.qtyUnit}>units</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.growthBadge}>
                            <TrendingUp size={12} />
                            {item.Growth}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td
                    colSpan={activeTab === "actual" ? 2 : 3}
                    className={styles.totalLabel}
                  >
                    <CheckCircle size={16} />
                    GRAND TOTAL
                  </td>
                  <td className={styles.totalValue}>
                    <span>{totalActual}</span>
                    <span className={styles.totalUnit}>units</span>
                  </td>
                  {activeTab === "prediction" && (
                    <>
                      <td className={styles.totalValue}>
                        <span>{totalPredicted}</span>
                        <span className={styles.totalUnit}>units</span>
                      </td>
                      <td>
                        <span className={styles.totalGrowth}>
                          <TrendingUp size={14} />+{growthPercentage}%
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Prediction Modal */}
        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  <TrendingUp size={24} />
                  <div>
                    <h2>Production Forecast</h2>
                    <p className={styles.modalSubtitle}>
                      Predictions for {formatDate(tomorrow)} • Based on 10%
                      growth rate
                    </p>
                  </div>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setIsModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.summaryCards}>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon}>📊</div>
                    <div>
                      <div className={styles.summaryLabel}>Current Total</div>
                      <div className={styles.summaryValue}>{totalActual}</div>
                    </div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon}>🚀</div>
                    <div>
                      <div className={styles.summaryLabel}>Predicted Total</div>
                      <div className={styles.summaryValue}>
                        {totalPredicted}
                      </div>
                    </div>
                  </div>
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon}>📈</div>
                    <div>
                      <div className={styles.summaryLabel}>Expected Growth</div>
                      <div className={styles.summaryValue}>
                        +{growthPercentage}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.predictionTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Weight</th>
                        <th>Current</th>
                        <th>Predicted</th>
                        <th>Increase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictedItems.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className={styles.productCell}>
                              <span className={styles.productIcon}>📦</span>
                              {item.ProductType}
                            </div>
                          </td>
                          <td>
                            <span className={styles.weightTag}>
                              {item.Weight}
                            </span>
                          </td>
                          <td className={styles.currentCell}>
                            {item.TotalQty}
                          </td>
                          <td className={styles.predictedCell}>
                            <span className={styles.highlightValue}>
                              {item.PredictedQty}
                            </span>
                          </td>
                          <td>
                            <span className={styles.increaseBadge}>
                              <TrendingUp size={12} />
                              {item.Growth}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </button>
                  <button className={styles.printBtn} onClick={handlePrint}>
                    <Printer size={18} />
                    Print Report
                  </button>
                  <button className={styles.pdfBtn} onClick={downloadPDF}>
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print-specific footer */}
      <div className={styles.printFooter}>
        <div className={styles.printFooterContent}>
          <div>Page 1 of 1</div>
          <div>
            Confidential - Production Department • Generated on{" "}
            {new Date().toLocaleString()}
          </div>
          <div>Prediction Report for {formatDate(tomorrow)}</div>
        </div>
      </div>
    </>
  );
};

export default HeadDailySale;
