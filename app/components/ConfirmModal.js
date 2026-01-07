"use client";

import { FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "تأكيد", cancelText = "إلغاء", type = "danger" }) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        data-theme={theme}
      >
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <FaExclamationTriangle className={styles.warningIcon} />
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="إغلاق">
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{title || "تأكيد الحذف"}</h2>
          <p className={styles.message}>{message || "هل أنت متأكد من حذف هذه المعاملة؟"}</p>
        </div>

        <div className={styles.buttons}>
          <button onClick={onClose} className={styles.cancelButton}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`${styles.confirmButton} ${styles[type]}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

