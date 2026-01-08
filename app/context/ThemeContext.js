"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState("system");
  const [mounted, setMounted] = useState(false);
  const [systemTheme, setSystemTheme] = useState("light");

  // حساب الثيم الفعلي بناءً على themeMode و systemTheme
  const resolvedTheme = useMemo(() => {
    if (themeMode === "system") {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  // اكتشاف وضع النظام عند التحميل
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // اكتشاف الوضع الحالي للجهاز
    const getSystemTheme = () => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    setSystemTheme(getSystemTheme());

    // قراءة themeMode من localStorage
    const savedThemeMode = localStorage.getItem("themeMode");
    if (savedThemeMode === "light" || savedThemeMode === "dark" || savedThemeMode === "system") {
      setThemeMode(savedThemeMode);
    }

    setMounted(true);

    // الاستماع لتغييرات وضع النظام
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleSystemThemeChange = (e) => {
        setSystemTheme(e.matches ? "dark" : "light");
      };

      // استخدام addListener للتوافق مع المتصفحات القديمة
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else {
        // Fallback للمتصفحات القديمة
        mediaQuery.addListener(handleSystemThemeChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleSystemThemeChange);
        } else {
          mediaQuery.removeListener(handleSystemThemeChange);
        }
      };
    }
  }, []);

  // تطبيق الثيم على document بعد mounted
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", resolvedTheme);
    }
  }, [resolvedTheme, mounted]);

  // حفظ themeMode في localStorage عند تغييره
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("themeMode", themeMode);
    }
  }, [themeMode, mounted]);

  // دالة لتحديث themeMode
  const setThemeModeValue = (mode) => {
    if (mode === "light" || mode === "dark" || mode === "system") {
      setThemeMode(mode);
    }
  };

  // دالة toggleTheme للتوافق مع الكود القديم (تتحول بين light و dark)
  const toggleTheme = () => {
    if (themeMode === "system") {
      // إذا كان system، نتحول إلى dark
      setThemeMode("dark");
    } else if (themeMode === "light") {
      setThemeMode("dark");
    } else {
      setThemeMode("light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme, // للتوافق مع الكود القديم
        themeMode,
        resolvedTheme,
        setThemeMode: setThemeModeValue,
        toggleTheme,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
