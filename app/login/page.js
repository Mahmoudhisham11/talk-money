"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotifications();

  // دالة مشتركة للتحقق من وجود المستخدم في Firestore
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

  // التحقق من حالة تسجيل الدخول عند تحميل الصفحة فقط
  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;

    const checkAuth = async () => {
      if (typeof window === "undefined") {
        setInitialLoading(false);
        return;
      }

      // التحقق السريع من localStorage أولاً
      const savedRememberMe = localStorage.getItem("rememberMe");
      const savedUser = localStorage.getItem("userName");

      if (savedRememberMe === "true" && savedUser) {
        // التحقق من حالة المصادقة
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          
          if (user && !isProcessing) {
            // التحقق من وجود المستخدم في Firestore قبل إعادة التوجيه
            try {
              const userExists = await checkUserExists(user.uid);
              if (userExists) {
                // المستخدم موجود في Firestore - التوجه إلى الصفحة الرئيسية
                router.push("/home");
              } else {
                // المستخدم غير موجود في Firestore - تسجيل الخروج
                await signOut(auth);
                if (typeof window !== "undefined") {
                  localStorage.removeItem("userName");
                  localStorage.removeItem("rememberMe");
                }
                setInitialLoading(false);
              }
            } catch (error) {
              console.error("Error checking user:", error);
              setInitialLoading(false);
            }
          } else {
            setInitialLoading(false);
          }
        });
      } else {
        setInitialLoading(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router, isProcessing]);

  // إنشاء مستند المستخدم في Firestore
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsProcessing(true);

    if (!email || !password) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      setLoading(false);
      setIsProcessing(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("البريد الإلكتروني غير صحيح");
      setLoading(false);
      setIsProcessing(false);
      return;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setLoading(false);
      setIsProcessing(false);
      return;
    }

    if (!isLogin && !name.trim()) {
      showError("يرجى إدخال الاسم");
      setLoading(false);
      setIsProcessing(false);
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

        // التحقق من وجود المستخدم في Firestore
        const userExists = await checkUserExists(user.uid);
        
        if (!userExists) {
          // المستخدم غير موجود في Firestore - تسجيل الخروج
          await signOut(auth);
          showError("الحساب غير مسجل لدينا");
          setIsProcessing(false);
          setLoading(false);
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("userName", user.displayName || user.email);

          if (rememberMe) {
            localStorage.setItem("rememberMe", "true");
          } else {
            localStorage.removeItem("rememberMe");
          }
        }

        showSuccess("تم تسجيل الدخول بنجاح");
        // الانتقال مباشرة بعد التحقق
        router.push("/home");
      } else {
        // تسجيل الخروج من أي حساب موجود قبل إنشاء حساب جديد
        try {
          await signOut(auth);
        } catch (signOutError) {
          // تجاهل خطأ تسجيل الخروج إذا لم يكن هناك مستخدم مسجل دخول
        }

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

        // التحقق من إنشاء المستند بنجاح
        const userExists = await checkUserExists(user.uid);
        if (!userExists) {
          await signOut(auth);
          showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
          setIsProcessing(false);
          setLoading(false);
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("userName", name || user.email);

          if (rememberMe) {
            localStorage.setItem("rememberMe", "true");
          } else {
            localStorage.removeItem("rememberMe");
          }
        }

        showSuccess("تم إنشاء الحساب بنجاح");
        // الانتقال مباشرة بعد التحقق
        router.push("/home");
      }
    } catch (err) {
      setIsProcessing(false);
      
      // معالجة الأخطاء مع طباعة في Console فقط للأخطاء غير المتوقعة
      if (err.code === "auth/email-already-in-use") {
        showError("البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد");
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
        // طباعة الأخطاء غير المتوقعة فقط في Console
        console.error("Unexpected authentication error:", err);
        showError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setIsProcessing(true);

    try {
      // تسجيل الخروج أولاً لإجبار اختيار الحساب
      try {
        await signOut(auth);
      } catch (signOutError) {
        // تجاهل خطأ تسجيل الخروج إذا لم يكن هناك مستخدم مسجل دخول
      }

      // إعداد Google Auth Provider مع إجبار اختيار الحساب
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // التحقق من وجود المستخدم في Firestore أولاً
      const userExists = await checkUserExists(user.uid);
      
      if (!userExists) {
        // المستخدم غير موجود - إنشاء مستند جديد
        await createUserDocument(user, "user");
        
        // التحقق مرة أخرى من إنشاء المستند
        const verified = await checkUserExists(user.uid);
        if (!verified) {
          await signOut(auth);
          showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
          setIsProcessing(false);
          setLoading(false);
          return;
        }
      }

      // التحقق النهائي قبل السماح بالدخول
      const finalCheck = await checkUserExists(user.uid);
      if (!finalCheck) {
        await signOut(auth);
        showError("الحساب غير مسجل لدينا");
        setIsProcessing(false);
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("userName", user.displayName || user.email);

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        }
      }

      showSuccess("تم تسجيل الدخول بنجاح");
      // الانتقال مباشرة بعد التحقق
      router.push("/home");
    } catch (err) {
      setIsProcessing(false);
      
      // معالجة الأخطاء بدون طباعة في Console للأخطاء الطبيعية
      if (err.code === "auth/popup-closed-by-user") {
        // هذا خطأ طبيعي عندما يغلق المستخدم النافذة - لا نطبع في Console
        // لا نعرض رسالة خطأ للمستخدم لأنه إجراء طبيعي
      } else if (err.code === "auth/operation-not-allowed") {
        console.error("Google sign-in error:", err);
        showError("تسجيل الدخول بـ Google غير مفعّل في Firebase Console");
      } else if (err.code === "auth/unauthorized-domain") {
        console.error("Google sign-in error:", err);
        showError(
          "النطاق الحالي غير مصرح به. يرجى إضافة النطاق في Firebase Console:\n" +
          "Authentication > Settings > Authorized domains > Add domain\n" +
          "أضف: localhost"
        );
      } else {
        // طباعة الأخطاء الأخرى في Console للمساعدة في التطوير
        console.error("Google sign-in error:", err);
        showError("حدث خطأ أثناء تسجيل الدخول بـ Google. يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
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
              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxLabel}>تذكرني</span>
              </label>
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

