import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWeeklyReport } from "../../features/reportSlice";

const WeeklyReport = () => {
  const dispatch = useDispatch();
  const { weekly, weeklyLoading, error } = useSelector((state) => state.report);

  // Current date se shuru kar rahe hain (January 2026)
  const currentYear = new Date().getFullYear(); // 2026
  const currentMonth = new Date().getMonth() + 1; // 1 = January

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Month ke last date ke hisaab se max weeks calculate karenge
  const getMaxWeeks = (year, month) => {
    const lastDay = new Date(year, month, 0).getDate(); // last day of month
    return Math.ceil(lastDay / 7);
  };

  const maxWeeks = getMaxWeeks(selectedYear, selectedMonth);

  // Jab month/year change ho to week reset kar do (1 pe)
  useEffect(() => {
    setSelectedWeek(1);
  }, [selectedYear, selectedMonth]);

  const fetchData = () => {
    dispatch(
      fetchWeeklyReport({
        year: selectedYear,
        month: selectedMonth,
        week: selectedWeek,
      })
    );
  };

  // Debugging logs (production mein hata sakte ho)
  console.log(
    "Current report state:",
    useSelector((state) => state.report)
  );
  console.log("Weekly state full:", weekly);
  console.log("Weekly data length:", weekly?.data?.length);

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h3>Weekly Report</h3>

      {/* Year & Month Selector */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label>Year: </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        <div>
          <label>Month: </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Week: </label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
          >
            {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => {
              const start = (w - 1) * 7 + 1;
              const end = Math.min(
                w * 7,
                new Date(selectedYear, selectedMonth, 0).getDate()
              );
              return (
                <option key={w} value={w}>
                  Week {w} ({start} – {end})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <button
        onClick={fetchData}
        disabled={weeklyLoading}
        style={{
          padding: "10px 20px",
          background: weeklyLoading ? "#ccc" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: weeklyLoading ? "not-allowed" : "pointer",
        }}
      >
        {weeklyLoading ? "Loading..." : "Get Weekly Report"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>Error: {error}</p>
      )}

      {/* Result Display */}
      {weeklyLoading ? (
        <p>Loading report...</p>
      ) : weekly?.data?.length > 0 ? (
        <div style={{ marginTop: "25px" }}>
          <h4>
            Week {selectedWeek} ({selectedMonth}/{selectedYear}) Report
          </h4>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "15px",
                background: "#fff",
                boxShadow: "0 1px 5px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ background: "#f0f8ff" }}>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Orders</th>
                  <th style={tableHeaderStyle}>Total Sales</th>
                  <th style={tableHeaderStyle}>Product</th>
                  <th style={tableHeaderStyle}>Qty Sold</th>
                  <th style={tableHeaderStyle}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {weekly.data.map((row, index) => (
                  <tr key={index} style={index % 2 === 0 ? evenRow : oddRow}>
                    <td style={cellStyle}>
                      {new Date(row.OrderDate).toLocaleDateString()}
                    </td>
                    <td style={cellStyle}>{row.Orders}</td>
                    <td style={cellStyle}>
                      ₹{Number(row.TotalSales).toFixed(2)}
                    </td>
                    <td style={cellStyle}>
                      {row.ProductName || row.ProductType || "—"}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      {row.QuantitySold || 0}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      ₹
                      {Number(
                        row.ProductTotalAmount || row.ProductSales || 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: "20px", color: "#666" }}>
          No data available for Week {selectedWeek} of {selectedMonth}/
          {selectedYear}
        </p>
      )}
    </div>
  );
};

// Table styling
const tableHeaderStyle = {
  padding: "12px",
  border: "1px solid #ddd",
  background: "#f0f8ff",
  textAlign: "left",
};

const cellStyle = {
  padding: "10px",
  border: "1px solid #ddd",
};

const evenRow = { background: "#f9f9f9" };
const oddRow = { background: "#ffffff" };

export default WeeklyReport;
