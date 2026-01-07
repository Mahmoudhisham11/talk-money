"use client";

import { FaCreditCard, FaChartLine, FaClipboardList } from "react-icons/fa";
import styles from "./BudgetCard.module.css";

const iconMap = {
  "💳": FaCreditCard,
  "📈": FaChartLine,
  "📋": FaClipboardList,
};

export default function BudgetCard({ title, amount, icon, color, gradient, onClick, isSelected }) {
  const IconComponent = iconMap[icon] || FaCreditCard;

  return (
    <div 
      className={`${styles.card} ${isSelected ? styles.selected : ''}`} 
      style={{ background: gradient }}
      onClick={onClick}
    >
      <div className={styles.iconContainer} style={{ background: color }}>
        <IconComponent className={styles.icon} />
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.amount}>
          {amount.toLocaleString("ar-EG")} <span className={styles.currency}>ج.م</span>
        </p>
      </div>
      {isSelected && <div className={styles.selectedIndicator}>✓</div>}
    </div>
  );
}
