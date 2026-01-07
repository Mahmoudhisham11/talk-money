"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaBars } from "react-icons/fa";
import SideBar from "../components/Sidebar";
import styles from "./reports.module.css";

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || "user");
          } else {
            setUserRole("user");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserRole("user");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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
            <p className={styles.description}>
              صفحة التقارير قيد التطوير. سيتم إضافة التقارير المالية قريباً.
            </p>
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

