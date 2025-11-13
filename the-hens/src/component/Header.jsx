import React, { useEffect, useState, useRef } from "react";
import styles from "./Header.module.css";
import { 
  FaBell, 
  FaChartBar, 
  FaBullhorn, 
  FaCog, 
  FaUsers, 
  FaLayerGroup, 
  FaBug,
  FaChevronDown,
  FaSearch,
  FaSun,
  FaMoon,
  FaUserCircle,
  FaSignOutAlt,
  FaCaretDown,
  FaShieldAlt,
  FaLifeRing,
  FaTimes
} from "react-icons/fa";
import { MdSupervisorAccount, MdNotifications, MdDashboard } from "react-icons/md";
import { FaPhoenixFramework } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {logout} from '../features/authSlice'
import { useNavigate } from "react-router";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const user = useSelector((state)=> state.auth.data);
  console.log(user,"user Data")
  

    const displayName = user?.name || user?.username || user?.email || "Admin User";
  const displayRole = user?.role || "Super Admin";

  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { key: "dashboard", icon: <MdDashboard />, label: "Dashboard" },
    { key: "flocks", icon: <FaLayerGroup />, label: "Purchase" },
    { key: "problems", icon: <FaBug />, label: "Issues" },
    { key: "users", icon: <FaUsers />, label: "Users" },
    { key: "analytics", icon: <FaChartBar />, label: "Analytics" },
    { key: "announcements", icon: <FaBullhorn />, label: "Announcements" },
    { key: "settings", icon: <FaCog />, label: "Settings" }
  ];

  const notifications = [
    { id: 1, text: "New flock added successfully", time: "2 min ago", unread: true, type: "success" },
    { id: 2, text: "Vaccination schedule updated", time: "1 hour ago", unread: true, type: "info" },
    { id: 3, text: "System backup completed", time: "3 hours ago", unread: false, type: "success" },
    { id: 4, text: "Performance report generated", time: "5 hours ago", unread: false, type: "info" }
  ];


  const handleLogot = () => {
      dispatch(logout());
      navigate('/')
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className={`${styles.header} ${darkMode ? styles.dark : ''}`}>
      
      {/* Left Side - Brand Area */}
      <div className={styles.brandArea}>
        <div className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <img 
              src="/img/logo.png" 
              alt="Phoenix Admin" 
              className={styles.logo}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className={styles.logoFallback}>
              <FaPhoenixFramework className={styles.fallbackIcon} />
            </div>
            <div className={styles.logoGlow}></div>
          </div>
        </div>
        
 

        {/* Mobile Menu Button */}
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Center - Navigation */}
      <nav className={`${styles.navigation} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`} ref={mobileMenuRef}>
        <div className={styles.mobileMenuHeader}>
          <span>Navigation</span>
          <button onClick={() => setMobileMenuOpen(false)}>
            <FaTimes />
          </button>
        </div>
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`${styles.navItem} ${activeMenu === item.key ? styles.navItemActive : ''}`}
            onClick={() => {
              setActiveMenu(item.key);
              setMobileMenuOpen(false);
            }}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            <div className={styles.navIndicator}></div>
          </button>
        ))}
      </nav>

      {/* Right Side - Controls */}
      <div className={styles.controls}>
        {/* Search */}
        <div className={`${styles.searchContainer} ${searchFocused ? styles.searchFocused : ''}`}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search Products, users, reports..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery && (
            <button 
              className={styles.searchClear}
              onClick={() => setSearchQuery("")}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          className={styles.themeToggle}
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
          <span className={styles.themeTooltip}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Notifications */}
        <div className={styles.notificationWrapper} ref={notificationRef}>
          <button 
            className={styles.notificationButton}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <MdNotifications />
            {unreadCount > 0 && (
              <span className={styles.notificationCounter}>{unreadCount}</span>
            )}
          </button>

          {notificationsOpen && (
            <div className={styles.notificationPanel}>
              <div className={styles.notificationHeader}>
                <h3>Notifications</h3>
                <span className={styles.notificationStats}>
                  {unreadCount} unread
                </span>
              </div>
              
              <div className={styles.notificationList}>
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`${styles.notification} ${notification.unread ? styles.notificationUnread : ''}`}
                  >
                    <div className={`${styles.notificationStatus} ${styles[notification.type]}`}></div>
                    <div className={styles.notificationContent}>
                      <p className={styles.notificationText}>{notification.text}</p>
                      <span className={styles.notificationTime}>{notification.time}</span>
                    </div>
                    {notification.unread && (
                      <div className={styles.unreadDot}></div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={styles.notificationFooter}>
                <button className={styles.notificationAction}>
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className={styles.userMenu} ref={dropdownRef}>
          <button 
            className={styles.userTrigger}
            onClick={() => setOpen(!open)}
            aria-label="User menu"
          >
            <div className={styles.userAvatar}>
              <MdSupervisorAccount />
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{displayRole}</span>
            </div>
            <FaCaretDown className={`${styles.chevron} ${open ? styles.chevronRotated : ''}`} />
          </button>

          {open && (
            <div className={styles.userDropdown}>
              <div className={styles.dropdownProfile}>
                <div className={styles.profileAvatar}>
                  <FaUserCircle />
                </div>
                <div className={styles.profileInfo}>
                  <p className={styles.profileName}>Admin User</p>
                  <p className={styles.profileEmail}>sagar@phoenix.com</p>
                  <div className={styles.profileBadge}>
                    <FaShieldAlt />
                    <span>Administrator</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.dropdownMenu}>
                <button className={styles.menuOption}>
                  <FaUserCircle />
                  <span>My Profile</span>
                </button>
                <button className={styles.menuOption}>
                  <FaCog />
                  <span>Account Settings</span>
                </button>
                <button className={styles.menuOption}>
                  <FaLifeRing />
                  <span>Support Center</span>
                </button>
              </div>
              
              <div className={styles.dropdownFooter}>
                <button className={styles.logoutButton} onClick={handleLogot}>
                  <FaSignOutAlt />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;