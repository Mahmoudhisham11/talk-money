"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, getDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // التحقق من role المستخدم
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.data();

        if (userData?.role !== "admin") {
          router.push("/home");
          return;
        }

        // جلب جميع المستخدمين
        await fetchUsers();
      } else {
        router.push("/");
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
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("حدث خطأ أثناء تحديث صلاحيات المستخدم");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>إدارة المستخدمين</h1>
        <button onClick={() => router.push("/home")} className={styles.backButton}>
          العودة للصفحة الرئيسية
        </button>
      </div>

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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

