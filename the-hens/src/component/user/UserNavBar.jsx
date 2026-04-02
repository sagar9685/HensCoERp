import { FaUserCircle, FaBars, FaSearch, FaBell } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { logout } from "../../features/authSlice";
import { useNavigate } from "react-router";
import { openStockModal } from "../../features/stockSlice";
import { toggleSidebar } from "../../features/uiSlice";
import AddStockModal from "./AddStockModal";
import styles from "./UserNavbar.module.css";
import { io } from "socket.io-client";
import {
  fetchNotifications,
  addNotification,
  removeNotification,
} from "../../features/notificationSlice";
import { toast } from "react-toastify";

const UserNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reduxModalOpen = useSelector((state) => state.stock?.modalOpen);
  const reduxSidebarOpen = useSelector((state) => state?.ui?.sidebarOpen);
  const notifications = useSelector((state) => state.notifications.list);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Sync with Redux
  useEffect(() => {
    if (reduxModalOpen !== undefined) setModalOpen(reduxModalOpen);
    if (reduxSidebarOpen !== undefined) setSidebarOpen(reduxSidebarOpen);
  }, [reduxModalOpen, reduxSidebarOpen]);

  const authData = JSON.parse(localStorage.getItem("authData"));
  const user = authData?.user || authData;

  const userRole = authData?.role || authData?.user?.role; // Check karein aapka structure kya hai

  const handleRead = async (id) => {
    try {
      // 1️⃣ Backend se delete
      await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: "DELETE",
      });

      // 2️⃣ Redux se remove
      dispatch(removeNotification(id));

      toast.success("Marked as read", { autoClose: 500 });
    } catch (err) {
      toast.error("Failed to clear notification");
    }
  };

  useEffect(() => {
    if (userRole) {
      dispatch(fetchNotifications(userRole));
    }
  }, [dispatch, userRole]);

  // Initial fetch notifications
  useEffect(() => {
    dispatch(fetchNotifications(user.role));
  }, [dispatch, user.role]);

  // Socket.io for realtime notifications
  useEffect(() => {
    const socket = io(`${API_BASE_URL}`, { transports: ["websocket"] });

    socket.on("newNotification", (notification) => {
      dispatch(addNotification(notification));

      // Professional Toast Alert
      toast.info(notification.Message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: "🔔",
      });
    });

    return () => socket.disconnect();
  }, [dispatch]);

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

            <div className={styles.notificationWrapper}>
              <button className={styles.notificationBtn}>
                <FaBell />
                <span className={styles.notificationBadge}>
                  {notifications.length}
                </span>
              </button>
              {/* <div className={styles.notificationList}>
                {notifications.map((n) => (
                  <div
                    key={n.NotificationID}
                    className={styles.notificationItem}
                  >
                    <div className={styles.notificationContent}>
                      <p>{n.Message}</p>
                      <span className={styles.notificationTime}>
                        {new Date(n.CreatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div> */}
              <div className={styles.notificationList}>
                {notifications.map((n) => (
                  <div
                    key={n.NotificationID}
                    className={styles.notificationItem}
                    onClick={() => handleRead(n.NotificationID)} // 👈 click karte hi mark as read
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.notificationContent}>
                      <p>{n.Message}</p>
                      <span className={styles.notificationTime}>
                        {new Date(n.CreatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Profile */}
            <div className={styles.userProfile}>
              <div className={styles.profileAvatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <FaUserCircle />
                )}
              </div>
              <div className={styles.profileInfo}>
                <h4>{user?.name}</h4>
                {/* <p>{user?.role}</p> */}
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
