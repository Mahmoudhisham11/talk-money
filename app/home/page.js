"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { FaBell, FaBars } from "react-icons/fa";
import BudgetSlider from "../components/BudgetSlider";
import ExpenseList from "../components/ExpenseList";
import AddBudgetModal from "../components/AddBudgetModal";
import AddExpenseModal from "../components/AddExpenseModal";
import EditExpenseModal from "../components/EditExpenseModal";
import ConfirmModal from "../components/ConfirmModal";
import ProfileDropdown from "../components/ProfileDropdown";
import styles from "./home.module.css";
import SideBar from "../components/Sidebar";

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [actionLoading, setActionLoading] = useState({
    add: false,
    addExpense: false,
    delete: false,
    edit: false,
  });
  const [budget, setBudget] = useState({
    personal: 0,
    investment: 0,
    commitments: 0,
  });
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [todayIncomes, setTodayIncomes] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [dailyBudget, setDailyBudget] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const notificationsRef = useRef(null);
  const expensesSnapshotUnsubscribe = useRef(null);
  const incomesSnapshotUnsubscribe = useRef(null);
  const dailyBudgetSnapshotUnsubscribe = useRef(null);
  const processedNotificationsRef = useRef(new Set());
  const lastCheckedDateRef = useRef(null);
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();

  // دالة للحصول على تاريخ اليوم بصيغة ISO
  const getTodayISO = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  };

  // دالة للتحقق من تجديد اليوم
  const checkDayReset = () => {
    const today = getTodayISO();
    if (lastCheckedDateRef.current !== today) {
      lastCheckedDateRef.current = today;
      processedNotificationsRef.current.clear();
      return true;
    }
    return false;
  };

  // Load user data when user is authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Set user data
        const name = user.displayName || user.email || "";
        setUserName(name);

        if (typeof window !== "undefined") {
          localStorage.setItem("userName", name);
          if (user.photoURL) {
            localStorage.setItem("userPhoto", user.photoURL);
          }
        }

        // التحقق من تجديد اليوم
        checkDayReset();

        // إعداد real-time listeners
        setupExpensesListener(user.uid);
        setupIncomesListener(user.uid);
        setupDailyBudgetListener(user.uid);
      } catch (error) {
        showError("حدث خطأ أثناء جلب بيانات المستخدم");
        await signOut();
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, authLoading, router, signOut, showError]);

  // التحقق من تجديد اليوم كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      checkDayReset();
    }, 60000); // كل دقيقة

    return () => clearInterval(interval);
  }, []);

  // تنظيف الإشعارات القديمة (أكثر من يوم)
  useEffect(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    setNotifications((prev) =>
      prev.filter((notification) => {
        const notificationDate = new Date(notification.timestamp);
        return notificationDate > oneDayAgo;
      })
    );
  }, []);

  // التحقق من تجاوز المبلغ اليومي عند تحديث المصاريف أو المبلغ اليومي
  useEffect(() => {
    if (dailyBudget > 0 && todayExpenses.length > 0) {
      const dailyExpenses = todayExpenses.reduce(
        (total, expense) => total + (expense.amount || 0),
        0
      );

      if (dailyExpenses > dailyBudget) {
        const excessAmount = dailyExpenses - dailyBudget;
        const today = getTodayISO();
        const notificationId = `daily-budget-exceeded-${today}`;

        // التحقق من عدم معالجة هذا الإشعار من قبل
        if (!processedNotificationsRef.current.has(notificationId)) {
          processedNotificationsRef.current.add(notificationId);

          setNotifications((prev) => {
            const existingNotification = prev.find((n) => n.id === notificationId);
            if (existingNotification) return prev;

            const newNotification = {
              id: notificationId,
              type: "warning",
              message: `تم تجاوز المبلغ اليومي! المصاريف: ${dailyExpenses.toLocaleString(
                "ar-EG"
              )} ج.م، المحدد: ${dailyBudget.toLocaleString(
                "ar-EG"
              )} ج.م، الزيادة: ${excessAmount.toLocaleString("ar-EG")} ج.م`,
              timestamp: new Date().toISOString(),
            };

            return [newNotification, ...prev];
          });

          // تأجيل استدعاء showError لتجنب تحديث state أثناء render
          setTimeout(() => {
            showError(
              `تم تجاوز المبلغ اليومي بمقدار ${excessAmount.toLocaleString(
                "ar-EG"
              )} ج.م`
            );
          }, 0);
        }
      }
    }
  }, [todayExpenses, dailyBudget, showError]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("userName");
      if (savedName && !userName) {
        setUserName(savedName);
      }
    }
  }, [userName]);

  // إغلاق قائمة الإشعارات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isNotificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // دالة لحساب الميزانية من الدخل والمصاريف
  const calculateBudget = (incomes, expenses) => {
    const initialBudget = {
      personal: 0,
      investment: 0,
      commitments: 0,
    };

    // إضافة الدخل (مقسوم على 3)
    incomes.forEach((income) => {
      const dividedAmount = (income.amount || 0) / 3;
      initialBudget.personal += dividedAmount;
      initialBudget.investment += dividedAmount;
      initialBudget.commitments += dividedAmount;
    });

    // طرح المصروف من الميزانية المناسبة
    expenses.forEach((expense) => {
      const budgetType = expense.budgetType || "personal";
      initialBudget[budgetType] = Math.max(
        0,
        initialBudget[budgetType] - (expense.amount || 0)
      );
    });

    return initialBudget;
  };

  // إعداد real-time listener للمصاريف (اليوم الحالي فقط)
  const setupExpensesListener = (userId) => {
    if (expensesSnapshotUnsubscribe.current) {
      expensesSnapshotUnsubscribe.current();
    }

    try {
      const expensesRef = collection(db, "expenses");
      const q = query(expensesRef, where("userId", "==", userId));

      expensesSnapshotUnsubscribe.current = onSnapshot(
        q,
        (querySnapshot) => {
          const todayISO = getTodayISO();
          const expensesList = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date) {
              const expenseDate = new Date(data.date);
              expenseDate.setHours(0, 0, 0, 0);
              const expenseDateISO = expenseDate.toISOString().split("T")[0];
              
              // عرض المصاريف اليومية فقط
              if (expenseDateISO === todayISO) {
                expensesList.push({ id: doc.id, ...data });
              }
            }
          });
          
          expensesList.sort((a, b) => {
            const dateA = a.date || a.createdAt || "";
            const dateB = b.date || b.createdAt || "";
            return dateB.localeCompare(dateA);
          });
          
          setTodayExpenses(expensesList);
          setDisplayLimit(5);
        },
        (error) => {
          setTimeout(() => {
            showError("حدث خطأ أثناء جلب المصاريف");
          }, 0);
        }
      );
    } catch (error) {
      setTimeout(() => {
        showError("حدث خطأ أثناء إعداد متابعة المصاريف");
      }, 0);
    }
  };

  // إعداد real-time listener للدخل (اليوم الحالي فقط)
  const setupIncomesListener = (userId) => {
    if (incomesSnapshotUnsubscribe.current) {
      incomesSnapshotUnsubscribe.current();
    }

    try {
      const incomesRef = collection(db, "incomes");
      const q = query(incomesRef, where("userId", "==", userId));

      incomesSnapshotUnsubscribe.current = onSnapshot(
        q,
        (querySnapshot) => {
          const todayISO = getTodayISO();
          const incomesList = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date) {
              const incomeDate = new Date(data.date);
              incomeDate.setHours(0, 0, 0, 0);
              const incomeDateISO = incomeDate.toISOString().split("T")[0];
              
              // عرض الدخل اليومي فقط
              if (incomeDateISO === todayISO) {
                incomesList.push({ id: doc.id, ...data });
              }
            }
          });
          
          incomesList.sort((a, b) => {
            const dateA = a.date || a.createdAt || "";
            const dateB = b.date || b.createdAt || "";
            return dateB.localeCompare(dateA);
          });
          
          setTodayIncomes(incomesList);
        },
        (error) => {
          setTimeout(() => {
            showError("حدث خطأ أثناء جلب الدخل");
          }, 0);
        }
      );
    } catch (error) {
      setTimeout(() => {
        showError("حدث خطأ أثناء إعداد متابعة الدخل");
      }, 0);
    }
  };

  // إعداد real-time listener للمبلغ اليومي
  const setupDailyBudgetListener = (userId) => {
    if (dailyBudgetSnapshotUnsubscribe.current) {
      dailyBudgetSnapshotUnsubscribe.current();
    }

    const updateDailyBudget = () => {
      const todayISO = getTodayISO();
      const dailyBudgetsRef = collection(db, "dailyBudgets");
      const q = query(
        dailyBudgetsRef,
        where("userId", "==", userId),
        where("date", "==", todayISO)
      );

      dailyBudgetSnapshotUnsubscribe.current = onSnapshot(
        q,
        (querySnapshot) => {
          if (!querySnapshot.empty) {
            const dailyBudgetDoc = querySnapshot.docs[0];
            const data = dailyBudgetDoc.data();
            setDailyBudget(data.amount || 0);
          } else {
            setDailyBudget(0);
          }
        },
        (error) => {
          // خطأ صامت
        }
      );
    };

    try {
      updateDailyBudget();
      
      // إعادة إعداد الـ listener كل دقيقة للتحقق من تجديد اليوم
      const interval = setInterval(() => {
        const todayISO = getTodayISO();
        if (lastCheckedDateRef.current !== todayISO) {
          checkDayReset();
          if (dailyBudgetSnapshotUnsubscribe.current) {
            dailyBudgetSnapshotUnsubscribe.current();
          }
          updateDailyBudget();
        }
      }, 60000);

      return () => clearInterval(interval);
    } catch (error) {
      // خطأ صامت
    }
  };

  // إعادة حساب الميزانية عند تحديث المصاريف أو الدخل
  useEffect(() => {
    const calculatedBudget = calculateBudget(todayIncomes, todayExpenses);
    setBudget(calculatedBudget);
  }, [todayIncomes, todayExpenses]);

  // تنظيف الاشتراك عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (expensesSnapshotUnsubscribe.current) {
        expensesSnapshotUnsubscribe.current();
      }
      if (incomesSnapshotUnsubscribe.current) {
        incomesSnapshotUnsubscribe.current();
      }
      if (dailyBudgetSnapshotUnsubscribe.current) {
        dailyBudgetSnapshotUnsubscribe.current();
      }
    };
  }, []);

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 5);
  };

  // دمج الدخل والمصاريف لعرضها معاً
  const allTransactions = [
    ...todayIncomes.map((income) => ({ ...income, type: "income" })),
    ...todayExpenses.map((expense) => ({ ...expense, type: "expense" })),
  ].sort((a, b) => {
    const dateA = a.date || a.createdAt || "";
    const dateB = b.date || b.createdAt || "";
    return dateB.localeCompare(dateA);
  });

  // عرض المعاملات حسب displayLimit
  const expenses = allTransactions.slice(0, displayLimit);

  const handleCardClick = (index) => {
    setSelectedCardIndex(index);
    setIsExpenseModalOpen(true);
  };

  const handleAddExpense = async (expenseData) => {
    if (!user || actionLoading.addExpense) return;

    setActionLoading((prev) => ({ ...prev, addExpense: true }));

    try {
      const budgetTypeMap = {
        0: "personal",
        1: "investment",
        2: "commitments",
      };

      const selectedType =
        budgetTypeMap[selectedCardIndex] ||
        expenseData.budgetType ||
        "personal";
      const currentBudget = budget[selectedType];

      // التحقق من الميزانية
      if (expenseData.amount > currentBudget) {
        showError(
          `المبلغ المتاح في هذا الكارت غير كافي. المتاح: ${currentBudget.toLocaleString(
            "ar-EG"
          )} ج.م`
        );
        setActionLoading((prev) => ({ ...prev, addExpense: false }));
        return;
      }

      // التحقق من المبلغ اليومي (فقط إشعار، لا إيقاف العملية)
      if (dailyBudget > 0) {
        const totalTodayExpenses =
          todayExpenses.reduce((total, expense) => total + (expense.amount || 0), 0) +
          expenseData.amount;

        if (totalTodayExpenses > dailyBudget) {
          const excessAmount = totalTodayExpenses - dailyBudget;
          setTimeout(() => {
            showError(
              `تم تجاوز المبلغ اليومي بمقدار ${excessAmount.toLocaleString("ar-EG")} ج.م`
            );
          }, 0);
        }
      }

      // إضافة المصروف في collection منفصلة
      const todayISO = getTodayISO();
      await addDoc(collection(db, "expenses"), {
        userId: user.uid,
        amount: expenseData.amount,
        category: expenseData.category,
        budgetType: selectedType,
        reason: expenseData.reason,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });

      // لا نحتاج تحديث الميزانية هنا لأن onSnapshot سيقوم بذلك تلقائياً
      showSuccess("تم إضافة المصروف بنجاح");
      setIsExpenseModalOpen(false);
      setSelectedCardIndex(null);
    } catch (error) {
      console.error("Error adding expense:", error);
      showError("حدث خطأ أثناء إضافة المصروف");
    } finally {
      setActionLoading((prev) => ({ ...prev, addExpense: false }));
    }
  };

  const handleAddBudget = async (amount, reason = "إضافة مبلغ جديد") => {
    if (!user || actionLoading.add) return;

    setActionLoading((prev) => ({ ...prev, add: true }));

    try {
      // إضافة الدخل في collection منفصلة
      await addDoc(collection(db, "incomes"), {
        userId: user.uid,
        amount: amount,
        category: "other",
        reason: reason,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });

      showSuccess("تم إضافة المبلغ بنجاح");
    } catch (error) {
      console.error("Error adding budget:", error);
      showError("حدث خطأ أثناء إضافة المبلغ");
    } finally {
      setActionLoading((prev) => ({ ...prev, add: false }));
    }
  };

  const handleDeleteClick = (transactionId) => {
    const transaction = allTransactions.find((t) => t.id === transactionId);
    if (transaction) {
      setExpenseToDelete(transaction);
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !expenseToDelete || actionLoading.delete) return;

    setActionLoading((prev) => ({ ...prev, delete: true }));
    setIsConfirmModalOpen(false);

    try {
      // حذف المعاملة من collection المناسبة
      const collectionName = expenseToDelete.type === "income" ? "incomes" : "expenses";
      await deleteDoc(doc(db, collectionName, expenseToDelete.id));

      showSuccess("تم حذف المعاملة بنجاح");
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      showError("حدث خطأ أثناء حذف المعاملة");
    } finally {
      setActionLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleSaveExpense = async (updatedExpense) => {
    if (!user || actionLoading.edit) return;

    setActionLoading((prev) => ({ ...prev, edit: true }));

    try {
      const oldTransaction = allTransactions.find((t) => t.id === updatedExpense.id);
      if (!oldTransaction) return;

      // تحديث المعاملة في collection المناسبة
      const collectionName = updatedExpense.type === "income" ? "incomes" : "expenses";
      const updateData = {
        amount: updatedExpense.amount,
        reason: updatedExpense.reason,
        category: updatedExpense.category,
      };

      if (updatedExpense.type === "expense") {
        updateData.budgetType = updatedExpense.budgetType;
      }

      await updateDoc(doc(db, collectionName, updatedExpense.id), updateData);

      showSuccess("تم تحديث المعاملة بنجاح");
      setIsEditModalOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error("Error updating transaction:", error);
      showError("حدث خطأ أثناء تحديث المعاملة");
    } finally {
      setActionLoading((prev) => ({ ...prev, edit: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      showError("حدث خطأ أثناء تسجيل الخروج");
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>جاري التحميل...</div>
      </div>
    );
  }

  const budgets = [
    {
      title: "مصاريف شخصية",
      amount: budget.personal,
      icon: "💳",
      color: "rgba(59, 130, 246, 0.2)",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",
    },
    {
      title: "استثمار",
      amount: budget.investment,
      icon: "📈",
      color: "rgba(16, 185, 129, 0.2)",
      gradient:
        "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)",
    },
    {
      title: "التزامات",
      amount: budget.commitments,
      icon: "📋",
      color: "rgba(245, 158, 11, 0.2)",
      gradient:
        "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)",
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.userSection}>
              <ProfileDropdown userName={userName} onLogout={handleLogout} />
              <div className={styles.userInfo}>
                <h1 className={styles.userName}>{userName}</h1>
                {userRole && (
                  <span
                    className={`${styles.roleBadge} ${
                      userRole === "admin" ? styles.admin : styles.user
                    }`}
                  >
                    {userRole === "admin" ? "مدير" : "مستخدم"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.links}>
            <div ref={notificationsRef} className={styles.notificationsContainer}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={styles.iconButton}
                title="الإشعارات"
                aria-label="الإشعارات"
              >
                <FaBell />
                {notifications.length > 0 && (
                  <span className={styles.notificationBadge}>
                    {notifications.length > 99 ? "99+" : notifications.length}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className={styles.notificationsDropdown}>
                  <div className={styles.notificationsHeader}>
                    <h3>الإشعارات</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className={styles.clearNotifications}
                        title="مسح جميع الإشعارات"
                      >
                        مسح الكل
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className={styles.closeNotifications}
                      aria-label="إغلاق"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.notificationsList}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyNotifications}>
                        <span>لا توجد إشعارات جديدة</span>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`${styles.notificationItem} ${
                            styles[notification.type]
                          }`}
                        >
                          <div className={styles.notificationContent}>
                            <span className={styles.notificationIcon}>
                              {notification.type === "warning" && "⚠️"}
                              {notification.type === "error" && "❌"}
                              {notification.type === "success" && "✅"}
                              {notification.type === "info" && "ℹ️"}
                            </span>
                            <div className={styles.notificationText}>
                              <p className={styles.notificationMessage}>
                                {notification.message}
                              </p>
                              <span className={styles.notificationTime}>
                                {new Date(notification.timestamp).toLocaleString(
                                  "ar-EG",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setNotifications((prev) =>
                                prev.filter((n) => n.id !== notification.id)
                              )
                            }
                            className={styles.removeNotification}
                            aria-label="حذف الإشعار"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={styles.burgerButton}
              aria-label="قائمة التنقل"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </header>
      <div className={styles.contentContainer}>
        <main className={styles.mainContent}>
          <div className={styles.content}>
            <section className={styles.budgetSection}>
              <BudgetSlider
                budgets={budgets}
                onCardClick={handleCardClick}
                selectedCardIndex={selectedCardIndex}
              />
              <button
                onClick={() => setIsModalOpen(true)}
                className={styles.addButton}
              >
                <span className={styles.addIcon}>+</span>
                إضافة مبلغ جديد
              </button>
            </section>

            <ExpenseList
              expenses={expenses}
              allExpensesCount={allTransactions.length}
              displayLimit={displayLimit}
              onEdit={handleEditExpense}
              onDelete={handleDeleteClick}
              onLoadMore={handleLoadMore}
            />
          </div>
        </main>
        <SideBar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          userRole={userRole}
        />
        <AddBudgetModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddBudget}
          loading={actionLoading.add}
        />

        <AddExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setSelectedCardIndex(null);
          }}
          onAdd={handleAddExpense}
          selectedBudgetType={
            selectedCardIndex !== null
              ? ["personal", "investment", "commitments"][selectedCardIndex]
              : null
          }
          loading={actionLoading.addExpense}
        />

        <EditExpenseModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedExpense(null);
          }}
          expense={selectedExpense}
          onSave={handleSaveExpense}
          loading={actionLoading.edit}
        />

        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setExpenseToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء."
          confirmText={actionLoading.delete ? "جاري الحذف..." : "حذف"}
          cancelText="إلغاء"
          type="danger"
        />
      </div>
    </div>
  );
}
