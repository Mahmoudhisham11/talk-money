"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./landing.module.css";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // انتظار ثانيتين
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // التحقق من حالة تسجيل الدخول
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // المستخدم مسجل دخول - التوجه إلى /home
        router.push("/home");
      } else {
        // المستخدم غير مسجل دخول - التوجه إلى /login
        router.push("/login");
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <h1 className={styles.logo}>Talk Money</h1>
          <p className={styles.tagline}>تطبيقك لإدارة المصاريف الشخصية</p>
        </div>
        
        {loading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
    </div>
  );
}
