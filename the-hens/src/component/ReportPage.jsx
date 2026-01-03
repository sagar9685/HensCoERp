import { useState } from "react";
import MonthlyReport from "./Reports/MonthlyReport";
import WeeklyReport from "./Reports/WeeklyReport";
import styles from "./ReportPage.module.css";

const ReportPage = () => {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <div className={styles.container}>
      <h2>Reports</h2>

      {/* TABS */}
      <div className={styles.tabs}>
        <button
          className={activeTab === "monthly" ? styles.active : ""}
          onClick={() => setActiveTab("monthly")}
        >
          Monthly Report
        </button>

        <button
          className={activeTab === "weekly" ? styles.active : ""}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly Report
        </button>
      </div>

      {/* CONTENT */}
      <div className={styles.content}>
        {activeTab === "monthly" && <MonthlyReport />}
        {activeTab === "weekly" && <WeeklyReport />}
      </div>
    </div>
  );
};

export default ReportPage;
