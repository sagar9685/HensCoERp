import { useState } from "react";
import MonthlyReport from "./Reports/MonthlyReport";
import WeeklyReport from "./Reports/WeeklyReport";
import DailyReport from "./Reports/DailyReport";
import styles from "./ReportPage.module.css";
import Header from "./Header";

const ReportPage = () => {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <>
      <Header />
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

           <button
            className={activeTab === "daily" ? styles.active : ""}
            onClick={() => setActiveTab("daily")}
          >
            Daily Report
          </button>

        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          {activeTab === "monthly" && <MonthlyReport />}
          {activeTab === "weekly" && <WeeklyReport />}
          {activeTab == "daily" && <DailyReport/>}
        </div>
      </div>
    </>
  );
};

export default ReportPage;
