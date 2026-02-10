import React, { useState, useEffect } from "react";
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

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logoWrapper}>
            <img
              src="/img/logo.png"
              alt="Company Logo"
              className={styles.logo}
              width="400"
              height="110"
            />
            <div className={styles.logoGlow}></div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.titleSection}>
            <h1 className={styles.panelTitle}>Production Unit</h1>
            <p className={styles.panelSubtitle}>Manufacturing Dashboard</p>
            <div className={styles.titleUnderline}></div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className={styles.userSection}>
          {/* Quick Stats */}
          <div className={styles.quickStats}>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>📊</span>
              <span className={styles.statText}>Live Orders</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statIcon}>⚙️</span>
              <span className={styles.statText}>Running</span>
            </div>
          </div>

          {/* User Profile */}
          <div className={styles.profileContainer}>
            <div className={styles.profileTrigger} onClick={handleProfileClick}>
              <div className={styles.avatar}>
                {data?.name?.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.welcome}>Welcome back,</span>
                <span className={styles.userName}>
                  {data?.name || "Production Manager"}
                </span>
                <span className={styles.userRole}>Production Unit</span>
              </div>
              <svg
                className={`${styles.dropdownArrow} ${showDropdown ? styles.rotated : ""}`}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>
                    {data?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.dropdownName}>
                      {data?.name?.toUpperCase()}
                    </div>
                    <div className={styles.dropdownEmail}>
                      {data?.email || "production@company.com"}
                    </div>
                  </div>
                </div>

                <div className={styles.dropdownDivider}></div>

                <button className={styles.dropdownItem}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Profile Settings
                </button>

                <button className={styles.dropdownItem}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Preferences
                </button>

                <div className={styles.dropdownDivider}></div>

                <button
                  onClick={handleLogout}
                  className={styles.logoutDropdownItem}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Logout Button */}
          <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
          </button>
        </div>
      </div>
    </header>
  );
};

export default ProductionHeader;
