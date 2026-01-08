"use client";

/**
 * دالة React Hook جاهزة لإدارة تسجيل الدخول وإنشاء حساب باستخدام Firebase Authentication
 * 
 * المميزات:
 * - دعم تسجيل الدخول بالبريد الإلكتروني + كلمة المرور (login + signup)
 * - دعم Google Sign-In مع الكشف التلقائي عن نوع الجهاز
 * - التحقق من وجود المستخدم في Firestore وإنشاء مستند جديد عند الحاجة
 * - دعم خيار "تذكرني" (rememberMe)
 * - معالجة شاملة للأخطاء
 * - متوافق مع React 18+ و Next.js App Router
 * - يعمل على جميع الأجهزة (Web, iOS, Android, PWA, Safari)
 * 
 * @returns {Object} كائن يحتوي على الدوال والحالات
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export function useAuthHandler() {
  const router = useRouter();
  
  // States لإدارة الحالة
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  /**
   * دالة للتحقق من وجود المستخدم في Firestore collection "users"
   * @param {string} uid - معرف المستخدم
   * @returns {Promise<boolean>} true إذا كان المستخدم موجوداً، false إذا لم يكن موجوداً
   */
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

  /**
   * دالة لإنشاء مستند المستخدم في Firestore
   * @param {Object} user - كائن المستخدم من Firebase Auth
   * @param {string} userRole - دور المستخدم (افتراضي: "user")
   * @param {string} displayName - اسم المستخدم (اختياري)
   * @returns {Promise<void>}
   */
  const createUserDocument = async (user, userRole = "user", displayName = null) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || user.email,
        role: userRole,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  /**
   * دالة لمعالجة المستخدم بعد تسجيل الدخول الناجح
   * @param {Object} user - كائن المستخدم من Firebase Auth
   * @param {boolean} rememberMe - هل المستخدم اختار "تذكرني"
   * @returns {Promise<void>}
   */
  const handleSuccessfulAuth = async (user, rememberMe = false) => {
    try {
      // التحقق من وجود المستخدم في Firestore
      const userExists = await checkUserExists(user.uid);

      if (!userExists) {
        // المستخدم جديد - إنشاء مستند جديد
        await createUserDocument(user, "user", user.displayName);
        
        // التحقق مرة أخرى من إنشاء المستند
        const verified = await checkUserExists(user.uid);
        if (!verified) {
          throw new Error("فشل إنشاء مستند المستخدم");
        }
      }

      // حفظ بيانات المستخدم في localStorage
      if (typeof window !== "undefined") {
        const userName = user.displayName || user.email || "";
        localStorage.setItem("userName", userName);
        
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }
      }

      // التوجيه إلى الصفحة الرئيسية
      router.push("/home");
    } catch (error) {
      console.error("Error in handleSuccessfulAuth:", error);
      // تسجيل الخروج في حالة الخطأ
      await firebaseSignOut(auth);
      throw error;
    }
  };

  /**
   * دالة لتسجيل الدخول بالبريد الإلكتروني وكلمة المرور
   * @param {string} email - البريد الإلكتروني
   * @param {string} password - كلمة المرور
   * @param {boolean} rememberMe - هل المستخدم اختار "تذكرني"
   * @returns {Promise<void>}
   */
  const signInWithEmail = async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      // التحقق من صحة المدخلات
      if (!email || !password) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("البريد الإلكتروني غير صحيح");
      }

      if (password.length < 6) {
        throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      }

      // تسجيل الدخول
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // التحقق من وجود المستخدم في Firestore
      const userExists = await checkUserExists(user.uid);
      
      if (!userExists) {
        // المستخدم غير موجود في Firestore - تسجيل الخروج
        await firebaseSignOut(auth);
        throw new Error("الحساب غير مسجل لدينا");
      }

      // معالجة تسجيل الدخول الناجح
      await handleSuccessfulAuth(user, rememberMe);
    } catch (err) {
      console.error("Sign in error:", err);
      
      // معالجة الأخطاء وعرض رسائل مناسبة
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول";
      
      if (err.code === "auth/user-not-found") {
        errorMessage = "المستخدم غير موجود";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "كلمة المرور غير صحيحة";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صحيح";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "مشكلة في الاتصال بالشبكة. يرجى المحاولة مرة أخرى";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة لاحقاً";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * دالة لإنشاء حساب جديد بالبريد الإلكتروني وكلمة المرور
   * @param {string} email - البريد الإلكتروني
   * @param {string} password - كلمة المرور
   * @param {string} name - اسم المستخدم
   * @param {boolean} rememberMe - هل المستخدم اختار "تذكرني"
   * @returns {Promise<void>}
   */
  const signUpWithEmail = async (email, password, name, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      // التحقق من صحة المدخلات
      if (!email || !password || !name) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("البريد الإلكتروني غير صحيح");
      }

      if (password.length < 6) {
        throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      }

      if (!name.trim()) {
        throw new Error("يرجى إدخال الاسم");
      }

      // تسجيل الخروج من أي حساب موجود قبل إنشاء حساب جديد
      try {
        await firebaseSignOut(auth);
      } catch (signOutError) {
        // تجاهل خطأ تسجيل الخروج إذا لم يكن هناك مستخدم مسجل دخول
      }

      // إنشاء الحساب
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // تحديث اسم المستخدم
      if (name) {
        await updateProfile(user, { displayName: name });
      }

      // معالجة إنشاء الحساب الناجح
      await handleSuccessfulAuth(user, rememberMe);
    } catch (err) {
      console.error("Sign up error:", err);
      
      // معالجة الأخطاء وعرض رسائل مناسبة
      let errorMessage = "حدث خطأ أثناء إنشاء الحساب";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صحيح";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "مشكلة في الاتصال بالشبكة. يرجى المحاولة مرة أخرى";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "طريقة تسجيل الدخول غير مفعّلة. يرجى تفعيل Email/Password في Firebase Console";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * دالة للكشف عن نوع الجهاز والمتصفح
   * @returns {Object} كائن يحتوي على معلومات الجهاز
   */
  const detectDeviceType = () => {
    if (typeof window === "undefined") {
      return {
        isSafari: false,
        isIOS: false,
        isMobile: false,
        isPWA: false,
        shouldUseRedirect: false,
      };
    }

    const userAgent = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isPWA = window.matchMedia("(display-mode: standalone)").matches;

    // استخدام Redirect في Safari و iOS و PWA و Mobile
    // استخدام Popup في Chrome Desktop
    const shouldUseRedirect = isSafari || isIOS || isMobile || isPWA;

    return {
      isSafari,
      isIOS,
      isMobile,
      isPWA,
      shouldUseRedirect,
    };
  };

  /**
   * دالة لتسجيل الدخول باستخدام Google
   * @param {boolean} rememberMe - هل المستخدم اختار "تذكرني"
   * @returns {Promise<void>}
   */
  const signInWithGoogle = async (rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      // تسجيل الخروج أولاً لإجبار اختيار الحساب
      try {
        await firebaseSignOut(auth);
      } catch (signOutError) {
        // تجاهل خطأ تسجيل الخروج إذا لم يكن هناك مستخدم مسجل دخول
      }

      // إعداد Google Auth Provider مع إجبار اختيار الحساب
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account", // إجبار Google على إظهار شاشة اختيار الحساب
      });

      // الكشف عن نوع الجهاز
      const deviceInfo = detectDeviceType();

      if (deviceInfo.shouldUseRedirect) {
        // استخدام Redirect في Safari و iOS و PWA و Mobile
        await signInWithRedirect(auth, provider);
        // سيتم إعادة التوجيه - getRedirectResult سيتعامل مع النتيجة في useEffect
      } else {
        // استخدام Popup في Chrome Desktop
        try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          // معالجة تسجيل الدخول الناجح
          await handleSuccessfulAuth(user, rememberMe);
        } catch (popupError) {
          // إذا فشل Popup، استخدم Redirect كبديل
          if (
            popupError.code === "auth/popup-blocked" ||
            popupError.code === "auth/popup-closed-by-user"
          ) {
            await signInWithRedirect(auth, provider);
            // سيتم إعادة التوجيه - getRedirectResult سيتعامل مع النتيجة في useEffect
          } else {
            throw popupError;
          }
        }
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      
      // معالجة الأخطاء
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول بـ Google";
      
      if (err.code === "auth/operation-not-allowed") {
        errorMessage = "تسجيل الدخول بـ Google غير مفعّل في Firebase Console";
      } else if (err.code === "auth/unauthorized-domain") {
        errorMessage = "النطاق الحالي غير مصرح به. يرجى إضافة النطاق في Firebase Console";
      } else if (err.code !== "auth/popup-closed-by-user") {
        errorMessage = "حدث خطأ أثناء تسجيل الدخول بـ Google. يرجى المحاولة مرة أخرى";
      }
      
      // لا نعرض رسالة خطأ إذا أغلق المستخدم النافذة (إجراء طبيعي)
      if (err.code !== "auth/popup-closed-by-user") {
        setError(errorMessage);
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * useEffect لمعالجة نتائج Redirect الخاصة بـ Google Sign-In
   * هذا مهم جداً لـ iOS PWA و Safari
   */
  useEffect(() => {
    const handleRedirectResult = async () => {
      if (typeof window === "undefined") {
        setIsCheckingRedirect(false);
        return;
      }

      try {
        // الحصول على نتيجة Redirect من Google
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          const user = result.user;

          // التحقق من وجود المستخدم في Firestore
          const userExists = await checkUserExists(user.uid);

          if (!userExists) {
            // المستخدم جديد - إنشاء مستند جديد
            try {
              await createUserDocument(user, "user", user.displayName);

              // التحقق مرة أخرى من إنشاء المستند
              const verified = await checkUserExists(user.uid);
              if (!verified) {
                await firebaseSignOut(auth);
                setError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
                setIsCheckingRedirect(false);
                return;
              }
            } catch (createError) {
              await firebaseSignOut(auth);
              setError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
              setIsCheckingRedirect(false);
              return;
            }
          }

          // حفظ بيانات المستخدم
          if (typeof window !== "undefined") {
            const userName = user.displayName || user.email || "";
            localStorage.setItem("userName", userName);

            // التحقق من rememberMe من localStorage
            const savedRememberMe = localStorage.getItem("rememberMe");
            if (savedRememberMe === "true") {
              localStorage.setItem("rememberMe", "true");
            }
          }

          // التوجيه إلى الصفحة الرئيسية
          router.push("/home");
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
        if (error.code !== "auth/popup-closed-by-user") {
          setError("حدث خطأ أثناء تسجيل الدخول");
        }
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    // تنفيذ معالجة Redirect عند تحميل الصفحة
    handleRedirectResult();
  }, [router]);

  /**
   * دالة لتسجيل الخروج
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userName");
        localStorage.removeItem("rememberMe");
      }
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // إرجاع الدوال والحالات
  return {
    // الدوال
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    
    // States
    loading: loading || isCheckingRedirect,
    error,
    
    // دوال مساعدة (اختيارية للاستخدام الخارجي)
    checkUserExists,
    createUserDocument,
  };
}

