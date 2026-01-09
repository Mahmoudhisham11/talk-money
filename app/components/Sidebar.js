"use client";
import { useRouter, usePathname } from "next/navigation";
import { FaTimes, FaHome, FaUsers, FaChartBar, FaCog } from "react-icons/fa";
import styles from "./Sidebar.module.css";
export default function SideBar({ isOpen, onClose, userRole }) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      label: "الصفحة الرئيسية",
      icon: FaHome,
      path: "/home",
      visible: true,
    },
    { 
      label: "إدارة المستخدمين",
      icon: FaUsers,
      path: "/admin",
      visible: userRole === "admin",
    },
    {
      label: "التقارير",
      icon: FaChartBar,
      path: "/reports",
      visible: true,
    },
    {
      label: "الإعدادات",
      icon: FaCog,
      path: "/settings",
      visible: true,
    },
  ];

  const handleNavigation = (path) => {
    router.push(path);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.logo}>Talk Money</h2>
            <button onClick={onClose} className={styles.closeButton}>
              <FaTimes />
            </button>
          </div>

          <nav className={styles.nav}>
            {menuItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                  >
                    <Icon className={styles.navIcon} />
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>
      </aside>
    </>
  );
}
