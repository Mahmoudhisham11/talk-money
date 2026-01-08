"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotifications();

  const provider = new GoogleAuthProvider();

  // ======== التحقق من وجود المستخدم في Firestore ========
  const checkUserExists = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists();
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
  };

  // ======== إنشاء مستند المستخدم في Firestore ========
  const createUserDocument = async (user, userRole = "user") => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || name || user.email,
        role: userRole,
        createdAt: serverTimestamp(),
        uid: user.uid,
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  // ======== التحقق من حالة تسجيل الدخول عند تحميل الصفحة ========
  useEffect(() => {
    const handleAuthState = async (user) => {
      if (user) {
        const userExists = await checkUserExists(user.uid);
        if (userExists) {
          localStorage.setItem("userName", user.displayName || user.email);
          router.push("/home");
        } else {
          await signOut(auth);
        }
      }
      setInitialLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthState);

    // ======== التعامل مع Redirect بعد Google Sign-In ========
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const user = result.user;
          const exists = await checkUserExists(user.uid);
          if (!exists) {
            await createUserDocument(user, "user");
          }
          localStorage.setItem("userName", user.displayName || user.email);
          router.push("/home");
        }
      })
      .catch((err) => {
        console.error("Google Redirect Error:", err);
        setInitialLoading(false);
      });

    return () => unsubscribe();
  }, [router]);

  // ======== تسجيل الدخول / إنشاء حساب بالإيميل ========
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

    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const exists = await checkUserExists(user.uid);
        if (!exists) {
          await signOut(auth);
          showError("الحساب غير موجود في النظام");
          setLoading(false);
          return;
        }
        localStorage.setItem("userName", user.displayName || user.email);
        if (rememberMe) localStorage.setItem("rememberMe", "true");
        showSuccess("تم تسجيل الدخول بنجاح");
        router.push("/home");
      } else {
        try {
          await signOut(auth);
        } catch {}
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (name) await updateProfile(user, { displayName: name });
        await createUserDocument(user, "user");
        localStorage.setItem("userName", name || user.email);
        if (rememberMe) localStorage.setItem("rememberMe", "true");
        showSuccess("تم إنشاء الحساب بنجاح");
        router.push("/home");
      }
    } catch (err) {
      console.error(err);
      showError(err.message || "حدث خطأ. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ======== تسجيل الدخول باستخدام Google ========
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // لو iOS أو PWA استخدم Redirect، وإلا Popup
      if (
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        window.matchMedia("(display-mode: standalone)").matches
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const exists = await checkUserExists(user.uid);
        if (!exists) await createUserDocument(user, "user");
        localStorage.setItem("userName", user.displayName || user.email);
        router.push("/home");
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      showError("فشل تسجيل الدخول باستخدام Google");
    } finally {
      setLoading(false);
    }
  };

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
                required
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

          <div className={styles.rememberForgot}>
            {isLogin && (
              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxLabel}>تذكرني</span>
              </label>
            )}
          </div>

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
          >
            G
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
