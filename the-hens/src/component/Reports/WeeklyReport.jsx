import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWeeklyReport } from "../../features/reportSlice";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./WeeklyReport.module.css";

const EGG_KEYS = ["tray", "box", "kids", "women"];

const CHICKEN_KEYS = [
  "curryCut",
  "boneless",
  "breast",
  "tikka",
  "lollipop",
  "drumstick",
  "wings",
  "wholeBird",
  "petFood",
  "restChicken",
  "fullLeg",
  "cockrail",
];

const MAIN_CHICKEN_KEYS = CHICKEN_KEYS.filter(
  (key) => !["petFood", "restChicken"].includes(key),
);

const COLORS = [
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  "#264478",
  "#9E480E",
  "#636363",
  "#997300",
  "#255E91",
  "#43682B",
];

const formatNumber = (value, max = 3) =>
  Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: max,
  });

const formatMoney = (value) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

const formatLongDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDayName = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
  });
};

const addDays = (dateString, numberOfDays) => {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + numberOfDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getProductValue = (products, key, field = "quantity") =>
  Number(products?.[key]?.[field] ?? 0);

const sumProductValues = (products, keys, field = "quantity") =>
  keys.reduce((sum, key) => sum + getProductValue(products, key, field), 0);

const getChangePercent = (previous, current) => {
  const previousValue = Number(previous ?? 0);
  const currentValue = Number(current ?? 0);

  if (previousValue === 0) {
    return currentValue === 0 ? 0 : null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
};

const displayChange = (previous, current) => {
  const value = getChangePercent(previous, current);

  if (value === null) return "N/A";

  const sign = value > 0 ? "+" : "";

  return `${sign}${formatNumber(value, 1)}%`;
};

const projectNextWeek = (previous, current) => {
  const previousValue = Number(previous ?? 0);
  const currentValue = Number(current ?? 0);

  if (currentValue <= 0) return 0;
  if (previousValue <= 0) return currentValue;

  const growthRate = (currentValue - previousValue) / previousValue;
  const projected = currentValue * (1 + growthRate);

  return Math.max(0, projected);
};

const getDirectionText = (previous, current) => {
  const value = getChangePercent(previous, current);

  if (value === null)
    return "cannot be compared because the previous value was 0";
  if (value > 0) return `increased by ${formatNumber(value, 1)}%`;
  if (value < 0) return `decreased by ${formatNumber(Math.abs(value), 1)}%`;

  return "remained unchanged";
};

const joinRates = (rates) =>
  Array.isArray(rates) && rates.length ? rates.join(" | ") : "-";

const WeeklyReport = () => {
  const dispatch = useDispatch();

  const { weekly, weeklyLoading, error } = useSelector((state) => state.report);

  const today = new Date().toISOString().slice(0, 10);

  const reportRef = useRef(null);

  const [selectedStartDate, setSelectedStartDate] = useState(today);
  const [preparedBy, setPreparedBy] = useState("Sagar");
  const [exporting, setExporting] = useState(false);
  const [findings, setFindings] = useState(["", "", "", ""]);

  const selectedEndDate = addDays(selectedStartDate, 6);

  const products = weekly?.products ?? [];
  const days = weekly?.days ?? [];
  const periods = weekly?.periods ?? [];
  const current = weekly?.current ?? null;
  const split = weekly?.split ?? {};
  const areas = weekly?.areas ?? [];
  const prices = weekly?.prices ?? {};
  const pricesKg = weekly?.pricesKg ?? {};
  const supported = weekly?.supported ?? {};

  const previous = periods?.[1] ?? null;

  const visibleChickenProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.category === "Chicken" && supported?.[product.key] !== false,
      ),
    [products, supported],
  );

  const reportTitle = weekly
    ? `Weekly Egg and Chicken Sale Performance Report ${formatLongDate(
        weekly.startDate,
      )} - ${formatLongDate(weekly.endDate)}`
    : "Weekly Egg and Chicken Sale Performance Report";

  const currentEggRevenue = useMemo(
    () => sumProductValues(current?.products, EGG_KEYS, "revenue"),
    [current],
  );

  const currentChickenRevenue = useMemo(
    () => sumProductValues(current?.products, CHICKEN_KEYS, "revenue"),
    [current],
  );

  const currentChickenAllQty = useMemo(
    () => sumProductValues(current?.products, CHICKEN_KEYS),
    [current],
  );

  const currentMainChickenQty = useMemo(
    () => sumProductValues(current?.products, MAIN_CHICKEN_KEYS),
    [current],
  );

  const previousMainChickenQty = useMemo(
    () => sumProductValues(previous?.products, MAIN_CHICKEN_KEYS),
    [previous],
  );

  const groupTotals = useMemo(() => {
    const retailTray =
      getProductValue(split?.retail, "tray") +
      getProductValue(split?.unknown, "tray");

    const retailBox =
      getProductValue(split?.retail, "box") +
      getProductValue(split?.unknown, "box");

    const retailChicken =
      sumProductValues(split?.retail, MAIN_CHICKEN_KEYS) +
      sumProductValues(split?.unknown, MAIN_CHICKEN_KEYS);

    const retailTrayRevenue =
      getProductValue(split?.retail, "tray", "revenue") +
      getProductValue(split?.unknown, "tray", "revenue");

    const retailBoxRevenue =
      getProductValue(split?.retail, "box", "revenue") +
      getProductValue(split?.unknown, "box", "revenue");

    const retailChickenRevenue =
      sumProductValues(split?.retail, CHICKEN_KEYS, "revenue") +
      sumProductValues(split?.unknown, CHICKEN_KEYS, "revenue");

    return {
      retail: {
        tray: retailTray,
        box: retailBox,
        chicken: retailChicken,
        trayRevenue: retailTrayRevenue,
        boxRevenue: retailBoxRevenue,
        chickenRevenue: retailChickenRevenue,
      },
      bulk: {
        tray: getProductValue(split?.bulk, "tray"),
        box: getProductValue(split?.bulk, "box"),
        chicken: sumProductValues(split?.bulk, MAIN_CHICKEN_KEYS),
        trayRevenue: getProductValue(split?.bulk, "tray", "revenue"),
        boxRevenue: getProductValue(split?.bulk, "box", "revenue"),
        chickenRevenue: sumProductValues(split?.bulk, CHICKEN_KEYS, "revenue"),
      },
    };
  }, [split]);

  const areaTotals = useMemo(
    () =>
      areas.reduce(
        (result, area) => {
          result.retail.egg +=
            Number(area?.retail?.egg ?? 0) + Number(area?.unknown?.egg ?? 0);

          result.retail.chicken +=
            Number(area?.retail?.chicken ?? 0) +
            Number(area?.unknown?.chicken ?? 0);

          result.bulk.egg += Number(area?.bulk?.egg ?? 0);
          result.bulk.chicken += Number(area?.bulk?.chicken ?? 0);

          result.amount += Number(area?.amount ?? 0);

          return result;
        },
        {
          retail: { egg: 0, chicken: 0 },
          bulk: { egg: 0, chicken: 0 },
          amount: 0,
        },
      ),
    [areas],
  );

  const chickenChartData = useMemo(
    () =>
      visibleChickenProducts
        .map((product) => ({
          name: product.label,
          value: getProductValue(current?.products, product.key),
        }))
        .filter((item) => item.value > 0),
    [visibleChickenProducts, current],
  );

  const areaChartData = useMemo(
    () =>
      areas.map((area) => ({
        name: area.label,
        Collection: Number(area.amount ?? 0),
      })),
    [areas],
  );

  const comparisonDefinitions = useMemo(
    () => [
      {
        key: "tray",
        label: "Total Tray",
        value: (period) => getProductValue(period?.products, "tray"),
      },
      {
        key: "box",
        label: "Total Box",
        value: (period) => getProductValue(period?.products, "box"),
      },
      {
        key: "kids",
        label: "Total Kids Box",
        value: (period) => getProductValue(period?.products, "kids"),
      },
      {
        key: "women",
        label: "Total Women Box",
        value: (period) => getProductValue(period?.products, "women"),
      },
      {
        key: "curryCut",
        label: "Total Currycut (KG)",
        value: (period) => getProductValue(period?.products, "curryCut"),
      },
      {
        key: "premiumChicken",
        label: "Boneless + Breast + Tikka (KG)",
        value: (period) =>
          sumProductValues(period?.products, ["boneless", "breast", "tikka"]),
      },
      {
        key: "drumstick",
        label: "Total Drumstick (KG)",
        value: (period) => getProductValue(period?.products, "drumstick"),
      },
      {
        key: "wholeBird",
        label: "Total Whole Bird (KG)",
        value: (period) => getProductValue(period?.products, "wholeBird"),
      },
      {
        key: "wings",
        label: "Total Wings (KG)",
        value: (period) => getProductValue(period?.products, "wings"),
      },
      {
        key: "lollipop",
        label: "Total Lollipop (KG)",
        value: (period) => getProductValue(period?.products, "lollipop"),
      },
      {
        key: "restChicken",
        label: "Rest Chicken - Liver/Gizzard/Pet Food (KG)",
        value: (period) =>
          sumProductValues(period?.products, ["restChicken", "petFood"]),
      },
    ],
    [],
  );

  const comparisonChartData = useMemo(
    () =>
      comparisonDefinitions.map((item) => ({
        name: item.label
          .replace("Total ", "")
          .replace(" (KG)", "")
          .replace("Rest Chicken - ", ""),
        Previous: item.value(previous),
        Current: item.value(current),
      })),
    [comparisonDefinitions, previous, current],
  );

  const averageRows = useMemo(() => {
    const calculate = (period) => ({
      tray: getProductValue(period?.products, "tray") / 7,
      box: getProductValue(period?.products, "box") / 7,
      chicken: sumProductValues(period?.products, MAIN_CHICKEN_KEYS) / 7,
    });

    return [
      {
        key: "tray",
        label: "Tray average sale",
        values: periods.map((period) => calculate(period).tray),
      },
      {
        key: "box",
        label: "Box average sale",
        values: periods.map((period) => calculate(period).box),
      },
      {
        key: "chicken",
        label: "Chicken average sale",
        values: periods.map((period) => calculate(period).chicken),
      },
    ];
  }, [periods]);

  const averageChartData = useMemo(
    () =>
      averageRows.map((row) => ({
        name: row.label.replace(" average sale", ""),
        "Week -2": row.values?.[0] ?? 0,
        "Week -1": row.values?.[1] ?? 0,
        Current: row.values?.[2] ?? 0,
      })),
    [averageRows],
  );

  const quantityComparisonChart = useMemo(
    () => [
      {
        name: "Tray",
        Bulk: groupTotals.bulk?.tray ?? 0,
        Retail: groupTotals.retail?.tray ?? 0,
      },
      {
        name: "Box",
        Bulk: groupTotals.bulk?.box ?? 0,
        Retail: groupTotals.retail?.box ?? 0,
      },
      {
        name: "Chicken",
        Bulk: groupTotals.bulk?.chicken ?? 0,
        Retail: groupTotals.retail?.chicken ?? 0,
      },
    ],
    [groupTotals],
  );

  const revenueComparisonChart = useMemo(
    () => [
      {
        name: "Tray",
        Bulk: groupTotals.bulk?.trayRevenue ?? 0,
        Retail: groupTotals.retail?.trayRevenue ?? 0,
      },
      {
        name: "Box",
        Bulk: groupTotals.bulk?.boxRevenue ?? 0,
        Retail: groupTotals.retail?.boxRevenue ?? 0,
      },
      {
        name: "Chicken",
        Bulk: groupTotals.bulk?.chickenRevenue ?? 0,
        Retail: groupTotals.retail?.chickenRevenue ?? 0,
      },
    ],
    [groupTotals],
  );

  useEffect(() => {
    if (!weekly || !previous || !current) return;

    const previousTray = getProductValue(previous.products, "tray");
    const currentTray = getProductValue(current.products, "tray");

    const previousBox = getProductValue(previous.products, "box");
    const currentBox = getProductValue(current.products, "box");

    const previousRevenue = Number(previous.revenue ?? 0);
    const currentRevenue = Number(current.revenue ?? 0);
    const revenueDifference = currentRevenue - previousRevenue;

    const classifiedRevenue =
      Number(groupTotals.bulk?.trayRevenue ?? 0) +
      Number(groupTotals.bulk?.boxRevenue ?? 0) +
      Number(groupTotals.bulk?.chickenRevenue ?? 0) +
      Number(groupTotals.retail?.trayRevenue ?? 0) +
      Number(groupTotals.retail?.boxRevenue ?? 0) +
      Number(groupTotals.retail?.chickenRevenue ?? 0);

    const bulkRevenue =
      Number(groupTotals.bulk?.trayRevenue ?? 0) +
      Number(groupTotals.bulk?.boxRevenue ?? 0) +
      Number(groupTotals.bulk?.chickenRevenue ?? 0);

    const retailRevenue =
      Number(groupTotals.retail?.trayRevenue ?? 0) +
      Number(groupTotals.retail?.boxRevenue ?? 0) +
      Number(groupTotals.retail?.chickenRevenue ?? 0);

    const bulkShare =
      classifiedRevenue > 0 ? (bulkRevenue / classifiedRevenue) * 100 : 0;

    const retailShare =
      classifiedRevenue > 0 ? (retailRevenue / classifiedRevenue) * 100 : 0;

    setFindings([
      `Sale of egg trays ${getDirectionText(
        previousTray,
        currentTray,
      )} and boxes ${getDirectionText(previousBox, currentBox)}. Main chicken sale ${getDirectionText(
        previousMainChickenQty,
        currentMainChickenQty,
      )}.`,
      `Booked product sales changed by ${formatMoney(
        revenueDifference,
      )} compared with the previous week. Among classified Bulk/Retail sales, Bulk contributes about ${formatNumber(
        bulkShare,
        1,
      )}% and Retail about ${formatNumber(retailShare, 1)}%.`,
      `New buyers in this selected week: Retail ${formatNumber(
        Number(weekly.firstBuyers?.retail ?? 0) +
          Number(weekly.firstBuyers?.unknown ?? 0),
      )}, Bulk ${formatNumber(weekly.firstBuyers?.bulk)}. Unmatched contacts are included in Retail on this report.`,
      "Projected next week values are calculated automatically by applying the current week-over-week growth/decline rate once more.",
    ]);
  }, [
    weekly,
    previous,
    current,
    groupTotals,
    previousMainChickenQty,
    currentMainChickenQty,
  ]);

  const fetchData = () => {
    if (!selectedStartDate) return;

    dispatch(
      fetchWeeklyReport({
        startDate: selectedStartDate,
      }),
    );
  };

  const exportToExcel = async () => {
    if (!reportRef.current || !weekly || exporting) return;

    try {
      setExporting(true);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sagar";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Weekly Report", {
        properties: {
          defaultRowHeight: 15,
        },
        views: [{ showGridLines: false }],
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.25,
            right: 0.25,
            top: 0.25,
            bottom: 0.25,
            header: 0.1,
            footer: 0.1,
          },
        },
      });

      const imageId = workbook.addImage({
        base64: canvas.toDataURL("image/png"),
        extension: "png",
      });

      const exportWidth = Math.round(canvas.width / 1.5);
      const exportHeight = Math.round(canvas.height / 1.5);

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: {
          width: exportWidth,
          height: exportHeight,
        },
      });

      const approximateColumns = Math.max(20, Math.ceil(exportWidth / 64));

      for (let column = 1; column <= approximateColumns; column += 1) {
        worksheet.getColumn(column).width = 8.43;
      }

      const approximateRows = Math.max(50, Math.ceil(exportHeight / 20));

      for (let row = 1; row <= approximateRows; row += 1) {
        worksheet.getRow(row).height = 15;
      }

      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Weekly_Report_${weekly.startDate}_to_${weekly.endDate}.xlsx`,
      );
    } catch (exportError) {
      console.error("Weekly report Excel export failed:", exportError);
      alert("Excel export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const updateFinding = (index, value) => {
    setFindings((previousValue) =>
      previousValue.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  };

  const errorMessage =
    typeof error === "string"
      ? error
      : error?.message || (error ? "Report fetch failed" : "");

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.toolbarTitle}>Weekly Performance Report</h2>
          <p className={styles.toolbarText}>
            Select the first date of the 7-day period. End date is calculated
            automatically.
          </p>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label htmlFor="weekly-start-date">Week Start Date</label>
            <input
              id="weekly-start-date"
              type="date"
              value={selectedStartDate}
              onChange={(event) => setSelectedStartDate(event.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Week End Date</label>
            <div className={styles.readOnlyDate}>
              {selectedEndDate ? formatLongDate(selectedEndDate) : "-"}
            </div>
          </div>

          <button
            type="button"
            className={styles.getReportButton}
            onClick={fetchData}
            disabled={weeklyLoading || !selectedStartDate}
          >
            {weeklyLoading ? "Loading..." : "Get Report"}
          </button>

          <button
            type="button"
            className={styles.exportExcelButton}
            onClick={exportToExcel}
            disabled={weeklyLoading || !weekly || exporting}
          >
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      {weeklyLoading && (
        <div className={styles.loadingBox}>Loading weekly report...</div>
      )}

      {!weeklyLoading && !weekly && !errorMessage && (
        <div className={styles.emptyState}>
          Select a week start date and click <strong>Get Report</strong>.
        </div>
      )}

      {!weeklyLoading && weekly && (
        <div className={styles.sheetScroller}>
          <div className={styles.sheet} ref={reportRef}>
            <div className={styles.mainTitle}>{reportTitle}</div>

            <div className={styles.sectionGrid}>
              <section>
                <div className={`${styles.sectionTitle} ${styles.greenTitle}`}>
                  Tray and Box Sale ({formatDate(weekly.startDate)} to{" "}
                  {formatDate(weekly.endDate)})
                </div>

                <div className={styles.tableScroll}>
                  <table className={styles.excelTable}>
                    <thead>
                      <tr>
                        <th rowSpan={2}>Date</th>
                        <th rowSpan={2}>Day</th>
                        <th colSpan={2} className={styles.peachCell}>
                          Total
                        </th>
                        <th colSpan={2} className={styles.peachCell}>
                          Retail
                        </th>
                        <th colSpan={2} className={styles.peachCell}>
                          Bulk
                        </th>
                      </tr>

                      <tr>
                        <th>Tray</th>
                        <th>Box</th>
                        <th>Tray</th>
                        <th>Box</th>
                        <th>Tray</th>
                        <th>Box</th>
                      </tr>
                    </thead>

                    <tbody>
                      {days.map((day) => (
                        <tr key={day.date}>
                          <td>{formatDate(day.date)}</td>
                          <td>{getDayName(day.date)}</td>
                          <td>{formatNumber(day.total?.tray?.quantity)}</td>
                          <td>{formatNumber(day.total?.box?.quantity)}</td>
                          <td>
                            {formatNumber(
                              Number(day.retail?.tray?.quantity ?? 0) +
                                Number(day.unknown?.tray?.quantity ?? 0),
                            )}
                          </td>
                          <td>
                            {formatNumber(
                              Number(day.retail?.box?.quantity ?? 0) +
                                Number(day.unknown?.box?.quantity ?? 0),
                            )}
                          </td>
                          <td>{formatNumber(day.bulk?.tray?.quantity)}</td>
                          <td>{formatNumber(day.bulk?.box?.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <td colSpan={2}>Total</td>
                        <td>
                          {formatNumber(current?.products?.tray?.quantity)}
                        </td>
                        <td>
                          {formatNumber(current?.products?.box?.quantity)}
                        </td>
                        <td>{formatNumber(groupTotals.retail?.tray)}</td>
                        <td>{formatNumber(groupTotals.retail?.box)}</td>
                        <td>{formatNumber(groupTotals.bulk?.tray)}</td>
                        <td>{formatNumber(groupTotals.bulk?.box)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className={styles.noteRow}>
                  * Sale amount received from eggs is approximately{" "}
                  <strong>{formatMoney(currentEggRevenue)}</strong> (Tray, Box,
                  Kids Box and Women Box).
                </div>
              </section>

              <section className={styles.chickenSection}>
                <div className={`${styles.sectionTitle} ${styles.greenTitle}`}>
                  Chicken Sale ({formatDate(weekly.startDate)} to{" "}
                  {formatDate(weekly.endDate)})
                </div>

                <div className={styles.chickenLayout}>
                  <div className={styles.tableScroll}>
                    <table className={styles.excelTable}>
                      <thead>
                        <tr>
                          <th>Product Type</th>
                          <th>KG</th>
                          <th>% Sale</th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleChickenProducts.map((product) => {
                          const quantity = getProductValue(
                            current?.products,
                            product.key,
                          );

                          const percent =
                            currentChickenAllQty > 0
                              ? (quantity / currentChickenAllQty) * 100
                              : 0;

                          return (
                            <tr key={product.key}>
                              <td className={styles.leftCell}>
                                {product.label}
                              </td>
                              <td>{formatNumber(quantity)}</td>
                              <td>{formatNumber(percent, 0)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>

                      <tfoot>
                        <tr>
                          <td>Total sale chicken</td>
                          <td colSpan={2}>
                            {formatNumber(currentMainChickenQty)} KG
                            <span className={styles.smallText}>
                              {" "}
                              (excluding Pet Food and Liver + Gizzard)
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className={styles.noteRow}>
                      * Sale amount received from chicken is approximately{" "}
                      <strong>{formatMoney(currentChickenRevenue)}</strong>.
                    </div>
                  </div>

                  <div className={styles.chartBox}>
                    <div className={styles.chartTitle}>Weekly Chicken Sale</div>
                    <ResponsiveContainer width="100%" height={290}>
                      <PieChart>
                        <Pie
                          data={chickenChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={95}
                          paddingAngle={1}
                        >
                          {chickenChartData.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `${formatNumber(value)} KG`,
                            "Sale",
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>

            <section className={styles.blockSection}>
              <div
                className={`${styles.bigSectionTitle} ${styles.purpleTitle}`}
              >
                Weekly Area Wise Egg and Chicken Sale
              </div>

              <div className={styles.areaGrid}>
                <div>
                  <div
                    className={`${styles.sectionTitle} ${styles.greenTitle}`}
                  >
                    Area Wise Sale Report (No. of Orders)
                  </div>

                  <div className={styles.tableScroll}>
                    <table className={styles.excelTable}>
                      <thead>
                        <tr>
                          <th rowSpan={2}>Area</th>
                          <th colSpan={2}>Retail</th>
                          <th colSpan={2}>Bulk</th>
                          <th rowSpan={2}>Collection</th>
                        </tr>
                        <tr>
                          <th>Egg</th>
                          <th>Chicken</th>
                          <th>Egg</th>
                          <th>Chicken</th>
                        </tr>
                      </thead>

                      <tbody>
                        {areas.map((area) => (
                          <tr key={area.label}>
                            <td className={styles.leftCell}>{area.label}</td>
                            <td>
                              {formatNumber(
                                Number(area.retail?.egg ?? 0) +
                                  Number(area.unknown?.egg ?? 0),
                              )}
                            </td>
                            <td>
                              {formatNumber(
                                Number(area.retail?.chicken ?? 0) +
                                  Number(area.unknown?.chicken ?? 0),
                              )}
                            </td>
                            <td>{formatNumber(area.bulk?.egg)}</td>
                            <td>{formatNumber(area.bulk?.chicken)}</td>
                            <td>{formatMoney(area.amount)}</td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td>{formatNumber(areaTotals.retail.egg)}</td>
                          <td>{formatNumber(areaTotals.retail.chicken)}</td>
                          <td>{formatNumber(areaTotals.bulk.egg)}</td>
                          <td>{formatNumber(areaTotals.bulk.chicken)}</td>
                          <td>{formatMoney(areaTotals.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>
                    Weekly Area Wise Collection
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={areaChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={110}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => [
                          formatMoney(value),
                          "Collection",
                        ]}
                      />
                      <Bar dataKey="Collection" fill="#4472C4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {weekly.unmappedAreas?.length > 0 && (
                <div className={styles.warningNote}>
                  <span>
                    Unmapped areas are grouped under <strong>Other</strong>:{" "}
                    {weekly.unmappedAreas.join(", ")}.
                  </span>
                </div>
              )}
            </section>

            <section className={styles.blockSection}>
              <div className={`${styles.bigSectionTitle} ${styles.greenTitle}`}>
                Weekly Comparison of Sale
              </div>

              <div className={styles.comparisonGrid}>
                <div className={styles.tableScroll}>
                  <table className={styles.excelTable}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>
                          Previous Week
                          <span className={styles.headerDate}>
                            {formatDate(previous?.start)} -{" "}
                            {formatDate(previous?.end)}
                          </span>
                        </th>
                        <th>
                          Current Week
                          <span className={styles.headerDate}>
                            {formatDate(current?.start)} -{" "}
                            {formatDate(current?.end)}
                          </span>
                        </th>
                        <th>Change</th>
                        <th className={styles.projectionHeader}>
                          Projected Next Week
                          <span className={styles.headerDate}>Auto</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {comparisonDefinitions.map((item) => {
                        const previousValue = item.value(previous);
                        const currentValue = item.value(current);

                        return (
                          <tr key={item.key}>
                            <td className={styles.leftCell}>{item.label}</td>
                            <td>{formatNumber(previousValue)}</td>
                            <td>{formatNumber(currentValue)}</td>
                            <td>
                              {displayChange(previousValue, currentValue)}
                            </td>
                            <td className={styles.projectionCell}>
                              {formatNumber(
                                projectNextWeek(previousValue, currentValue),
                                2,
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>
                    Weekly Comparison Sale - Eggs and Chicken
                  </div>
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={110}
                        tick={{ fontSize: 9 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Previous"
                        stroke="#4472C4"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="Current"
                        stroke="#ED7D31"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className={styles.blockSection}>
              <div className={styles.averageGrid}>
                <div>
                  <div
                    className={`${styles.sectionTitle} ${styles.greenTitle}`}
                  >
                    Average Sale Per Week
                  </div>

                  <div className={styles.tableScroll}>
                    <table className={styles.excelTable}>
                      <thead>
                        <tr>
                          <th>Average</th>
                          {periods.map((period) => (
                            <th key={`${period.start}-${period.end}`}>
                              {formatDate(period.start)} -{" "}
                              {formatDate(period.end)}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {averageRows.map((row) => (
                          <tr key={row.key}>
                            <td className={styles.leftCell}>{row.label}</td>
                            {row.values.map((value, index) => (
                              <td key={`${row.key}-${index}`}>
                                {formatNumber(value, 2)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>
                    3 Week Average Sale Comparison
                  </div>
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={averageChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Week -2" fill="#4472C4" />
                      <Bar dataKey="Week -1" fill="#70AD47" />
                      <Bar dataKey="Current" fill="#5B9BD5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className={styles.blockSection}>
              <div className={styles.salesComparisonGrid}>
                <div>
                  <div className={`${styles.sectionTitle} ${styles.blueTitle}`}>
                    Total Sale Comparison
                  </div>

                  <table className={styles.excelTable}>
                    <thead>
                      <tr>
                        <th>Products</th>
                        <th>Bulk</th>
                        <th>Retail</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className={styles.leftCell}>Tray</td>
                        <td>{formatNumber(groupTotals.bulk?.tray)}</td>
                        <td>{formatNumber(groupTotals.retail?.tray)}</td>
                      </tr>
                      <tr>
                        <td className={styles.leftCell}>Box</td>
                        <td>{formatNumber(groupTotals.bulk?.box)}</td>
                        <td>{formatNumber(groupTotals.retail?.box)}</td>
                      </tr>
                      <tr>
                        <td className={styles.leftCell}>
                          Chicken (KG)
                          <span className={styles.smallText}>
                            {" "}
                            excluding Pet Food and Liver + Gizzard
                          </span>
                        </td>
                        <td>{formatNumber(groupTotals.bulk?.chicken)}</td>
                        <td>{formatNumber(groupTotals.retail?.chicken)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>
                    Total Sale Comparison (Bulk vs Retail)
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={quantityComparisonChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Bulk" fill="#4472C4" />
                      <Bar dataKey="Retail" fill="#C0504D" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={styles.salesComparisonGrid}>
                <div>
                  <div className={`${styles.sectionTitle} ${styles.blueTitle}`}>
                    Total Sale Comparison (By Revenue - In Rupees)
                  </div>

                  <table className={styles.excelTable}>
                    <thead>
                      <tr>
                        <th>Products</th>
                        <th>Bulk</th>
                        <th>Retail</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className={styles.leftCell}>Tray</td>
                        <td>{formatMoney(groupTotals.bulk?.trayRevenue)}</td>
                        <td>{formatMoney(groupTotals.retail?.trayRevenue)}</td>
                      </tr>
                      <tr>
                        <td className={styles.leftCell}>Box</td>
                        <td>{formatMoney(groupTotals.bulk?.boxRevenue)}</td>
                        <td>{formatMoney(groupTotals.retail?.boxRevenue)}</td>
                      </tr>
                      <tr>
                        <td className={styles.leftCell}>Chicken</td>
                        <td>{formatMoney(groupTotals.bulk?.chickenRevenue)}</td>
                        <td>
                          {formatMoney(groupTotals.retail?.chickenRevenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={styles.chartBox}>
                  <div className={styles.chartTitle}>
                    Total Sale Comparison (In Rupees)
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenueComparisonChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Legend />
                      <Bar dataKey="Bulk" fill="#4472C4" />
                      <Bar dataKey="Retail" fill="#C0504D" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className={styles.blockSection}>
              <div className={`${styles.sectionTitle} ${styles.blueTitle}`}>
                This Week Tray and Box Rate
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.excelTable}>
                  <thead>
                    <tr>
                      <th>Tray</th>
                      <th>Box</th>
                      <th>Bulk Tray</th>
                      <th>Bulk Box</th>
                      <th>Women Box</th>
                      <th>Kids Box</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{joinRates(prices?.retail?.tray)}</td>
                      <td>{joinRates(prices?.retail?.box)}</td>
                      <td>{joinRates(prices?.bulk?.tray)}</td>
                      <td>{joinRates(prices?.bulk?.box)}</td>
                      <td>{joinRates(prices?.all?.women)}</td>
                      <td>{joinRates(prices?.all?.kids)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                className={`${styles.sectionTitle} ${styles.blueTitle} ${styles.rateTitle}`}
              >
                This Week Chicken Rate
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.excelTable}>
                  <thead>
                    <tr>
                      <th>Curry Cut</th>
                      <th>Boneless / Tikka / Breast</th>
                      <th>Drumstick</th>
                      <th>Wings</th>
                      <th>Whole Bird</th>
                      <th>Pet Food</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{joinRates(pricesKg?.curryCut)}</td>
                      <td>
                        {joinRates([
                          ...(pricesKg?.boneless ?? []),
                          ...(pricesKg?.tikka ?? []),
                          ...(pricesKg?.breast ?? []),
                        ])}
                      </td>
                      <td>{joinRates(pricesKg?.drumstick)}</td>
                      <td>{joinRates(pricesKg?.wings)}</td>
                      <td>{joinRates(pricesKg?.wholeBird)}</td>
                      <td>{joinRates(pricesKg?.petFood)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.blockSection}>
              <div className={`${styles.sectionTitle} ${styles.findingsTitle}`}>
                Findings
              </div>

              <div className={styles.findings}>
                {findings.map((finding, index) => (
                  <div className={styles.findingRow} key={index}>
                    <span>{index + 1}.</span>
                    <textarea
                      value={finding}
                      onChange={(event) =>
                        updateFinding(index, event.target.value)
                      }
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.blockSection}>
              <div className={`${styles.sectionTitle} ${styles.greenTitle}`}>
                Report Basis / Notes
              </div>

              <ol className={styles.basisList}>
                {(weekly.basis ?? []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            </section>

            <section className={styles.preparedBy}>
              <strong>Prepared By :</strong>
              <input
                type="text"
                value={preparedBy}
                onChange={(event) => setPreparedBy(event.target.value)}
                placeholder="Enter name"
              />
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
