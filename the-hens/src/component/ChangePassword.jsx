import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt } from "react-icons/fa";
import { changePassword, logout, clearStatus } from "../features/authSlice";
import styles from "./ChangePassword.module.css";

const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, successMsg, data } = useSelector(
    (state) => state.auth,
  );

  const [formData, setFormData] = useState({
    username: data?.name || "User",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Success hone par 2 second baad logout aur redirect
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        dispatch(logout());
        navigate("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, dispatch, navigate]);

  useEffect(() => {
    return () => dispatch(clearStatus());
  }, [dispatch]);

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    dispatch(
      changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      }),
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <FaShieldAlt />
          </div>
          <h2>Security Settings</h2>
          <p>
            Account: <strong>{formData.username}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* USERNAME - READONLY */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <input
              className={`${styles.input} ${styles.readOnly}`}
              value={formData.username}
              readOnly
            />
          </div>

          {/* OLD PASSWORD */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Current Password</label>
            <div className={styles.passwordWrapper}>
              <input
                className={styles.input}
                type={showOld ? "text" : "password"}
                name="oldPassword"
                onChange={handleInput}
                placeholder="Enter current password"
                required
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* NEW PASSWORD */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Password</label>
            <div className={styles.passwordWrapper}>
              <input
                className={styles.input}
                type={showNew ? "text" : "password"}
                name="newPassword"
                onChange={handleInput}
                placeholder="Create new password"
                required
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm New Password</label>
            <div className={styles.passwordWrapper}>
              <input
                className={styles.input}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                onChange={handleInput}
                placeholder="Repeat new password"
                required
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || !!successMsg}
          >
            {loading ? "Processing..." : "Change & Log Out Everywhere"}
          </button>

          {error && <div className={styles.errorBox}>⚠️ {error}</div>}
          {successMsg && (
            <div className={styles.successBox}>✅ {successMsg}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
