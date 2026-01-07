"use client";

import { useEffect, useState } from "react";
import styles from "./Notification.module.css";

export default function Notification({ message, type = "info", onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div
      className={`${styles.notification} ${styles[type]} ${
        isVisible ? styles.visible : styles.hidden
      }`}
    >
      <div className={styles.content}>
        <span className={styles.icon}>{icons[type] || icons.info}</span>
        <span className={styles.message}>{message}</span>
      </div>
      <button onClick={handleClose} className={styles.closeButton} aria-label="إغلاق">
        ✕
      </button>
    </div>
  );
}

