"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./landing.module.css";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let unsubscribe = null;

    // التحقق من حالة تسجيل الدخول - توجيه فوري بدون انتظار
    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (hasNavigated.current) return;

      hasNavigated.current = true;
      setLoading(false);

      // توجيه فوري بدون أي تأخير
      if (user) {
        // المستخدم مسجل دخول - التوجه إلى /home
        router.replace("/home");
      } else {
        // المستخدم غير مسجل دخول - التوجه إلى /login
        router.replace("/login");
      }
    });

    // Timeout احتياطي في حالة تأخر onAuthStateChanged (2 ثانية كحد أقصى)
    const fallbackTimeout = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        setLoading(false);
        // افتراض أن المستخدم غير مسجل دخول في حالة الخطأ
        router.replace("/login");
      }
    }, 2000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(fallbackTimeout);
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
