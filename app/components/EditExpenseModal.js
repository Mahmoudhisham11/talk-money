"use client";

import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import styles from "./EditExpenseModal.module.css";

const categories = [
  { value: "food", label: "طعام" },
  { value: "entertainment", label: "ترفيه" },
  { value: "clothes", label: "ملابس" },
  { value: "transport", label: "مواصلات" },
  { value: "bills", label: "فواتير" },
  { value: "health", label: "صحة" },
  { value: "education", label: "تعليم" },
  { value: "shopping", label: "تسوق" },
  { value: "other", label: "أخرى" },
];

const budgetTypes = [
  { value: "personal", label: "مصاريف شخصية" },
  { value: "investment", label: "استثمار" },
  { value: "commitments", label: "التزامات" },
];

export default function EditExpenseModal({ isOpen, onClose, expense, onSave, loading = false }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("other");
  const [budgetType, setBudgetType] = useState("personal");
  const [type, setType] = useState("expense");
  const { theme } = useTheme();

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount?.toString() || "");
      setReason(expense.reason || "");
      setCategory(expense.category || "other");
      setBudgetType(expense.budgetType || "personal");
      setType(expense.type || "expense");
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onSave({
        ...expense,
        amount: numAmount,
        reason: reason || expense.reason,
        category,
        budgetType,
        type,
      });
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
          <h2 className={styles.title}>تعديل المعاملة</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="إغلاق">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>نوع المعاملة</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={styles.select}
              required
            >
              <option value="expense">مصروف</option>
              <option value="income">دخل</option>
            </select>
          </div>

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
            <label className={styles.label}>السبب</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: راتب الشهر، مكافأة، إلخ"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>الفئة</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {type === "expense" && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>نوع الميزانية</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value)}
                className={styles.select}
                required
              >
                {budgetTypes.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

