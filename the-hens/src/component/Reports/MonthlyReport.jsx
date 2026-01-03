import { useDispatch, useSelector } from "react-redux";
import { fetchMonthlyReport } from "../../features/reportSlice";

const MonthlyReport = () => {
  const dispatch = useDispatch();
  const { monthly, loading, error } = useSelector(state => state.report);

  const fetchData = () => {
    dispatch(fetchMonthlyReport({ year: 2025, month: 1 }));
  };

  return (
    <>
      <button onClick={fetchData} disabled={loading}>
        {loading ? "Loading..." : "Get Monthly Report"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {monthly && (
        <>
          <p>Total Orders: {monthly.summary.TotalOrders}</p>
          <p>Total Sales: ₹{monthly.summary.TotalSales}</p>

          {monthly.payment.map(p => (
            <p key={p.ModeName}>
              {p.ModeName} : ₹{p.Amount}
            </p>
          ))}
        </>
      )}
    </>
  );
};

export default MonthlyReport;
