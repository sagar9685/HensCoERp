import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleSidebar } from "../../features/uiSlice";
// import { logout } from "../../features/authSlice"; // Apna auth action import karein
import styles from "./UserSideBar.module.css";

const UserSideBar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const user = useSelector((state) => state.auth.user);

  const menuItems = [
    // { path: "/user", icon: "mdi mdi-speedometer", label: "Dashboard" },
    { path: "/userForm", icon: "mdi mdi-playlist-play", label: "Assign Order" },
    { path: "/datatable", icon: "mdi mdi-table-large", label: "Delivery Cash" },
    { path: "/stock", icon: "mdi mdi-package-variant", label: "Stock" },
    {
      path: "/rejected",
      icon: "mdi mdi-package-variant",
      label: "Rejected Stock",
    },
  ];

  const handleToggle = () => dispatch(toggleSidebar());

  const handleLogout = () => {
    // dispatch(logout()); // Redux logout action
    localStorage.removeItem("token"); // Example
    navigate("/login");
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 992) {
      dispatch(toggleSidebar());
    }
  };

  return (
    <>
      {/* 1. Mobile Overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={handleToggle} />}

      {/* 2. Sidebar Main Container */}
      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? styles.open : styles.closed
        }`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" />
              ) : (
                <i className="mdi mdi-account-circle"></i>
              )}
            </div>
            <div className={styles.userDetails}>
              <h3>{user?.name || "Admin User"}</h3>
              <p>{user?.email || "admin@system.com"}</p>
            </div>
          </div>
          <button className={styles.toggleButton} onClick={handleToggle}>
            <i className="mdi mdi-chevron-left-circle-outline"></i>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <h5 className={styles.sectionTitle}>REPORTS & ANALYTICS</h5>
            <ul className={styles.navList}>
              {menuItems.map((item) => (
                <li key={item.path} className={styles.navItem}>
                  <Link
                    to={item.path}
                    className={`${styles.navLink} ${
                      location.pathname === item.path ? styles.active : ""
                    }`}
                    onClick={handleLinkClick}
                  >
                    <span className={styles.navIcon}>
                      <i className={item.icon}></i>
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* 3. Logout Section (Bottom) */}
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <span className={styles.navIcon}>
              <i className="mdi mdi-logout"></i>
            </span>
            <span className={styles.navLabel}>Logout</span>
          </button>
        </div>
      </aside>

      {/* 4. Mobile Floating Toggle Button */}
      {!sidebarOpen && (
        <button className={styles.mobileMenuButton} onClick={handleToggle}>
          <i className="mdi mdi-menu"></i>
        </button>
      )}
    </>
  );
};

export default UserSideBar;
