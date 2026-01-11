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
  const startTime = useRef(Date.now());
  const minLoadingDuration = 1500; // الحد الأدنى للـ loading: 1.5 ثانية

  useEffect(() => {
    let unsubscribe = null;
    let timeoutId = null;

    // التحقق من حالة تسجيل الدخول
    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (hasNavigated.current) return;

      // إلغاء أي timeout سابق
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // حساب الوقت المتبقي للوصول للحد الأدنى
      const elapsed = Date.now() - startTime.current;
      const remainingTime = Math.max(0, minLoadingDuration - elapsed);

      // الانتظار حتى يمر الوقت الأدنى ثم التوجيه
      timeoutId = setTimeout(() => {
        if (hasNavigated.current) return;

        hasNavigated.current = true;
        setLoading(false);

        if (user) {
          // المستخدم مسجل دخول - التوجه إلى /home
          router.replace("/home");
        } else {
          // المستخدم غير مسجل دخول - التوجه إلى /login
          router.replace("/login");
        }
      }, remainingTime);
    });

    // Timeout احتياطي في حالة تأخر onAuthStateChanged (5 ثواني كحد أقصى)
    const fallbackTimeout = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        setLoading(false);
        // افتراض أن المستخدم غير مسجل دخول في حالة الخطأ
        router.replace("/login");
      }
    }, 5000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
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
