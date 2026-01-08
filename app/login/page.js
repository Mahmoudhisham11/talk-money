"use client";

import { useEffect, useState, useMemo } from "react";
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

  // إنشاء GoogleAuthProvider مرة واحدة فقط باستخدام useMemo
  const provider = useMemo(() => {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account", // إجبار Google على إظهار شاشة اختيار الحساب
    });
    return googleProvider;
  }, []);

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

  // ======== إنشاء أو تحديث مستند المستخدم في Firestore ========
  const ensureUserDoc = async (user, displayNameFallback) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      
      // استخدام setDoc مباشرة مع merge: true لضمان الإنشاء
      await setDoc(
        userDocRef,
        {
          email: user.email,
          displayName: user.displayName || displayNameFallback || user.email,
          role: "user",
          createdAt: serverTimestamp(),
          uid: user.uid,
        },
        { merge: true }
      );
      
      // التحقق من إنشاء المستند
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("فشل إنشاء مستند المستخدم في Firestore");
      }
    } catch (err) {
      console.error("Error ensuring user document:", err);
      throw err;
    }
  };

  // ======== الكشف عن نوع الجهاز ========
  const detectDeviceType = () => {
    if (typeof window === "undefined") {
      return { shouldUseRedirect: false };
    }

    const userAgent = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;

    // استخدام Redirect في Safari و iOS و Android Mobile و PWA
    const shouldUseRedirect = isSafari || isIOS || (isAndroid && isMobile) || isPWA;

    return { shouldUseRedirect };
  };

  // ======== التحقق من حالة المصادقة عند تحميل الصفحة ========
  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;
    let redirectHandled = false;
  
    const initAuth = async () => {
      try {
        // 1️⃣ محاولة الحصول على نتيجة Google Redirect أولاً
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          redirectHandled = true; // تأكيد أنه تم التعامل مع Redirect
          const user = result.user;
  
          try {
            // التحقق من وجود مستند المستخدم في Firestore
            const userExists = await checkUserExists(user.uid);
            if (!userExists) {
              await ensureUserDoc(user, null);
  
              // retry للتأكد من الإنشاء
              let verified = false;
              let retries = 5;
              while (!verified && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
                verified = await checkUserExists(user.uid);
                retries--;
              }
  
              if (!verified) {
                await ensureUserDoc(user, null);
                await new Promise(resolve => setTimeout(resolve, 500));
                verified = await checkUserExists(user.uid);
                if (!verified) {
                  await signOut(auth);
                  if (typeof window !== "undefined") localStorage.removeItem("userName");
                  showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
                  if (mounted) setInitialLoading(false);
                  return;
                }
              }
            } else {
              // تحديث بيانات المستخدم
              await ensureUserDoc(user, null);
            }
  
            // حفظ بيانات المستخدم
            if (typeof window !== "undefined") {
              localStorage.setItem("userName", user.displayName || user.email || "");
            }
  
            if (!mounted) return;
            showSuccess("تم تسجيل الدخول بنجاح");
            router.push("/home");
            return;
          } catch (err) {
            console.error("Error handling redirected user:", err);
            await signOut(auth);
            if (typeof window !== "undefined") localStorage.removeItem("userName");
            showError("حدث خطأ أثناء معالجة الحساب. يرجى المحاولة مرة أخرى");
            if (mounted) setInitialLoading(false);
            return;
          }
        }
  
        // 2️⃣ التعامل مع onAuthStateChanged فقط إذا لم يتم التعامل مع Redirect
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted || redirectHandled) return; // منع التداخل مع Redirect
          if (user) {
            try {
              const userExists = await checkUserExists(user.uid);
              if (!userExists) {
                await ensureUserDoc(user, null);
              } else {
                await ensureUserDoc(user, null);
              }
  
              if (typeof window !== "undefined") {
                localStorage.setItem("userName", user.displayName || user.email || "");
              }
  
              router.push("/home");
            } catch (err) {
              console.error("Error in onAuthStateChanged:", err);
              await signOut(auth);
              if (typeof window !== "undefined") localStorage.removeItem("userName");
              setInitialLoading(false);
            }
          } else {
            setInitialLoading(false);
          }
        });
  
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setInitialLoading(false);
      }
    };
  
    initAuth();
  
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [router, showSuccess, showError]);
  

  // ======== تسجيل الدخول أو إنشاء حساب بالبريد ========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // التحقق من صحة المدخلات
    if (!email || !password) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      setLoading(false);
      return;
    }

    if (!isLogin && !name.trim()) {
      showError("يرجى إدخال الاسم");
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
        // تسجيل الدخول
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        
        // التحقق من وجود المستخدم في Firestore
        const userExists = await checkUserExists(user.uid);
        
        if (!userExists) {
          // المستخدم غير موجود في Firestore - تسجيل الخروج
          await signOut(auth);
          showError("الحساب غير مسجل لدينا");
          setLoading(false);
          return;
        }

        // التأكد من تحديث البيانات
        await ensureUserDoc(user, null);
        localStorage.setItem("userName", user.displayName || user.email || "");
        showSuccess("تم تسجيل الدخول بنجاح");
        router.push("/home");
      } else {
        // إنشاء حساب جديد
        await signOut(auth); // تسجيل خروج من أي حساب موجود
        
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        // تحديث اسم المستخدم أولاً
        if (name && name.trim()) {
          try {
            await updateProfile(user, { displayName: name });
            // انتظار قليلاً للتأكد من تحديث displayName في Firebase Auth
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (profileError) {
            console.error("Error updating profile:", profileError);
            // نستمر حتى لو فشل تحديث الاسم
          }
        }
        
        // إنشاء مستند المستخدم في Firestore
        try {
          // استخدام name مباشرة لأن updateProfile قد لا يكون محدثاً بعد
          await ensureUserDoc(user, name);
          
          // التحقق من إنشاء المستند مع retry mechanism
          let verified = false;
          let retries = 5;
          
          while (!verified && retries > 0) {
            // انتظار قليلاً قبل التحقق
            await new Promise(resolve => setTimeout(resolve, 200));
            verified = await checkUserExists(user.uid);
            retries--;
          }
          
          if (!verified) {
            // محاولة إنشاء المستند مرة أخرى
            console.log("Retrying user document creation...");
            await ensureUserDoc(user, name);
            
            // انتظار أطول قبل التحقق مرة أخرى
            await new Promise(resolve => setTimeout(resolve, 500));
            verified = await checkUserExists(user.uid);
            
            if (!verified) {
              console.error("Failed to create user document after retry");
              await signOut(auth);
              showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
              setLoading(false);
              return;
            }
          }
        } catch (docError) {
          console.error("Error creating user document:", docError);
          await signOut(auth);
          showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
          setLoading(false);
          return;
        }
        
        // حفظ بيانات المستخدم
        localStorage.setItem("userName", name || user.email || "");
        showSuccess("تم إنشاء الحساب بنجاح");
        router.push("/home");
      }
    } catch (err) {
      console.error("Email auth error:", err);
      
      // معالجة الأخطاء بشكل شامل
      if (err.code === "auth/user-not-found") {
        showError("المستخدم غير موجود");
      } else if (err.code === "auth/wrong-password") {
        showError("كلمة المرور غير صحيحة");
      } else if (err.code === "auth/email-already-in-use") {
        showError("البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد");
      } else if (err.code === "auth/invalid-email") {
        showError("البريد الإلكتروني غير صحيح");
      } else if (err.code === "auth/weak-password") {
        showError("كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)");
      } else if (err.code === "auth/network-request-failed") {
        showError("مشكلة في الاتصال بالشبكة. يرجى المحاولة مرة أخرى");
      } else if (err.code === "auth/too-many-requests") {
        showError("تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة لاحقاً");
      } else {
        showError(err.message || "حدث خطأ. حاول مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  // ======== تسجيل الدخول باستخدام Google ========
  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // تسجيل الخروج أولاً لإجبار اختيار الحساب
      try {
        await signOut(auth);
      } catch (signOutError) {
        // تجاهل خطأ تسجيل الخروج إذا لم يكن هناك مستخدم مسجل دخول
      }

      // الكشف عن نوع الجهاز
      const deviceInfo = detectDeviceType();

      if (deviceInfo.shouldUseRedirect) {
        // iOS / PWA / Safari / Android Mobile → Redirect
        await signInWithRedirect(auth, provider);
        // لا نضع setLoading(false) هنا لأن الصفحة سيتم إعادة تحميلها
        // getRedirectResult سيتعامل مع النتيجة في useEffect
      } else {
        // باقي الأجهزة → Popup
        try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          
          // التحقق من وجود المستخدم في Firestore
          const userExists = await checkUserExists(user.uid);
          
          if (!userExists) {
            // إنشاء مستند المستخدم
            await ensureUserDoc(user, null);
            
            // التحقق مرة أخرى
            const verified = await checkUserExists(user.uid);
            if (!verified) {
              await signOut(auth);
              showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
              setLoading(false);
              return;
            }
          } else {
            // التأكد من تحديث البيانات
            await ensureUserDoc(user, null);
          }
          
          localStorage.setItem("userName", user.displayName || user.email || "");
          showSuccess("تم تسجيل الدخول بنجاح");
          router.push("/home");
        } catch (popupError) {
          // إذا فشل Popup، استخدم Redirect كبديل
          if (
            popupError.code === "auth/popup-blocked" ||
            popupError.code === "auth/popup-closed-by-user"
          ) {
            setLoading(false);
            await signInWithRedirect(auth, provider);
            return;
          } else {
            throw popupError;
          }
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      
      // معالجة الأخطاء
      if (err.code === "auth/operation-not-allowed") {
        showError("تسجيل الدخول بـ Google غير مفعّل في Firebase Console");
      } else if (err.code === "auth/unauthorized-domain") {
        showError("النطاق الحالي غير مصرح به. يرجى إضافة النطاق في Firebase Console");
      } else if (err.code !== "auth/popup-closed-by-user") {
        showError(err.message || "فشل تسجيل الدخول باستخدام Google");
      }
      
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
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
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
            aria-label="تسجيل الدخول باستخدام Google"
          >
            G
          </button>
          <button 
            disabled 
            className={`${styles.socialButton} ${styles.facebook}`} 
            title="قريباً"
            aria-label="تسجيل الدخول باستخدام Facebook (قريباً)"
          >
            f
          </button>
          <button 
            disabled 
            className={`${styles.socialButton} ${styles.twitter}`} 
            title="قريباً"
            aria-label="تسجيل الدخول باستخدام Twitter (قريباً)"
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
            aria-label={isLogin ? "الانتقال إلى إنشاء حساب" : "الانتقال إلى تسجيل الدخول"}
          >
            {isLogin ? "سجل الآن" : "تسجيل الدخول"}
          </button>
        </div>
      </div>
    </main>
  );
}
