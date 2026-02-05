import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Login from "./component/Login";
import Dashboard from "./pages/DashBoard";
import UserPage from "./pages/HomePage"; //
import ProtectedRoute from "./component/ProtectedRoute";
import "react-toastify/dist/ReactToastify.css";
import UserDataTable from "./component/user/UserDataCash/UserDataTable";
import UserForm from "./component/user/UserForm";
import UserChart from "./component/user/UserChart";
import Purchase from "./component/AdminPurchase/Purchase";
import Stock from "./component/user/Stock";
import Customer from "./component/Customer";
import CustomerAnalysis from "./component/CustomerAnalysis";
import ReportPage from "./component/ReportPage";
import ImportArea from "./pages/ImportArea";
import AnalysisDashboard from "./component/AnalysisDashBoard/AnalysisDashboard";
import Support from "./component/Support";
import RejectStock from "./component/user/RejectStock";
import DeliverySummary from "./component/user/DeliverySummary";
 
import AIAssistant from "./component/AIAssistant";

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={2000} />
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Admin dashboard protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute adminOnly={true}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase"
          element={
            <ProtectedRoute adminOnly={true}>
              <Purchase />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute adminOnly={true}>
              <Customer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer-analysis"
          element={
            <ProtectedRoute adminOnly={true}>
              <CustomerAnalysis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute adminOnly={true}>
              <ReportPage />
            </ProtectedRoute>
          }
        />

         <Route
          path="/ai-question"
          element={
            <ProtectedRoute adminOnly={true}>
            <AIAssistant/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analysis"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnalysisDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/area-import"
          element={
            <ProtectedRoute adminOnly={true}>
              <ImportArea />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support"
          element={
            <ProtectedRoute adminOnly={true}>
              <Support />
            </ProtectedRoute>
          }
        />

        {/* Normal user page */}
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/datatable"
          element={
            <ProtectedRoute>
              <UserDataTable />
            </ProtectedRoute>
          }
        />

        <Route
          path="/userForm"
          element={
            <ProtectedRoute>
              <UserForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chart"
          element={
            <ProtectedRoute>
              <UserChart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rejected-stock"
          element={
            <ProtectedRoute>
              <RejectStock />
            </ProtectedRoute>
          }
        />

         <Route
          path="/delivery-summary"
          element={
            <ProtectedRoute>
            <DeliverySummary/>
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
