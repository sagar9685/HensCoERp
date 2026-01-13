// components/UserSideBar/UserSideBar.jsx
import { Link, useLocation } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react"; // useState import करें
import { toggleSidebar } from "../../features/uiSlice";
import styles from "./UserSideBar.module.css";

const UserSideBar = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  // Temporary useState solution until Redux is properly configured
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Try to get from Redux, fallback to useState
  const reduxSidebarOpen = useSelector((state) => state?.ui?.sidebarOpen);

  // Sync with Redux when available
  useEffect(() => {
    if (reduxSidebarOpen !== undefined) {
      setSidebarOpen(reduxSidebarOpen);
    }
  }, [reduxSidebarOpen]);

  const user = useSelector((state) => state.auth.user);

  const menuItems = [
    {
      path: "/user",
      icon: "mdi mdi-speedometer",
      label: "Dashboard",
      badge: null,
    },
    {
      path: "/userForm",
      icon: "mdi mdi-playlist-play",
      label: "Assign Order",
      badge: "5",
    },
    {
      path: "/datatable",
      icon: "mdi mdi-table-large",
      label: "Delivery Cash",
      badge: "New",
    },
    {
      path: "/stock",
      icon: "mdi mdi-package-variant",
      label: "Stock",
      badge: null,
    },
    {
      path: "/chart",
      icon: "mdi mdi-chart-bar",
      label: "Reports",
      badge: null,
    },
    { path: "/settings", icon: "mdi mdi-cog", label: "Settings", badge: null },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 992) {
      handleToggleSidebar();
    }
  };

  const handleToggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);

    // Also dispatch to Redux if available
    try {
      dispatch(toggleSidebar());
    } catch (error) {
      console.log("Redux not available, using local state");
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={handleToggleSidebar} />
      )}

      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? styles.open : styles.closed
        }`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <i className="mdi mdi-account-circle"></i>
            </div>
            <div className={styles.userDetails}>
              <h3>{user?.name || "Welcome User"}</h3>
              <p>{user?.email || "user@stockmanager.com"}</p>
            </div>
          </div>

          <button
            className={styles.closeButton}
            onClick={handleToggleSidebar}
            title="Close Sidebar"
          >
            <i className="mdi mdi-close"></i>
          </button>
        </div>

        {/* Rest of the code remains same */}
        <div className={styles.sidebarStats}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <i className="mdi mdi-package"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>1,248</span>
              <span className={styles.statLabel}>Total Stock</span>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <i className="mdi mdi-cash"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₹85,420</span>
              <span className={styles.statLabel}>Today's Sales</span>
            </div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <h5 className={styles.sectionTitle}>MAIN MENU</h5>
            <ul className={styles.navList}>
              {menuItems.map((item) => (
                <li key={item.path} className={styles.navItem}>
                  <Link
                    to={item.path}
                    className={`${styles.navLink} ${
                      isActive(item.path) ? styles.active : ""
                    }`}
                    onClick={handleLinkClick}
                  >
                    <span className={styles.navIcon}>
                      <i className={item.icon}></i>
                    </span>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.badge && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                    {isActive(item.path) && (
                      <span className={styles.activeIndicator}></span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.navSection}>
            <h5 className={styles.sectionTitle}>QUICK ACTIONS</h5>
            <div className={styles.quickActionsGrid}>
              <button className={styles.quickAction}>
                <i className="mdi mdi-plus-circle"></i>
                <span>New Order</span>
              </button>
              <button className={styles.quickAction}>
                <i className="mdi mdi-printer"></i>
                <span>Print Report</span>
              </button>
              <button className={styles.quickAction}>
                <i className="mdi mdi-export"></i>
                <span>Export Data</span>
              </button>
              <button className={styles.quickAction}>
                <i className="mdi mdi-alert-circle"></i>
                <span>Alerts</span>
              </button>
            </div>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.systemInfo}>
            <div className={styles.systemStatus}>
              <span className={styles.statusIndicator}></span>
              <span>System: Operational</span>
            </div>
            <p className={styles.version}>v2.1.0</p>
          </div>

          <button
            className={styles.logoutBtn}
            onClick={() => {
              // Add logout logic here
              console.log("Logout clicked");
            }}
          >
            <i className="mdi mdi-logout"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UserSideBar;
