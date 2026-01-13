// components/UserNavbar/UserNavbar.jsx
import { FaUserCircle, FaBars, FaSearch, FaBell } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react"; // useState import करें
import { logout } from "../../features/authSlice";
import { useNavigate } from "react-router";
import { openStockModal } from "../../features/stockSlice";
import { toggleSidebar } from "../../features/uiSlice";
import AddStockModal from "./AddStockModal";
import styles from "./UserNavbar.module.css";

const UserNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Temporary useState solutions
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Try to get from Redux
  const reduxModalOpen = useSelector((state) => state.stock?.modalOpen);
  const reduxSidebarOpen = useSelector((state) => state?.ui?.sidebarOpen);

  // Sync with Redux when available
  useEffect(() => {
    if (reduxModalOpen !== undefined) {
      setModalOpen(reduxModalOpen);
    }
    if (reduxSidebarOpen !== undefined) {
      setSidebarOpen(reduxSidebarOpen);
    }
  }, [reduxModalOpen, reduxSidebarOpen]);

  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
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

  const handleOpenStockModal = () => {
    setModalOpen(true);

    // Also dispatch to Redux if available
    try {
      dispatch(openStockModal());
    } catch (error) {
      console.log("Redux not available, using local state");
    }
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navbarContainer}>
          {/* Left Section - Logo & Sidebar Toggle */}
          <div className={styles.navbarLeft}>
            <button
              className={styles.sidebarToggle}
              onClick={handleToggleSidebar}
              title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <FaBars />
            </button>

            <div className={styles.brand}>
              <div className={styles.logo}>
                <i className="mdi mdi-package-variant"></i>
              </div>
              <div className={styles.brandText}>
                <h2>Stock Manager</h2>
                <p>Inventory Control System</p>
              </div>
            </div>
          </div>

          {/* Center Section - Search & Quick Actions */}
          <div className={styles.navbarCenter}>
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search products, orders, stocks..."
              />
              <button className={styles.searchButton}>
                <i className="mdi mdi-filter"></i>
              </button>
            </div>
          </div>

          {/* Right Section - User Info & Notifications */}
          <div className={styles.navbarRight}>
            {/* Add Stock Button */}
            <button
              className={styles.addStockBtn}
              onClick={handleOpenStockModal}
            >
              <i className="mdi mdi-plus-circle"></i>
              <span>Add Stock</span>
            </button>

            {/* Notifications */}
            <div className={styles.notificationWrapper}>
              <button className={styles.notificationBtn}>
                <FaBell />
                <span className={styles.notificationBadge}>3</span>
              </button>
              <div className={styles.notificationDropdown}>
                <div className={styles.notificationHeader}>
                  <h4>Notifications</h4>
                  <span className={styles.notificationCount}>3 New</span>
                </div>
                <div className={styles.notificationList}>
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationIcon}>
                      <i className="mdi mdi-package"></i>
                    </div>
                    <div className={styles.notificationContent}>
                      <p>Low stock alert for Product A</p>
                      <span className={styles.notificationTime}>
                        10 mins ago
                      </span>
                    </div>
                  </div>
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationIcon}>
                      <i className="mdi mdi-cash"></i>
                    </div>
                    <div className={styles.notificationContent}>
                      <p>New order received #ORD-2024-001</p>
                      <span className={styles.notificationTime}>
                        1 hour ago
                      </span>
                    </div>
                  </div>
                </div>
                <button className={styles.viewAllBtn}>
                  View All Notifications
                </button>
              </div>
            </div>

            {/* User Profile */}
            <div className={styles.userProfile}>
              <div className={styles.profileAvatar}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <FaUserCircle />
                )}
              </div>
              <div className={styles.profileInfo}>
                <h4>{user?.name || "User"}</h4>
                <p>{user?.role || "Operator"}</p>
              </div>

              {/* User Dropdown Menu */}
              <div className={styles.profileDropdown}>
                <button className={styles.dropdownToggle}>
                  <i className="mdi mdi-chevron-down"></i>
                </button>

                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.headerAvatar}>
                      <FaUserCircle />
                    </div>
                    <div>
                      <h4>{user?.name || "User"}</h4>
                      <p>{user?.email || "user@example.com"}</p>
                    </div>
                  </div>

                  <div className={styles.dropdownDivider}></div>

                  <a href="#" className={styles.dropdownItem}>
                    <i className="mdi mdi-account"></i>
                    <span>My Profile</span>
                  </a>

                  <a href="#" className={styles.dropdownItem}>
                    <i className="mdi mdi-cog"></i>
                    <span>Settings</span>
                  </a>

                  <a href="#" className={styles.dropdownItem}>
                    <i className="mdi mdi-help-circle"></i>
                    <span>Help & Support</span>
                  </a>

                  <div className={styles.dropdownDivider}></div>

                  <button
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                    onClick={handleLogout}
                  >
                    <i className="mdi mdi-logout"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Stock Modal */}
      {modalOpen && <AddStockModal onClose={() => setModalOpen(false)} />}
    </>
  );
};

export default UserNavbar;
