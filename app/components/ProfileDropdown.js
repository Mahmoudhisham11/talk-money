"use client";

import { useState, useRef, useEffect } from "react";
import { FaMoon, FaSun, FaSignOutAlt, FaDesktop, FaChevronLeft } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import styles from "./ProfileDropdown.module.css";

export default function ProfileDropdown({ userName, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const dropdownRef = useRef(null);
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

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
            {!showThemeMenu ? (
              <>
                <button
                  onClick={() => setShowThemeMenu(true)}
                  className={styles.menuItem}
                >
                  <span className={styles.menuIcon}>
                    {resolvedTheme === "light" ? <FaSun /> : <FaMoon />}
                  </span>
                  <span className={styles.menuText}>المظهر</span>
                  <span className={styles.menuChevron}>
                    <FaChevronLeft />
                  </span>
                </button>

                <button onClick={onLogout} className={`${styles.menuItem} ${styles.logoutItem}`}>
                  <span className={styles.menuIcon}>
                    <FaSignOutAlt />
                  </span>
                  <span className={styles.menuText}>تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowThemeMenu(false);
                  }}
                  className={styles.menuItem}
                >
                  <span className={styles.menuIcon}>
                    <FaChevronLeft />
                  </span>
                  <span className={styles.menuText}>رجوع</span>
                </button>

                <div className={styles.themeSubmenu}>
                  <button
                    onClick={() => {
                      setThemeMode("light");
                      setShowThemeMenu(false);
                    }}
                    className={`${styles.themeOption} ${themeMode === "light" ? styles.active : ""}`}
                  >
                    <span className={styles.themeOptionIcon}>
                      <FaSun />
                    </span>
                    <span className={styles.themeOptionText}>فاتح</span>
                    {themeMode === "light" && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setThemeMode("dark");
                      setShowThemeMenu(false);
                    }}
                    className={`${styles.themeOption} ${themeMode === "dark" ? styles.active : ""}`}
                  >
                    <span className={styles.themeOptionIcon}>
                      <FaMoon />
                    </span>
                    <span className={styles.themeOptionText}>داكن</span>
                    {themeMode === "dark" && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setThemeMode("system");
                      setShowThemeMenu(false);
                    }}
                    className={`${styles.themeOption} ${themeMode === "system" ? styles.active : ""}`}
                  >
                    <span className={styles.themeOptionIcon}>
                      <FaDesktop />
                    </span>
                    <span className={styles.themeOptionText}>حسب النظام</span>
                    {themeMode === "system" && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

