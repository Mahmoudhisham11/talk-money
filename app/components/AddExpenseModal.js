"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaMicrophone, FaStop } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import useSpeechRecognition from "../../hooks/voiseRecording";
import styles from "./AddExpenseModal.module.css";

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

// دالة لاستخراج المبلغ والسبب والفئة من النص
const parseSpeechText = (text) => {
  const result = { amount: "", reason: "", category: "other" };

  // البحث عن الأرقام في النص
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:جنيه|جنية|ج\.م|جنيهات|ريال|دولار|دينار)/i);
  if (amountMatch) {
    result.amount = amountMatch[1];
  } else {
    // البحث عن أي رقم في النص
    const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      result.amount = numberMatch[1];
    }
  }

  // استخراج السبب (كل النص بعد المبلغ)
  if (amountMatch) {
    const reasonText = text.substring(amountMatch.index + amountMatch[0].length).trim();
    result.reason = reasonText || "";
  } else {
    // إذا لم نجد مبلغ، نأخذ كل النص كسبب
    result.reason = text.trim();
  }

  // تحديد الفئة بناءً على الكلمات المفتاحية
  const lowerText = text.toLowerCase();
  if (lowerText.includes("طعام") || lowerText.includes("اكل") || lowerText.includes("مطعم") || lowerText.includes("وجبة")) {
    result.category = "food";
  } else if (lowerText.includes("ترفيه") || lowerText.includes("لعبة") || lowerText.includes("بلايستيشن") || lowerText.includes("سينما") || lowerText.includes("فيلم")) {
    result.category = "entertainment";
  } else if (lowerText.includes("ملابس") || lowerText.includes("كوتش") || lowerText.includes("قميص") || lowerText.includes("بنطلون")) {
    result.category = "clothes";
  } else if (lowerText.includes("مواصلات") || lowerText.includes("اوبر") || lowerText.includes("تاكسي") || lowerText.includes("باص") || lowerText.includes("مترو")) {
    result.category = "transport";
  } else if (lowerText.includes("فاتورة") || lowerText.includes("كهرباء") || lowerText.includes("مياه") || lowerText.includes("غاز")) {
    result.category = "bills";
  } else if (lowerText.includes("صحة") || lowerText.includes("دواء") || lowerText.includes("طبيب") || lowerText.includes("مستشفى")) {
    result.category = "health";
  } else if (lowerText.includes("تعليم") || lowerText.includes("كتاب") || lowerText.includes("كورس")) {
    result.category = "education";
  } else if (lowerText.includes("تسوق") || lowerText.includes("سوق") || lowerText.includes("شراء")) {
    result.category = "shopping";
  }

  return result;
};

export default function AddExpenseModal({ isOpen, onClose, onAdd, selectedBudgetType, loading = false }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("other");
  const [budgetType, setBudgetType] = useState(selectedBudgetType || "personal");
  const { theme } = useTheme();
  const { text, isListening, startListening, stopListening, hasRecognitionSupport, error: speechError } = useSpeechRecognition();

  useEffect(() => {
    if (text && !isListening) {
      const parsed = parseSpeechText(text);
      if (parsed.amount) {
        setAmount(parsed.amount);
      }
      if (parsed.reason) {
        setReason(parsed.reason);
      }
      if (parsed.category) {
        setCategory(parsed.category);
      }
    }
  }, [text, isListening]);

  useEffect(() => {
    if (selectedBudgetType) {
      setBudgetType(selectedBudgetType);
    }
  }, [selectedBudgetType]);

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setReason("");
      setCategory("other");
      setBudgetType(selectedBudgetType || "personal");
    }
  }, [isOpen, selectedBudgetType]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onAdd({
        amount: numAmount,
        reason: reason || "مصروف",
        category,
        budgetType,
      });
      setAmount("");
      setReason("");
      setCategory("other");
      onClose();
    }
  };

  const handleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
          <h2 className={styles.title}>إضافة مصروف</h2>
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
            <label className={styles.label}>السبب</label>
            <div className={styles.inputWithButton}>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: مواصلات، طعام، إلخ"
                className={styles.input}
              />
              {hasRecognitionSupport && (
                <button
                  type="button"
                  onClick={handleRecord}
                  className={`${styles.recordButton} ${isListening ? styles.recording : ''}`}
                  title={isListening ? "إيقاف التسجيل" : "تسجيل صوتي"}
                >
                  {isListening ? <FaStop /> : <FaMicrophone />}
                </button>
              )}
            </div>
            {isListening && (
              <div className={styles.recordingIndicator}>
                <span className={styles.recordingDot}></span>
                جاري التسجيل...
              </div>
            )}
            {text && !isListening && (
              <div className={styles.speechText}>
                النص المسجل: {text}
              </div>
            )}
            {speechError && (
              <div className={styles.errorText}>{speechError}</div>
            )}
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
              {loading ? "جاري الإضافة..." : "إضافة المصروف"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

