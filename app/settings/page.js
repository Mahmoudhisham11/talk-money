"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "../context/ThemeContext";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ←
        </button>
        <h1 className={styles.title}>الإعدادات</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>المظهر</h2>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>الوضع</span>
              <span className={styles.settingValue}>
                {theme === "light" ? "فاتح" : "داكن"}
              </span>
            </div>
            <button onClick={toggleTheme} className={styles.toggleButton}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>الحساب</h2>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>البريد الإلكتروني</span>
              <span className={styles.settingValue}>{user?.email}</span>
            </div>
          </div>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>الاسم</span>
              <span className={styles.settingValue}>
                {user?.displayName || "غير محدد"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

