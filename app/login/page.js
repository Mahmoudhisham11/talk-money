"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db
} from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
import styles from "../login.module.css";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotifications();

  const provider = new GoogleAuthProvider();

  // ======== التحقق من وجود المستخدم في Firestore ========
  const ensureUserDoc = async (user, displayNameFallback) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || displayNameFallback || user.email,
          role: "user",
          createdAt: serverTimestamp(),
          uid: user.uid,
        });
      }
    } catch (err) {
      console.error("Error ensuring user document:", err);
      throw err;
    }
  };

  // ======== التحقق من حالة المصادقة عند تحميل الصفحة ========
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1️⃣ تحقق من Google Redirect
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          await ensureUserDoc(user, name);
          localStorage.setItem("userName", user.displayName || user.email);
          if (!mounted) return;
          router.push("/home");
          return;
        }

        // 2️⃣ تحقق من حالة المصادقة العادية
        onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          if (user) {
            await ensureUserDoc(user, name);
            localStorage.setItem("userName", user.displayName || user.email);
            router.push("/home");
          } else {
            setInitialLoading(false);
          }
        });

      } catch (err) {
        console.error("Auth init error:", err);
        setInitialLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [router, name]);

  // ======== تسجيل الدخول أو إنشاء حساب بالبريد ========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password || (!isLogin && !name.trim())) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("البريد الإلكتروني غير صحيح");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDoc(user, name);
        localStorage.setItem("userName", user.displayName || user.email);
        showSuccess("تم تسجيل الدخول بنجاح");
        router.push("/home");
      } else {
        await signOut(auth); // تسجيل خروج من أي حساب موجود
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(user, { displayName: name });
        await ensureUserDoc(user, name);
        localStorage.setItem("userName", name || user.email);
        showSuccess("تم إنشاء الحساب بنجاح");
        router.push("/home");
      }
    } catch (err) {
      console.error("Email auth error:", err);
      if (err.code === "auth/user-not-found") showError("المستخدم غير موجود");
      else if (err.code === "auth/wrong-password") showError("كلمة المرور غير صحيحة");
      else if (err.code === "auth/email-already-in-use") showError("البريد مستخدم بالفعل");
      else showError(err.message || "حدث خطأ. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ======== تسجيل الدخول باستخدام Google ========
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        window.matchMedia("(display-mode: standalone)").matches
      ) {
        // iOS / PWA → Redirect
        await signInWithRedirect(auth, provider);
      } else {
        // باقي الأجهزة → Popup
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await ensureUserDoc(user, name);
        localStorage.setItem("userName", user.displayName || user.email);
        router.push("/home");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        showError(err.message || "فشل تسجيل الدخول باستخدام Google");
      }
    } finally {
      setLoading(false);
    }
  };

  // ======== عرض شاشة التحميل ========
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

  // ======== واجهة تسجيل الدخول ========
  return (
    <main className={styles.container}>
      <button
        onClick={toggleTheme}
        className={styles.themeToggle}
        title={theme === "light" ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح"}
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
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </span>
            </div>
          </div>

          {isLogin && (
            <div className={styles.rememberForgot}>
              <button
                type="button"
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
            {loading ? "جاري المعالجة..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
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
          <button disabled className={`${styles.socialButton} ${styles.facebook}`} title="قريباً">f</button>
          <button disabled className={`${styles.socialButton} ${styles.twitter}`} title="قريباً">🐦</button>
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
