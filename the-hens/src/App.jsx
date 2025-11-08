import AdminDashboard from "./component/AdminDashboard";
import Header from "./component/Header";
import { ToastContainer } from "react-toastify";

 function App () {
  return(
    <>
      <ToastContainer position="top-right" autoClose={2000} />

      
    <Header/>
  <AdminDashboard/>
    </>
  )
 }

 export default App;