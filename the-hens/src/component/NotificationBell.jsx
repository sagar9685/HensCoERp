import React, { useState } from "react";
import styles from "./NotificationBell.module.css";
import { FaBell } from "react-icons/fa";

const NotificationBell = ({ notifications }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.iconWrapper} onClick={() => setOpen(!open)}>
        <FaBell className={styles.bellIcon} />
        {notifications.length > 0 && (
          <span className={styles.badge}>{notifications.length}</span>
        )}
      </div>

      {open && (
        <div className={styles.dropdown}>
          {notifications.length === 0 ? (
            <p className={styles.empty}>No recent notifications</p>
          ) : (
            notifications.map((n, i) => (
              <div key={i} className={styles.notificationItem}>
                <p className={styles.message}>{n.message}</p>
                <span className={styles.time}>{n.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
