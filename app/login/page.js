"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
} from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import styles from "../login.module.css";

export default function LoginPage() {
  // ========== State Management ==========
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state for form submission

  // ========== Hooks ==========
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();


  const checkUserExists = useCallback(async (uid, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        return userDoc.exists();
      } catch (error) {
        if (attempt === retries - 1) {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
    return false;
  }, []);


  const saveUserToFirestore = useCallback(async (user, displayNameFallback = null, isNewUser = false) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const displayName = user.displayName || displayNameFallback || user.email || "";
      
      // التحقق من وجود المستخدم أولاً
      const userDoc = await getDoc(userDocRef);
      const userExists = userDoc.exists();
      
      // إعداد البيانات
      const userData = {
        uid: user.uid,
        name: displayName,
        email: user.email,
        photoURL: user.photoURL || null,
        updatedAt: serverTimestamp(),
      };
      
      // إذا كان مستخدم جديد، أضف role و createdAt
      if (isNewUser || !userExists) {
        userData.role = "user"; // القيمة الافتراضية
        userData.createdAt = serverTimestamp();
      }
      // إذا كان المستخدم موجوداً، احتفظ بالـ role الموجود
      else if (userDoc.exists() && userDoc.data().role) {
        userData.role = userDoc.data().role;
      } else {
        // إذا لم يكن هناك role، أضفه
        userData.role = "user";
      }
      
      await setDoc(userDocRef, userData, { merge: true });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const verifyDoc = await getDoc(userDocRef);
      if (!verifyDoc.exists()) {
        throw new Error("Document was not created after setDoc");
      }
    } catch (err) {
      throw err;
    }
  }, []);

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/home");
    }
  }, [user, authLoading, router]);


  const validateInputs = useCallback(() => {
    if (!email || !password) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      return false;
    }

    if (!isLogin && !name.trim()) {
      showError("يرجى إدخال الاسم");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("البريد الإلكتروني غير صحيح");
      return false;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }

    return true;
  }, [email, password, name, isLogin, showError]);


  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // ========== LOGIN ==========
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if user exists in Firestore
        const userExists = await checkUserExists(user.uid);
        
        if (!userExists) {
          // User not in Firestore - sign out
          await signOut(auth);
          showError("الحساب غير مسجل لدينا");
          setLoading(false);
          return;
        }

        // Save user info to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("userName", user.displayName || user.email || "");
          if (user.photoURL) {
            localStorage.setItem("userPhoto", user.photoURL);
          }
        }
        
        showSuccess("تم تسجيل الدخول بنجاح");
        router.push("/home");
      } else {
        // ========== SIGNUP ==========
        await signOut(auth); // Sign out from any existing account
        
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        if (name && name.trim()) {
          try {
            await updateProfile(user, { displayName: name });
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (profileError) {
            // Silently fail - profile update is not critical
          }
        }
        
        // Save user to Firestore
        try {
          await saveUserToFirestore(user, name, true); // isNewUser = true (حساب جديد)
          
          // Verify document creation
          let verified = await checkUserExists(user.uid);
          let retries = 3;
          
          while (!verified && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 150));
            verified = await checkUserExists(user.uid);
            retries--;
          }
          
          if (!verified) {
            // Final retry
            await saveUserToFirestore(user, name, true); // isNewUser = true
            await new Promise(resolve => setTimeout(resolve, 200));
            verified = await checkUserExists(user.uid);
            
            if (!verified) {
              throw new Error("Failed to create user document");
            }
          }
        } catch (docError) {
          await signOut(auth);
          showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
          setLoading(false);
          return;
        }
        
        // Save user info to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("userName", name || user.email || "");
          if (user.photoURL) {
            localStorage.setItem("userPhoto", user.photoURL);
          }
        }
        
        showSuccess("تم إنشاء الحساب بنجاح");
        router.push("/home");
      }
    } catch (err) {
      let errorMessage = "حدث خطأ. حاول مرة أخرى";
      
      if (err.code === "auth/invalid-credential") {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "المستخدم غير موجود. يرجى التحقق من البريد الإلكتروني";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "كلمة المرور غير صحيحة";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صحيح. يرجى التحقق من صحة البريد الإلكتروني";
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "مشكلة في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً والمحاولة لاحقاً";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "تم تعطيل هذا الحساب. يرجى الاتصال بالدعم";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "طريقة تسجيل الدخول هذه غير مفعّلة. يرجى الاتصال بالدعم";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, name, validateInputs, checkUserExists, saveUserToFirestore, router, showSuccess, showError]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.initialLoading}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  // ========== Render Login Form ==========
  
  return (
    <main className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name field (only for signup) */}
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

          {/* Email field */}
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

          {/* Password field */}
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

          {/* Forgot password link (only for login) */}
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || authLoading}
            className={styles.submitButton}
          >
            {loading ? "جاري المعالجة..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerText}>أو</span>
        </div>

        {/* Google Sign-In Button */}
        <div className={styles.socialButtons}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!loading && !authLoading) {
                signInWithGoogle();
              }
            }}
            disabled={loading || authLoading}
            className={styles.googleButton}
            title="تسجيل الدخول باستخدام Google"
            aria-label="تسجيل الدخول باستخدام Google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>تسجيل الدخول باستخدام Google</span>
          </button>
        </div>

        {/* Switch between login and signup */}
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
