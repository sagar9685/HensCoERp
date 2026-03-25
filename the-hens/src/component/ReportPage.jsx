import { useState } from "react";
import MonthlyReport from "./Reports/MonthlyReport";
import WeeklyReport from "./Reports/WeeklyReport";
import DailyReport from "./Reports/DailyReport";
import styles from "./ReportPage.module.css";
import Header from "./Header";
import CustomerReport from "./Reports/CustomerReport";
import CustomerLedger from "./Reports/CustomerLedger";
import MonthlyCompareReport from "./Reports/MonthlyCompareReport";
import WeeklyCompare from "./Reports/WeeklyCompare";
import CustomerDateRangeReport from "./Reports/CustomerDateRangeReport";

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

          <button
            className={activeTab === "monthlycompare" ? styles.active : ""}
            onClick={() => setActiveTab("monthlycompare")}
          >
            Monthly Compare
          </button>

          <button
            className={activeTab === "weeklycompare" ? styles.active : ""}
            onClick={() => setActiveTab("weeklycompare")}
          >
            weekly Compare
          </button>

          <button
            className={activeTab === "customerreport" ? styles.active : ""}
            onClick={() => setActiveTab("customerreport")}
          >
            Customer Analytics
          </button>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          {activeTab === "monthly" && <MonthlyReport />}
          {activeTab === "weekly" && <WeeklyReport />}
          {activeTab == "daily" && <DailyReport />}
          {activeTab == "customer" && <CustomerReport />}
          {activeTab == "ledger" && <CustomerLedger />}
          {activeTab == "monthlycompare" && <MonthlyCompareReport />}
          {activeTab == "weeklycompare" && <WeeklyCompare />}
          {activeTab == "customerreport" && <CustomerDateRangeReport />}
        </div>
      </div>
    </>
  );
};

export default ReportPage;
