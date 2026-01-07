"use client";

import {
  FaHamburger,
  FaFilm,
  FaTshirt,
  FaCar,
  FaLightbulb,
  FaHospital,
  FaBook,
  FaShoppingCart,
  FaFileAlt,
  FaDollarSign,
  FaClipboardList,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import styles from "./ExpenseList.module.css";

const categoryIcons = {
  food: FaHamburger,
  entertainment: FaFilm,
  clothes: FaTshirt,
  transport: FaCar,
  bills: FaLightbulb,
  health: FaHospital,
  education: FaBook,
  shopping: FaShoppingCart,
  other: FaFileAlt,
  income: FaDollarSign,
};

const categoryNames = {
  food: "طعام",
  entertainment: "ترفيه",
  clothes: "ملابس",
  transport: "مواصلات",
  bills: "فواتير",
  health: "صحة",
  education: "تعليم",
  shopping: "تسوق",
  other: "أخرى",
  income: "دخل",
};

export default function ExpenseList({ expenses, allExpensesCount, displayLimit, onEdit, onDelete, onLoadMore }) {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const groupByDate = (expenses) => {
    const groups = {};
    expenses.forEach((expense) => {
      const date = expense.date || expense.createdAt;
      const d = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key;
      if (d.toDateString() === today.toDateString()) {
        key = "اليوم";
      } else if (d.toDateString() === yesterday.toDateString()) {
        key = "أمس";
      } else {
        key = formatDate(date);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
    });
    return groups;
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FaClipboardList className={styles.emptyIcon} />
        <p className={styles.emptyText}>لا توجد مصاريف حتى الآن</p>
        <p className={styles.emptySubtext}>ابدأ بإضافة مصروف جديد</p>
      </div>
    );
  }

  const groupedExpenses = groupByDate(expenses);
  const hasMore = allExpensesCount > displayLimit;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>المعاملات</h2>
        {hasMore && (
          <button onClick={onLoadMore} className={styles.viewAllButton}>
            عرض المزيد ({allExpensesCount - displayLimit} متبقي)
          </button>
        )}
      </div>
      <div className={styles.list}>
        {Object.entries(groupedExpenses).map(([dateKey, dateExpenses]) => (
          <div key={dateKey} className={styles.dateGroup}>
            <h3 className={styles.dateLabel}>{dateKey}</h3>
            {dateExpenses.map((expense) => {
              const IconComponent = categoryIcons[expense.category] || categoryIcons.other;
              return (
                <div key={expense.id} className={styles.expenseItem}>
                  <div className={styles.iconWrapper}>
                    <IconComponent className={styles.icon} />
                  </div>
                  <div className={styles.expenseContent}>
                    <h4 className={styles.expenseTitle}>
                      {expense.reason || categoryNames[expense.category] || "مصروف"}
                    </h4>
                    <div className={styles.expenseMeta}>
                      <span className={styles.time}>
                        {formatTime(expense.date || expense.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.expenseActions}>
                    <span
                      className={`${styles.amount} ${
                        expense.type === "income" ? styles.income : styles.expense
                      }`}
                    >
                      {expense.type === "income" ? "+" : "-"}
                      {expense.amount.toLocaleString("ar-EG")} ج.م
                    </span>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => onEdit(expense)}
                        className={styles.editButton}
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className={styles.deleteButton}
                        aria-label="حذف"
                        title="حذف"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
