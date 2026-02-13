import { useState } from "react";
import MonthlyReport from "./Reports/MonthlyReport";
import WeeklyReport from "./Reports/WeeklyReport";
import DailyReport from "./Reports/DailyReport";
import styles from "./ReportPage.module.css";
import Header from "./Header";
import CustomerReport from "./Reports/CustomerReport";
import CustomerLedger from "./Reports/CustomerLedger";

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

          <button
            className={activeTab === "customer" ? styles.active : ""}
            onClick={() => setActiveTab("customer")}
          >
            Customer Report
          </button>

          <button
            className={activeTab === "ledger" ? styles.active : ""}
            onClick={() => setActiveTab("ledger")}
          >
            Customer Ledger
          </button>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          {activeTab === "monthly" && <MonthlyReport />}
          {activeTab === "weekly" && <WeeklyReport />}
          {activeTab == "daily" && <DailyReport />}
          {activeTab == "customer" && <CustomerReport />}
          {activeTab == "ledger" && <CustomerLedger />}
        </div>
      </div>
    </>
  );
};

export default ReportPage;
