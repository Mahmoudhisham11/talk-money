"use client";

import { useState, useRef, useEffect } from "react";
import { FaMoon, FaSun, FaSignOutAlt } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import styles from "./ProfileDropdown.module.css";

export default function ProfileDropdown({ userName, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.profileButton}
        aria-label="القائمة"
      >
        <div className={styles.avatar}>
          {getInitials(userName)}
        </div>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownAvatar}>
              {getInitials(userName)}
            </div>
            <div className={styles.dropdownInfo}>
              <p className={styles.dropdownName}>{userName}</p>
            </div>
          </div>

          <div className={styles.dropdownDivider}></div>

          <div className={styles.dropdownMenu}>
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className={styles.menuItem}
            >
              <span className={styles.menuIcon}>
                {theme === "light" ? <FaMoon /> : <FaSun />}
              </span>
              <span className={styles.menuText}>
                {theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
              </span>
            </button>

            <button onClick={onLogout} className={`${styles.menuItem} ${styles.logoutItem}`}>
              <span className={styles.menuIcon}>
                <FaSignOutAlt />
              </span>
              <span className={styles.menuText}>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

