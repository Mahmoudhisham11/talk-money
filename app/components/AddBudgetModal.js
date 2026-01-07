"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import styles from "./AddBudgetModal.module.css";

export default function AddBudgetModal({ isOpen, onClose, onAdd, loading = false }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { theme } = useTheme();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onAdd(numAmount, reason || "إضافة مبلغ جديد");
      setAmount("");
      setReason("");
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        data-theme={theme}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>إضافة مبلغ جديد</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="إغلاق">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>المبلغ</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل المبلغ"
              className={styles.input}
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>السبب (اختياري)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: راتب الشهر، مكافأة، إلخ"
              className={styles.input}
            />
          </div>
          <div className={styles.buttons}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={loading}
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "جاري الإضافة..." : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

