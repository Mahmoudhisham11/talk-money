"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useTheme } from "./context/ThemeContext";
import { useNotifications } from "./context/NotificationContext";
import styles from "./login.module.css";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe");
    const savedUser = localStorage.getItem("userName");

    if (savedRememberMe === "true" && savedUser) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          router.push("/home");
        }
      });
      return () => unsubscribe();
    }
  }, [router]);

  // إنشاء أو تحديث بيانات المستخدم في Firestore
  const createUserDocument = async (user, userRole = "user") => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // إنشاء مستند جديد للمستخدم
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || name || user.email,
          role: userRole,
          createdAt: new Date().toISOString(),
          uid: user.uid,
        });
      } else {
        // تحديث البيانات إذا كان المستخدم موجوداً
        await setDoc(
          userDocRef,
          {
            email: user.email,
            displayName: user.displayName || userDoc.data().displayName,
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
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

    if (!isLogin && !name.trim()) {
      showError("يرجى إدخال الاسم");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        localStorage.setItem("userName", user.displayName || user.email);

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }

        showSuccess("تم تسجيل الدخول بنجاح");
        setTimeout(() => {
          router.push("/home");
        }, 500);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        if (name) {
          await updateProfile(user, { displayName: name });
        }

        // إنشاء مستند المستخدم في Firestore مع role = "user"
        await createUserDocument(user, "user");

        localStorage.setItem("userName", name || user.email);

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }

        showSuccess("تم إنشاء الحساب بنجاح");
        setTimeout(() => {
          router.push("/home");
        }, 500);
      }
    } catch (err) {
      console.error("Error:", err);
      if (err.code === "auth/email-already-in-use") {
        showError("البريد الإلكتروني مستخدم بالفعل");
      } else if (err.code === "auth/invalid-email") {
        showError("البريد الإلكتروني غير صحيح");
      } else if (err.code === "auth/weak-password") {
        showError("كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)");
      } else if (err.code === "auth/user-not-found") {
        showError("المستخدم غير موجود");
      } else if (err.code === "auth/wrong-password") {
        showError("كلمة المرور غير صحيحة");
      } else if (err.code === "auth/network-request-failed") {
        showError("مشكلة في الاتصال بالشبكة. يرجى المحاولة مرة أخرى");
      } else if (err.code === "auth/operation-not-allowed") {
        showError(
          "طريقة تسجيل الدخول غير مفعّلة. يرجى تفعيل Email/Password في Firebase Console"
        );
      } else {
        showError(`حدث خطأ: ${err.message || "حاول مرة أخرى"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // إنشاء أو تحديث مستند المستخدم
      await createUserDocument(user, "user");

      localStorage.setItem("userName", user.displayName || user.email);

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      showSuccess("تم تسجيل الدخول بنجاح");
      setTimeout(() => {
        router.push("/home");
      }, 500);
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        showError("تم إغلاق نافذة تسجيل الدخول");
      } else if (err.code === "auth/operation-not-allowed") {
        showError("تسجيل الدخول بـ Google غير مفعّل في Firebase Console");
      } else if (err.code === "auth/unauthorized-domain") {
        showError(
          "النطاق الحالي غير مصرح به. يرجى إضافة النطاق في Firebase Console:\n" +
          "Authentication > Settings > Authorized domains > Add domain\n" +
          "أضف: localhost"
        );
      } else {
        showError(`حدث خطأ أثناء تسجيل الدخول بـ Google: ${err.message || err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

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
              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxLabel}>تذكرني</span>
              </label>
              <a href="#" className={styles.forgotPassword}>
                نسيت كلمة المرور؟
              </a>
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
