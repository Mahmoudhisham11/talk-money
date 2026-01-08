"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./loading.module.css";

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    // التحقق من localStorage للتحقق من حالة تسجيل الدخول
    const checkAuthStatus = () => {
      if (typeof window !== "undefined") {
        const userName = localStorage.getItem("userName");
        
        if (userName) {
          // المستخدم مسجل دخول - التوجه إلى /home
          router.replace("/home");
        } else {
          // المستخدم غير مسجل دخول - التوجه إلى /login
          router.replace("/login");
        }
      }
    };

    // تنفيذ التحقق فوراً
    checkAuthStatus();
  }, [router]);

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

