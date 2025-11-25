import { Link } from "react-router";
import { FaUserCircle } from 'react-icons/fa';
 

const UserSideBar = () => {
    return(
        <>
 
      <nav className="sidebar sidebar-offcanvas" id="sidebar">
        <div className="sidebar-brand-wrapper d-none d-lg-flex align-items-center justify-content-center fixed-top">
          <a className="sidebar-brand brand-logo" href="index.html"><img src="./img/logo.png" alt="logo" /></a>
          <a className="sidebar-brand brand-logo-mini" href="index.html"><img src="./src/assets/images/logo-mini.svg" alt="logo" /></a>
        </div>
        <ul className="nav">
          
          
          <li className="nav-item menu-items">
            <a className="nav-link" href="index.html">
              <span className="menu-icon">
                <i className="mdi mdi-speedometer"></i>
              </span>
              <span className="menu-title">Dashboard</span>
            </a>
          </li>
         

                 <li class="nav-item menu-items">
            <Link className="nav-link" to='/userForm'>
              <span class="menu-icon">
                <i class="mdi mdi-playlist-play"></i>
              </span>
              <span class="menu-title">Assign Order</span>
            </Link>
          </li>

                        <li className="nav-item menu-items">
                <Link className="nav-link" to="/datatable">
                    <span className="menu-icon">
                    <i className="mdi mdi-table-large"></i>
                    </span>
                    <span className="menu-title">Delivery Boy Cash</span>
                </Link>
                </li>
           
          <li className="nav-item menu-items">
            <Link className="nav-link" to='/chart'>
              <span className="menu-icon">
                <i className="mdi mdi-chart-bar"></i>
              </span>
              <span className="menu-title">Charts</span>
            </Link>
          </li>
          {/* <li className="nav-item menu-items">
            <a className="nav-link" href="pages/icons/mdi.html">
              <span className="menu-icon">
                <i className="mdi mdi-contacts"></i>
              </span>
              <span className="menu-title">Icons</span>
            </a>
          </li> */}
          
         
        </ul>
      </nav>
     
        </>
    )
}

export default UserSideBar;