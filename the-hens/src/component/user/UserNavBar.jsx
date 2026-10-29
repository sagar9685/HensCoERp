import { FaUserCircle, FaBars, FaSearch } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { logout } from "../../features/authSlice";
import { useNavigate } from "react-router";
import { openStockModal } from "../../features/stockSlice";
import { toggleSidebar } from "../../features/uiSlice";
import AddStockModal from "./AddStockModal";
import styles from "./UserNavbar.module.css";

const UserNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reduxModalOpen = useSelector((state) => state.stock?.modalOpen);

  const reduxSidebarOpen = useSelector((state) => state.ui?.sidebarOpen);

  // Sync with Redux
  useEffect(() => {
    if (reduxModalOpen !== undefined) {
      setModalOpen(reduxModalOpen);
    }

    if (reduxSidebarOpen !== undefined) {
      setSidebarOpen(reduxSidebarOpen);
    }
  }, [reduxModalOpen, reduxSidebarOpen]);

  const authData = JSON.parse(localStorage.getItem("authData") || "null");

  const user = authData?.user || authData || {};

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const handleChangePassword = () => {
    navigate("/change");
  };

  const handleToggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    dispatch(toggleSidebar());
  };

  const handleOpenStockModal = () => {
    setModalOpen(true);
    dispatch(openStockModal());
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navbarContainer}>
          {/* Left */}
          <div className={styles.navbarLeft}>
            <button
              className={styles.sidebarToggle}
              onClick={handleToggleSidebar}
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

          {/* Center */}
          <div className={styles.navbarCenter}>
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search products, orders, stocks..."
              />
            </div>
          </div>

          {/* Right */}
          <div className={styles.navbarRight}>
            <button
              className={styles.addStockBtn}
              onClick={handleOpenStockModal}
            >
              <i className="mdi mdi-plus-circle"></i>
              <span>Add Stock</span>
            </button>

            {/* User Profile */}
            <div className={styles.userProfile}>
              <div className={styles.profileAvatar}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name || "User"} />
                ) : (
                  <FaUserCircle />
                )}
              </div>

              <div className={styles.profileInfo}>
                <h4>{user?.name}</h4>
              </div>

              <div className={styles.profileDropdown}>
                <button className={styles.dropdownToggle}>
                  <i className="mdi mdi-chevron-down"></i>
                </button>

                <div className={styles.dropdownMenu}>
                  <button
                    onClick={handleChangePassword}
                    className={styles.dropdownItem}
                  >
                    <i className="mdi mdi-lock-reset"></i>
                    Change Password
                  </button>

                  <button
                    onClick={handleLogout}
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  >
                    <i className="mdi mdi-logout"></i>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {modalOpen && <AddStockModal onClose={() => setModalOpen(false)} />}
    </>
  );
};

export default UserNavbar;
