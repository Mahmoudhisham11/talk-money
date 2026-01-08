"use client";

import styles from "./loading.module.css";

export default function LoadingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContent}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Talk Money</span>
        </div>
        <div className={styles.spinner}>
          <div className={styles.spinnerCircle}></div>
        </div>
        <p className={styles.loadingText}>جاري التحميل...</p>
      </div>
    </div>
  );
}

