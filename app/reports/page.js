"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { FaBars, FaChartLine, FaMoneyBillWave, FaShoppingCart } from "react-icons/fa";
import SideBar from "../components/Sidebar";
import styles from "./reports.module.css";

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [periodType, setPeriodType] = useState("day"); // "day" or "month"
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [reportData, setReportData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    topReason: null,
    reasonBreakdown: {},
  });
  const [fetchingData, setFetchingData] = useState(false);
  const router = useRouter();

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

  // دالة لجلب البيانات وحساب الإحصائيات
  const fetchReportData = useCallback(async () => {
    if (!user) return;

    setFetchingData(true);
    try {
      const startDate = periodType === "day" 
        ? new Date(selectedDate)
        : new Date(`${selectedMonth}-01`);
      
      const endDate = periodType === "day"
        ? new Date(selectedDate)
        : new Date(
            new Date(`${selectedMonth}-01`).getFullYear(),
            new Date(`${selectedMonth}-01`).getMonth() + 1,
            0
          );

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // جلب الدخل
      const incomesRef = collection(db, "incomes");
      const incomesQuery = query(
        incomesRef,
        where("userId", "==", user.uid)
      );
      const incomesSnapshot = await getDocs(incomesQuery);

      // جلب المصاريف
      const expensesRef = collection(db, "expenses");
      const expensesQuery = query(
        expensesRef,
        where("userId", "==", user.uid)
      );
      const expensesSnapshot = await getDocs(expensesQuery);

      let totalIncome = 0;
      let totalExpenses = 0;
      const reasonBreakdown = {};

      // معالجة الدخل
      incomesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          const incomeDate = new Date(data.date);
          if (incomeDate >= startDate && incomeDate <= endDate) {
            totalIncome += data.amount || 0;
          }
        }
      });

      // معالجة المصاريف
      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          const expenseDate = new Date(data.date);
          if (expenseDate >= startDate && expenseDate <= endDate) {
            const amount = data.amount || 0;
            totalExpenses += amount;

            // حساب المصاريف حسب السبب
            const reason = data.reason || "بدون سبب";
            if (!reasonBreakdown[reason]) {
              reasonBreakdown[reason] = 0;
            }
            reasonBreakdown[reason] += amount;
          }
        }
      });

      // العثور على أكثر سبب يتم الصرف فيه
      let topReason = null;
      let maxAmount = 0;
      Object.keys(reasonBreakdown).forEach((reason) => {
        if (reasonBreakdown[reason] > maxAmount) {
          maxAmount = reasonBreakdown[reason];
          topReason = reason;
        }
      });

      setReportData({
        totalIncome,
        totalExpenses,
        topReason,
        reasonBreakdown,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setFetchingData(false);
    }
  }, [user, periodType, selectedDate, selectedMonth]);

  // جلب البيانات عند تغيير الفترة أو التاريخ
  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, fetchReportData]);


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
        <h1 className={styles.title}>التقارير</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <div className={styles.contentContainer}>
        <main className={styles.main}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>التقارير المالية</h2>

            {/* اختيار نوع الفترة */}
            <div className={styles.periodSelector}>
              <div className={styles.periodType}>
                <label>
                  <input
                    type="radio"
                    value="day"
                    checked={periodType === "day"}
                    onChange={(e) => setPeriodType(e.target.value)}
                  />
                  <span>يوم محدد</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="month"
                    checked={periodType === "month"}
                    onChange={(e) => setPeriodType(e.target.value)}
                  />
                  <span>شهر محدد</span>
                </label>
              </div>

              {periodType === "day" ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={styles.dateInput}
                />
              ) : (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={styles.dateInput}
                />
              )}
            </div>

            {fetchingData ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>جاري جلب البيانات...</p>
              </div>
            ) : (
              <>
                {/* بطاقات الإحصائيات */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                      <FaMoneyBillWave style={{ color: "#10b981" }} />
                    </div>
                    <div className={styles.statContent}>
                      <h3 className={styles.statLabel}>إجمالي الدخل</h3>
                      <p className={styles.statValue}>
                        {reportData.totalIncome.toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                      <FaShoppingCart style={{ color: "#ef4444" }} />
                    </div>
                    <div className={styles.statContent}>
                      <h3 className={styles.statLabel}>إجمالي المصاريف</h3>
                      <p className={styles.statValue}>
                        {reportData.totalExpenses.toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                      <FaChartLine style={{ color: "#3b82f6" }} />
                    </div>
                    <div className={styles.statContent}>
                      <h3 className={styles.statLabel}>المتبقي</h3>
                      <p
                        className={styles.statValue}
                        style={{
                          color:
                            reportData.totalIncome - reportData.totalExpenses >= 0
                              ? "#10b981"
                              : "#ef4444",
                        }}
                      >
                        {(reportData.totalIncome - reportData.totalExpenses).toLocaleString(
                          "ar-EG"
                        )}{" "}
                        ج.م
                      </p>
                    </div>
                  </div>
                </div>

                {/* أكثر سبب يتم الصرف فيه */}
                {reportData.topReason && (
                  <div className={styles.topCategoryCard}>
                    <h3 className={styles.topCategoryTitle}>أكثر سبب يتم الصرف فيه</h3>
                    <div className={styles.topCategoryContent}>
                      <span className={styles.topCategoryName}>
                        {reportData.topReason}
                      </span>
                      <span className={styles.topCategoryAmount}>
                        {reportData.reasonBreakdown[reportData.topReason].toLocaleString(
                          "ar-EG"
                        )}{" "}
                        ج.م
                      </span>
                    </div>
                  </div>
                )}

                {/* تفصيل المصاريف حسب السبب */}
                {Object.keys(reportData.reasonBreakdown).length > 0 && (
                  <div className={styles.categoryBreakdown}>
                    <h3 className={styles.breakdownTitle}>تفصيل المصاريف حسب السبب</h3>
                    <div className={styles.breakdownList}>
                      {Object.entries(reportData.reasonBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([reason, amount]) => (
                          <div key={reason} className={styles.breakdownItem}>
                            <span className={styles.breakdownCategory}>
                              {reason}
                            </span>
                            <span className={styles.breakdownAmount}>
                              {amount.toLocaleString("ar-EG")} ج.م
                            </span>
                            <div className={styles.breakdownBar}>
                              <div
                                className={styles.breakdownBarFill}
                                style={{
                                  width: `${
                                    (amount / reportData.totalExpenses) * 100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* حالة عدم وجود بيانات */}
                {reportData.totalIncome === 0 && reportData.totalExpenses === 0 && (
                  <div className={styles.emptyState}>
                    <p>لا توجد بيانات للفترة المحددة</p>
                  </div>
                )}
              </>
            )}
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

