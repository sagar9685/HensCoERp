import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyReport } from "../../features/reportSlice";

const MonthlyReport = () => {
  const dispatch = useDispatch();
  const { monthly, monthlyLoading, error } = useSelector(
    (state) => state.report
  );

  // Default current year aur month (January 2026)
  const currentYear = new Date().getFullYear(); // 2026
  const currentMonth = new Date().getMonth() + 1; // 1 = January

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const fetchData = () => {
    dispatch(
      fetchMonthlyReport({
        year: selectedYear,
        month: selectedMonth,
      })
    );
  };

  // Debugging logs
  console.log(
    "Current report state:",
    useSelector((state) => state.report)
  );
  console.log("Monthly state:", monthly);

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <h3>Monthly Report</h3>

      {/* Year & Month Selector */}
      <div
        style={{
          marginBottom: "25px",
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>
            Year:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>
            Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ padding: "8px", fontSize: "16px" }}
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
      </div>

      <button
        onClick={fetchData}
        disabled={monthlyLoading}
        style={{
          padding: "12px 25px",
          background: monthlyLoading ? "#ccc" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "16px",
          cursor: monthlyLoading ? "not-allowed" : "pointer",
          marginBottom: "20px",
        }}
      >
        {monthlyLoading ? "Loading..." : "Get Monthly Report"}
      </button>

      {error && (
        <p style={{ color: "red", fontWeight: "bold", marginBottom: "20px" }}>
          Error: {error}
        </p>
      )}

      {/* Summary Section */}
      <div
        style={{
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h4 style={{ marginTop: 0 }}>
          {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}{" "}
          Summary
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
          }}
        >
          <div>
            <p style={{ fontSize: "18px", margin: "8px 0" }}>
              <strong>Total Orders:</strong>{" "}
              {monthly?.summary?.TotalOrders || 0}
            </p>
            <p style={{ fontSize: "18px", margin: "8px 0" }}>
              <strong>Total Sales:</strong> ₹
              {Number(monthly?.summary?.TotalSales || 0).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </p>
          </div>

          <div>
            <p style={{ fontSize: "18px", margin: "8px 0", color: "#d32f2f" }}>
              <strong>Total Outstanding:</strong> ₹
              {Number(monthly?.summary?.TotalOutstanding || 0).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </p>
          </div>
        </div>

        {/* Payment Breakup */}
        <h5 style={{ margin: "25px 0 10px" }}>Payment Methods:</h5>
        {monthly?.payment?.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {monthly.payment.map((p) => (
              <li
                key={p.ModeName}
                style={{
                  margin: "8px 0",
                  fontSize: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  maxWidth: "400px",
                }}
              >
                <span>{p.ModeName}</span>
                <strong>
                  ₹
                  {Number(p.Amount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#666" }}>No payment data available</p>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
