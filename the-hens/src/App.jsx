import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Login from "./component/Login";
import Dashboard from "./pages/DashBoard";
import UserPage from "./pages/HomePage"; //
import ProtectedRoute from "./component/ProtectedRoute";
 
import UserDataTable from "./component/user/UserDataCash/UserDataTable";
import UserForm from "./component/user/UserForm";
import UserChart from "./component/user/UserChart";

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

        {/* Normal user page */}
        <Route 
          path="/user" 
          element={
            <ProtectedRoute>
              <UserPage />

            </ProtectedRoute>
          } 
        />

        <Route path = '/datatable' element = {
          <ProtectedRoute>
          <UserDataTable/>
        </ProtectedRoute>
        }
        />

         <Route path = '/userForm' element = {
          <ProtectedRoute>
          <UserForm/>
        </ProtectedRoute>
        }
        />

         <Route path = '/chart' element = {
          <ProtectedRoute>
          <UserChart/>
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
