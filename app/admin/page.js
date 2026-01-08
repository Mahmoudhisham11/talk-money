"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useNotifications } from "../context/NotificationContext";
import { FaTrashAlt, FaArrowRight, FaBars } from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import SideBar from "../components/Sidebar";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
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
              localStorage.removeItem("rememberMe");
            }
            router.push("/login");
            return;
          }

          // المستخدم موجود - التحقق من role
          setUser(currentUser);
          const userData = userDoc.data();

          if (userData?.role !== "admin") {
            router.push("/home");
            return;
          }

          setUserRole(userData?.role || "admin");

          // جلب جميع المستخدمين
          await fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const usersList = [];

      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    setUpdating(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

      // تحديث القائمة المحلية
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showSuccess("تم تحديث صلاحيات المستخدم بنجاح");
    } catch (error) {
      console.error("Error updating user role:", error);
      showError("حدث خطأ أثناء تحديث صلاحيات المستخدم");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (userItem) => {
    setUserToDelete(userItem);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || deleting) return;

    setDeleting(true);
    setIsDeleteModalOpen(false);

    try {
      // حذف المستخدم من Firestore
      await deleteDoc(doc(db, "users", userToDelete.id));

      // تحديث القائمة المحلية
      setUsers((prevUsers) =>
        prevUsers.filter((u) => u.id !== userToDelete.id)
      );

      showSuccess("تم حذف المستخدم بنجاح");
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      showError("حدث خطأ أثناء حذف المستخدم");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={styles.burgerButton}
            aria-label="قائمة التنقل"
          >
            <FaBars />
          </button>
          <h1 className={styles.title}>إدارة المستخدمين</h1>
          <div style={{ width: 40 }}></div>
        </div>
      </header>

      <div className={styles.contentContainer}>
        <main className={styles.main}>
          <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الصلاحية</th>
              <th>تاريخ الإنشاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.noData}>
                  لا يوجد مستخدمين
                </td>
              </tr>
            ) : (
              users.map((userItem) => (
                <tr key={userItem.id}>
                  <td>{userItem.displayName || "بدون اسم"}</td>
                  <td>{userItem.email}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${
                        userItem.role === "admin" ? styles.admin : styles.user
                      }`}
                    >
                      {userItem.role === "admin" ? "مدير" : "مستخدم"}
                    </span>
                  </td>
                  <td>
                    {userItem.createdAt
                      ? new Date(userItem.createdAt).toLocaleDateString("ar-EG")
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <select
                        value={userItem.role}
                        onChange={(e) =>
                          updateUserRole(userItem.id, e.target.value)
                        }
                        disabled={updating || userItem.id === user?.uid}
                        className={styles.roleSelect}
                      >
                        <option value="user">مستخدم</option>
                        <option value="admin">مدير</option>
                      </select>
                      <button
                        onClick={() => handleDeleteClick(userItem)}
                        disabled={deleting || userItem.id === user?.uid}
                        className={styles.deleteButton}
                        title="حذف المستخدم"
                        aria-label="حذف المستخدم"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </main>
      <SideBar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={userRole}
      />
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.displayName || userToDelete?.email}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText={deleting ? "جاري الحذف..." : "حذف"}
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

