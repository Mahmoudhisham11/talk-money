"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useNotifications } from "../context/NotificationContext";
import { FaCog, FaUsers, FaBars } from "react-icons/fa";
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
  const [user, setUser] = useState(null);
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
  const [allExpenses, setAllExpenses] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();

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
              localStorage.removeItem("rememberMe");
            }
            router.push("/login");
            return;
          }

          // المستخدم موجود - متابعة التحميل
          setUser(currentUser);
          const name = currentUser.displayName || currentUser.email || "";
          setUserName(name);

          if (typeof window !== "undefined") {
            localStorage.setItem("userName", name);
          }

          const userData = userDoc.data();
          setUserRole(userData.role || "user");
          
          if (userData.budget) {
            setBudget(userData.budget);
          }

          await fetchExpenses(currentUser.uid);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // في حالة الخطأ، تسجيل الخروج وإعادة التوجيه
          await signOut(auth);
          if (typeof window !== "undefined") {
            localStorage.removeItem("userName");
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("userName");
      if (savedName && !userName) {
        setUserName(savedName);
      }
    }
  }, [userName]);

  const fetchExpenses = async (userId) => {
    try {
      const expensesRef = collection(db, "expenses");
      const q = query(expensesRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });
      expensesList.sort((a, b) => {
        const dateA = a.date || a.createdAt || "";
        const dateB = b.date || b.createdAt || "";
        return dateB.localeCompare(dateA);
      });
      setAllExpenses(expensesList);
      // إعادة تعيين displayLimit عند جلب بيانات جديدة
      setDisplayLimit(5);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      showError("حدث خطأ أثناء جلب المصاريف");
    }
  };

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 5);
  };

  // عرض المعاملات حسب displayLimit
  const expenses = allExpenses.slice(0, displayLimit);

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

      if (expenseData.amount > currentBudget) {
        showError(
          `المبلغ المتاح في هذا الكارت غير كافي. المتاح: ${currentBudget.toLocaleString(
            "ar-EG"
          )} ج.م`
        );
        setActionLoading((prev) => ({ ...prev, addExpense: false }));
        return;
      }

      const newBudget = {
        ...budget,
        [selectedType]: Math.max(0, currentBudget - expenseData.amount),
      };

      await setDoc(
        doc(db, "users", user.uid),
        { budget: newBudget },
        { merge: true }
      );

      await addDoc(collection(db, "expenses"), {
        userId: user.uid,
        amount: expenseData.amount,
        type: "expense",
        category: expenseData.category,
        budgetType: selectedType,
        reason: expenseData.reason,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setBudget(newBudget);
      await fetchExpenses(user.uid);
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
      // تقسيم المبلغ بالتساوي على 3
      const dividedAmount = amount / 3;

      const newBudget = {
        personal: budget.personal + dividedAmount,
        investment: budget.investment + dividedAmount,
        commitments: budget.commitments + dividedAmount,
      };

      await setDoc(
        doc(db, "users", user.uid),
        { budget: newBudget },
        { merge: true }
      );

      await addDoc(collection(db, "expenses"), {
        userId: user.uid,
        amount: amount,
        type: "income",
        category: "other",
        reason: reason,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setBudget(newBudget);
      await fetchExpenses(user.uid);
      showSuccess("تم إضافة المبلغ بنجاح");
    } catch (error) {
      console.error("Error adding budget:", error);
      showError("حدث خطأ أثناء إضافة المبلغ");
    } finally {
      setActionLoading((prev) => ({ ...prev, add: false }));
    }
  };

  const handleDeleteClick = (expenseId) => {
    const expense = allExpenses.find((e) => e.id === expenseId);
    if (expense) {
      setExpenseToDelete(expense);
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !expenseToDelete || actionLoading.delete) return;

    setActionLoading((prev) => ({ ...prev, delete: true }));
    setIsConfirmModalOpen(false);

    try {
      // حذف المعاملة من Firestore
      await deleteDoc(doc(db, "expenses", expenseToDelete.id));

      // تحديث الرصيد
      const amount = expenseToDelete.amount || 0;
      let newBudget = { ...budget };

      if (expenseToDelete.type === "income") {
        // إذا كان دخل، نطرح من الرصيد (مقسوم على 3)
        const dividedAmount = amount / 3;
        newBudget = {
          personal: Math.max(0, budget.personal - dividedAmount),
          investment: Math.max(0, budget.investment - dividedAmount),
          commitments: Math.max(0, budget.commitments - dividedAmount),
        };
      } else {
        // إذا كان مصروف، نضيف للرصيد
        const budgetType = expenseToDelete.budgetType || "personal";
        newBudget = {
          ...budget,
          [budgetType]: budget[budgetType] + amount,
        };
      }

      await setDoc(
        doc(db, "users", user.uid),
        { budget: newBudget },
        { merge: true }
      );

      setBudget(newBudget);
      await fetchExpenses(user.uid);
      showSuccess("تم حذف المعاملة بنجاح");
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
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
      const oldExpense = allExpenses.find((e) => e.id === updatedExpense.id);
      if (!oldExpense) return;

      // تحديث المعاملة في Firestore
      await updateDoc(doc(db, "expenses", updatedExpense.id), {
        amount: updatedExpense.amount,
        reason: updatedExpense.reason,
        category: updatedExpense.category,
        budgetType: updatedExpense.budgetType,
        type: updatedExpense.type,
      });

      // تحديث الرصيد
      let newBudget = { ...budget };

      // إعادة المبلغ القديم
      const oldAmount = oldExpense.amount || 0;
      if (oldExpense.type === "income") {
        // إعادة المبلغ القديم (مقسوم على 3)
        const dividedOldAmount = oldAmount / 3;
        newBudget = {
          personal: Math.max(0, budget.personal - dividedOldAmount),
          investment: Math.max(0, budget.investment - dividedOldAmount),
          commitments: Math.max(0, budget.commitments - dividedOldAmount),
        };
      } else {
        const oldBudgetType = oldExpense.budgetType || "personal";
        newBudget = {
          ...budget,
          [oldBudgetType]: budget[oldBudgetType] + oldAmount,
        };
      }

      // إضافة المبلغ الجديد
      const newAmount = updatedExpense.amount || 0;
      if (updatedExpense.type === "income") {
        // إضافة المبلغ الجديد (مقسوم على 3)
        const dividedNewAmount = newAmount / 3;
        newBudget = {
          personal: newBudget.personal + dividedNewAmount,
          investment: newBudget.investment + dividedNewAmount,
          commitments: newBudget.commitments + dividedNewAmount,
        };
      } else {
        const newBudgetType = updatedExpense.budgetType || "personal";
        newBudget = {
          ...newBudget,
          [newBudgetType]: Math.max(0, newBudget[newBudgetType] - newAmount),
        };
      }

      await setDoc(
        doc(db, "users", user.uid),
        { budget: newBudget },
        { merge: true }
      );

      setBudget(newBudget);
      await fetchExpenses(user.uid);
      showSuccess("تم تحديث المعاملة بنجاح");
      setIsEditModalOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error("Error updating expense:", error);
      showError("حدث خطأ أثناء تحديث المعاملة");
    } finally {
      setActionLoading((prev) => ({ ...prev, edit: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userName");
        localStorage.removeItem("rememberMe");
      }
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      showError("حدث خطأ أثناء تسجيل الخروج");
    }
  };

  if (loading) {
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
            <button
              onClick={() => router.push("/settings")}
              className={styles.iconButton}
              title="الإعدادات"
              aria-label="الإعدادات"
            >
              <FaCog />
            </button>
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
              allExpensesCount={allExpenses.length}
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
