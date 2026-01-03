import { useDispatch, useSelector } from "react-redux";
import { fetchWeeklyReport } from "../../features/reportSlice";

const WeeklyReport = () => {
  const dispatch = useDispatch();
  const { weekly, loading, error } = useSelector(state => state.report);
  console.log("weekly",weekly)

  const fetchData = () => {
    dispatch(fetchWeeklyReport({ month: 1, from: 1, to: 7 }));
  };

  return (
    <>
      <button onClick={fetchData} disabled={loading}>
        {loading ? "Loading..." : "Get Weekly Report"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {weekly.map(d => (
        <p key={d.OrderDate}>
          {d.OrderDate} | Orders: {d.Orders} | ₹{d.Sales}
        </p>
      ))}
    </>
  );
};

export default WeeklyReport;
