"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
import { FaBars } from "react-icons/fa";
import SideBar from "../components/Sidebar";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dailyBudget, setDailyBudget] = useState("");
  const [dailyBudgetLoading, setDailyBudgetLoading] = useState(false);
  const router = useRouter();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const { showSuccess, showError } = useNotifications();

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // التحقق من وجود المستخدم في Firestore (Auth Guard)
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          if (!userDoc.exists()) {
            // المستخدم غير موجود في Firestore - تسجيل الخروج وإعادة التوجيه
            await signOut(auth);
            if (typeof window !== "undefined") {
              localStorage.removeItem("userName");
              localStorage.removeItem("userPhoto");
              localStorage.removeItem("rememberMe");
            }
            router.push("/login");
            return;
          }

          // المستخدم موجود - متابعة التحميل
          setUser(currentUser);
          const userData = userDoc.data();
          // التأكد من وجود role مع القيمة الافتراضية
          const role = userData?.role || "user";
          setUserRole(role);
          
          // تحديث localStorage بالبيانات الصحيحة
          if (typeof window !== "undefined") {
            const firestoreName = userData.name || currentUser.displayName || currentUser.email || "";
            if (firestoreName) {
              localStorage.setItem("userName", firestoreName);
            }
            if (userData.photoURL || currentUser.photoURL) {
              localStorage.setItem("userPhoto", userData.photoURL || currentUser.photoURL);
            }
          }
          
          // جلب المبلغ اليومي من collection منفصلة
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayISO = today.toISOString().split("T")[0];
          
          const dailyBudgetsRef = collection(db, "dailyBudgets");
          const q = query(
            dailyBudgetsRef,
            where("userId", "==", currentUser.uid),
            where("date", "==", todayISO)
          );
          
          const dailyBudgetSnapshot = await getDocs(q);
          if (!dailyBudgetSnapshot.empty) {
            const dailyBudgetData = dailyBudgetSnapshot.docs[0].data();
            setDailyBudget(dailyBudgetData.amount?.toString() || "");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // في حالة الخطأ، تسجيل الخروج وإعادة التوجيه
          await signOut(auth);
          if (typeof window !== "undefined") {
            localStorage.removeItem("userName");
            localStorage.removeItem("userPhoto");
            localStorage.removeItem("rememberMe");
          }
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // دالة لحفظ المبلغ اليومي في collection منفصلة
  const handleSaveDailyBudget = async () => {
    if (!user) return;
    
    const amount = parseFloat(dailyBudget);
    if (isNaN(amount) || amount < 0) {
      showError("يرجى إدخال مبلغ صحيح");
      return;
    }

    setDailyBudgetLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().split("T")[0];
      
      // البحث عن مبلغ يومي موجود لليوم الحالي
      const dailyBudgetsRef = collection(db, "dailyBudgets");
      const q = query(
        dailyBudgetsRef,
        where("userId", "==", user.uid),
        where("date", "==", todayISO)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // تحديث المبلغ اليومي الموجود
        const dailyBudgetDoc = querySnapshot.docs[0];
        await setDoc(
          doc(db, "dailyBudgets", dailyBudgetDoc.id),
          {
            amount: amount,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // إضافة مبلغ يومي جديد
        await setDoc(doc(db, "dailyBudgets", `${user.uid}_${todayISO}`), {
          userId: user.uid,
          amount: amount,
          date: todayISO,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      showSuccess("تم حفظ المبلغ اليومي بنجاح");
    } catch (error) {
      showError("حدث خطأ أثناء حفظ المبلغ اليومي");
    } finally {
      setDailyBudgetLoading(false);
    }
  };

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
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={styles.burgerButton}
          aria-label="قائمة التنقل"
        >
          <FaBars />
        </button>
        <h1 className={styles.title}>الإعدادات</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <div className={styles.contentContainer}>
        <main className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>المظهر</h2>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>الوضع</span>
              <span className={styles.settingValue}>
                {themeMode === "light" && "فاتح"}
                {themeMode === "dark" && "داكن"}
                {themeMode === "system" && `حسب النظام (${resolvedTheme === "light" ? "فاتح" : "داكن"})`}
              </span>
            </div>
          </div>
          <div className={styles.themeButtons}>
            <button
              onClick={() => setThemeMode("light")}
              className={`${styles.themeButton} ${themeMode === "light" ? styles.active : ""}`}
              aria-label="الوضع الفاتح"
            >
              <span className={styles.themeButtonIcon}>☀️</span>
              <span className={styles.themeButtonLabel}>فاتح</span>
            </button>
            <button
              onClick={() => setThemeMode("dark")}
              className={`${styles.themeButton} ${themeMode === "dark" ? styles.active : ""}`}
              aria-label="الوضع الداكن"
            >
              <span className={styles.themeButtonIcon}>🌙</span>
              <span className={styles.themeButtonLabel}>داكن</span>
            </button>
            <button
              onClick={() => setThemeMode("system")}
              className={`${styles.themeButton} ${themeMode === "system" ? styles.active : ""}`}
              aria-label="حسب النظام"
            >
              <span className={styles.themeButtonIcon}>💻</span>
              <span className={styles.themeButtonLabel}>حسب النظام</span>
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

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>المبلغ اليومي</h2>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>المبلغ اليومي</span>
              <span className={styles.settingValue}>
                المبلغ الذي تنفقه يومياً
              </span>
            </div>
          </div>
          <div className={styles.dailyBudgetContainer}>
            <div className={styles.inputGroup}>
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="أدخل المبلغ اليومي"
                min="0"
                step="0.01"
                className={styles.dailyBudgetInput}
              />
              <span className={styles.currency}>ج.م</span>
            </div>
            <button
              onClick={handleSaveDailyBudget}
              disabled={dailyBudgetLoading || !dailyBudget}
              className={styles.saveButton}
            >
              {dailyBudgetLoading ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
        </main>
        <SideBar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          userRole={userRole}
        />
      </div>
    </div>
  );
}

