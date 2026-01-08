"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
import { useAuthHandler } from "../hooks/useAuthHandler";
import styles from "../login.module.css";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  // استخدام الدالة الجاهزة لإدارة المصادقة
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    loading,
    error: authError,
  } = useAuthHandler();

  // التحقق من حالة تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;
    let redirectTimeout = null;

    const checkAuth = async () => {
      if (typeof window === "undefined") {
        setInitialLoading(false);
        return;
      }

      // التحقق من حالة المصادقة دائماً (مهم لـ Google Redirect)
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!mounted) return;
        
        if (user) {
          // إعطاء وقت لـ getRedirectResult في useAuthHandler للعمل أولاً
          // هذا مهم جداً لـ iOS و PWA
          redirectTimeout = setTimeout(async () => {
            if (!mounted) return;
            
            try {
              // التحقق من وجود المستخدم في Firestore قبل التوجيه
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                // المستخدم موجود في Firestore - التوجه إلى الصفحة الرئيسية
                router.push("/home");
              } else {
                // المستخدم غير موجود في Firestore - تسجيل الخروج
                await signOut(auth);
                if (typeof window !== "undefined") {
                  localStorage.removeItem("userName");
                }
                setInitialLoading(false);
              }
            } catch (error) {
              console.error("Error checking user:", error);
              setInitialLoading(false);
            }
          }, 500); // تأخير 500ms للسماح لـ getRedirectResult بالعمل
        } else {
          setInitialLoading(false);
        }
      });

      // إعادة تعيين initialLoading بعد فترة قصيرة كـ fallback
      setTimeout(() => {
        if (mounted) {
          setInitialLoading(false);
        }
      }, 2000);
    };

    checkAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [router]);

  // عرض رسائل الخطأ من useAuthHandler
  useEffect(() => {
    if (authError) {
      showError(authError);
    }
  }, [authError, showError]);

  // دالة لتسجيل الدخول بالبريد الإلكتروني
  const handleSubmit = async (e) => {
    e.preventDefault();

    // التحقق من صحة المدخلات
    if (!email || !password) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("البريد الإلكتروني غير صحيح");
      return;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (!isLogin && !name.trim()) {
      showError("يرجى إدخال الاسم");
      return;
    }

    try {
      if (isLogin) {
        // تسجيل الدخول
        await signInWithEmail(email, password, false);
        showSuccess("تم تسجيل الدخول بنجاح");
      } else {
        // إنشاء حساب جديد
        await signUpWithEmail(email, password, name, false);
        showSuccess("تم إنشاء الحساب بنجاح");
      }
    } catch (err) {
      // الأخطاء يتم التعامل معها في useAuthHandler
      // فقط نعرض رسالة الخطأ إذا لم تكن معالجة بالفعل
      if (!authError) {
        showError(err.message || "حدث خطأ غير متوقع");
      }
    }
  };

  // دالة لتسجيل الدخول باستخدام Google
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(false);
      // رسالة النجاح تظهر تلقائياً من useAuthHandler
    } catch (err) {
      // لا نعرض رسالة خطأ إذا أغلق المستخدم النافذة (إجراء طبيعي)
      if (err.message && !err.message.includes("popup-closed")) {
        showError(err.message || "حدث خطأ أثناء تسجيل الدخول بـ Google");
      }
    }
  };

  // عرض loading أثناء التحقق الأولي
  if (initialLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.initialLoading}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <button
        onClick={toggleTheme}
        className={styles.themeToggle}
        title={
          theme === "light"
            ? "التبديل إلى الوضع الداكن"
            : "التبديل إلى الوضع الفاتح"
        }
        aria-label="تبديل الوضع"
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div className={styles.loginCard}>
        <h1 className={styles.title}>
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
                required={!isLogin}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>كلمة المرور</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`${styles.input} ${styles.passwordInput}`}
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setShowPassword(!showPassword);
                  }
                }}
              >
                {showPassword ? <FaRegEyeSlash/> : <FaRegEye/>}
              </span>
            </div>
          </div>

          {isLogin && (
            <div className={styles.rememberForgot}>
              <button
                type="button"
                onClick={() => {/* TODO: Implement forgot password */}}
                className={styles.forgotPassword}
              >
                نسيت كلمة المرور؟
              </button>
            </div>  
          )}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading
              ? "جاري المعالجة..."
              : isLogin
              ? "تسجيل الدخول"
              : "إنشاء حساب"}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>أو</span>
        </div>

        <div className={styles.socialButtons}>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`${styles.socialButton} ${styles.google}`}
            title="تسجيل الدخول باستخدام Google"
          >
            G
          </button>
          <button
            disabled
            className={`${styles.socialButton} ${styles.facebook}`}
            title="قريباً"
          >
            f
          </button>
          <button
            disabled
            className={`${styles.socialButton} ${styles.twitter}`}
            title="قريباً"
          >
            🐦
          </button>
        </div>

        <div className={styles.switchLink}>
          {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setEmail("");
              setPassword("");
              setName("");
              setShowPassword(false);
            }}
            className={styles.switchButton}
          >
            {isLogin ? "سجل الآن" : "تسجيل الدخول"}
          </button>
        </div>
      </div>
    </main>
  );
}
