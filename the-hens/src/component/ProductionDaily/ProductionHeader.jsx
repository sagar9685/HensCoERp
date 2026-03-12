import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../features/authSlice";
import styles from "./ProductionHeader.module.css";

const ProductionHeader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data } = useSelector((state) => state.auth);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeStat, setActiveStat] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleStatHover = (index) => {
    setActiveStat(index);
  };

  const handleStatLeave = () => {
    setActiveStat(null);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}>
      {/* Animated Background Particles */}
      <div className={styles.headerBackground}>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
      </div>

      <div className={styles.container}>
        {/* Logo Section with Enhanced Animation */}
        <div className={styles.logoSection}>
          <div className={styles.logoWrapper} onClick={() => navigate("/")}>
            <img
              src="/img/logo.png"
              alt="Company Logo"
              className={styles.logo}
              width="400"
              height="110"
              loading="eager"
            />
            <div className={styles.logoGlow}></div>
            <div className={styles.logoShine}></div>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerInner}></span>
          </div>

          <div className={styles.titleSection}>
            <div className={styles.titleContent}>
              <h1 className={styles.panelTitle}>Production Unit</h1>
              <p className={styles.panelSubtitle}>
                <span className={styles.subtitleIcon}>⚙️</span>
                Manufacturing Dashboard
              </p>
            </div>
            <div className={styles.titleUnderline}></div>

            {/* Status Indicators */}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className={styles.userSection}>
          {/* DateTime Display */}
          <div className={styles.dateTimeDisplay}>
            <div className={styles.timeDisplay}>
              <span className={styles.timeIcon}>🕒</span>
              <span className={styles.time}>{formatTime(currentTime)}</span>
            </div>
            <div className={styles.dateDisplay}>
              <span className={styles.date}>{formatDate(currentTime)}</span>
            </div>
          </div>

          {/* Quick Stats with Enhanced Interactions */}
          <div className={styles.quickStats}>
            <div
              className={`${styles.statItem} ${activeStat === 0 ? styles.active : ""}`}
              onMouseEnter={() => handleStatHover(0)}
              onMouseLeave={handleStatLeave}
            >
              <span className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 20L4 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 12L7 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 12L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="9"
                    cy="15"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="17"
                    cy="15"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <span className={styles.statText}>
                <button
                  onClick={() => navigate("/head")}
                  className={styles.statButton}
                >
                  Stock
                </button>
              </span>
              {activeStat === 0 && (
                <div className={styles.statTooltip}>View Inventory</div>
              )}
            </div>

            <div
              className={`${styles.statItem} ${activeStat === 1 ? styles.active : ""}`}
              onMouseEnter={() => handleStatHover(1)}
              onMouseLeave={handleStatLeave}
            >
              <span className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="2"
                    y="7"
                    width="20"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16 21V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V21"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <span className={styles.statText}>
                <button
                  onClick={() => navigate("/daily")}
                  className={styles.statButton}
                >
                  Daily Production
                </button>
              </span>
              {activeStat === 1 && (
                <div className={styles.statTooltip}>Today's Output</div>
              )}
            </div>

            <div
              className={`${styles.statItem} ${activeStat === 2 ? styles.active : ""}`}
              onMouseEnter={() => handleStatHover(2)}
              onMouseLeave={handleStatLeave}
            >
              <span className={styles.statIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 6V12L16 14"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <span className={styles.statText}>
                <button
                  onClick={() => navigate("/dispatch")}
                  className={styles.statButton}
                >
                  Goods in Transit
                </button>
              </span>
            </div>
          </div>

          {/* User Profile with Enhanced Dropdown */}
          <div className={styles.profileContainer}>
            <div
              className={`${styles.profileTrigger} ${showDropdown ? styles.active : ""}`}
              onClick={handleProfileClick}
              ref={profileRef}
            >
              <div className={styles.avatar}>
                {data?.name?.charAt(0).toUpperCase()}
                <span className={styles.onlineIndicator}></span>
              </div>
              <div className={styles.userInfo}>
                <span className={styles.welcome}>
                  <span className={styles.welcomeIcon}>👋</span>
                  Welcome back,
                </span>
                <span className={styles.userName}>
                  {data?.name || "Production Manager"}
                </span>
                <span className={styles.userRole}>
                  <span className={styles.roleBadge}>Production Unit</span>
                </span>
              </div>
              <div className={styles.arrowContainer}>
                <svg
                  className={`${styles.dropdownArrow} ${showDropdown ? styles.rotated : ""}`}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Enhanced Dropdown Menu */}
            {showDropdown && (
              <div className={styles.dropdownMenu} ref={dropdownRef}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>
                    {data?.name?.charAt(0).toUpperCase()}
                    <div className={styles.avatarGlow}></div>
                  </div>
                  <div className={styles.dropdownUserInfo}>
                    <div className={styles.dropdownName}>
                      {data?.name?.toUpperCase() || "PRODUCTION MANAGER"}
                    </div>
                  </div>
                </div>

                <div className={styles.dropdownDivider}></div>

                <div className={styles.dropdownDivider}></div>

                <div className={styles.dropdownFooter}>
                  <button className={styles.dropdownItem}>
                    <span className={styles.itemIcon}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 8V16"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M8 12H16"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    <span className={styles.itemContent}>
                      <span className={styles.itemTitle}>Help & Support</span>
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className={`${styles.dropdownItem} ${styles.logoutDropdownItem}`}
                  >
                    <span className={styles.itemIcon}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <polyline
                          points="16 17 21 12 16 7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <line
                          x1="21"
                          y1="12"
                          x2="9"
                          y2="12"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    <span className={styles.itemContent}>
                      <span className={styles.itemTitle}>Sign Out</span>
                      <span className={styles.itemSubtitle}>
                        End your session
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Mobile Logout Button */}
          <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polyline
                points="16 17 21 12 16 7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="21"
                y1="12"
                x2="9"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className={styles.mobileLogoutText}>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ProductionHeader;
