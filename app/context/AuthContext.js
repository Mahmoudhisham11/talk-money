"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNotifications } from "./NotificationContext";

const AuthContext = createContext();

// Helper component to use notifications in AuthProvider
function AuthProviderWithNotifications({ children }) {
  const { showSuccess, showError } = useNotifications();
  
  return <AuthProviderInner showSuccess={showSuccess} showError={showError}>{children}</AuthProviderInner>;
}

function AuthProviderInner({ children, showSuccess, showError }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const router = useRouter();

  // دالة للتحقق من وجود المستخدم في Firestore
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

  // دالة لإنشاء مستند المستخدم في Firestore
  const createUserDocument = async (user, userRole = "user") => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        role: userRole,
        createdAt: serverTimestamp(),
        uid: user.uid,
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  // دالة لتسجيل الخروج وإعادة التوجيه
  const handleUnauthorizedUser = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userName");
        localStorage.removeItem("rememberMe");
      }
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // معالجة نتيجة Redirect من Google Sign-In
  useEffect(() => {
    const handleRedirectResult = async () => {
      if (typeof window === "undefined") {
        setIsCheckingRedirect(false);
        return;
      }

      try {
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          const user = result.user;
          
          // التحقق من وجود المستخدم في Firestore
          const userExists = await checkUserExists(user.uid);
          
          if (!userExists) {
            // المستخدم غير موجود - إنشاء مستند جديد
            try {
              await createUserDocument(user, "user");
              
              // التحقق مرة أخرى من إنشاء المستند
              const verified = await checkUserExists(user.uid);
              if (!verified) {
                await handleUnauthorizedUser();
                showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
                setIsCheckingRedirect(false);
                return;
              }
            } catch (createError) {
              await handleUnauthorizedUser();
              showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
              setIsCheckingRedirect(false);
              return;
            }
          }

          // المستخدم موجود - حفظ البيانات
          if (typeof window !== "undefined") {
            localStorage.setItem("userName", user.displayName || user.email || "");
          }

          showSuccess("تم تسجيل الدخول بنجاح");
          // التوجيه إلى الصفحة الرئيسية
          router.push("/home");
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
        if (error.code !== "auth/popup-closed-by-user") {
          showError("حدث خطأ أثناء تسجيل الدخول");
        }
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [router, showSuccess, showError]);

  // الاستماع لتغييرات حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // التحقق من وجود المستخدم في Firestore
          const userExists = await checkUserExists(currentUser.uid);
          
          if (!userExists) {
            // المستخدم غير موجود في Firestore - تسجيل الخروج
            await handleUnauthorizedUser();
            return;
          }

          // المستخدم موجود - تحديث state
          setUser(currentUser);
          
          if (typeof window !== "undefined") {
            const name = currentUser.displayName || currentUser.email || "";
            localStorage.setItem("userName", name);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          await handleUnauthorizedUser();
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("userName");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // دالة لتسجيل الدخول باستخدام Google
  const signInWithGoogle = async () => {
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
        prompt: "select_account",
      });

      // الكشف عن نوع المتصفح
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

      // استخدام Redirect في Safari و iOS و PWA و Mobile
      // استخدام Popup في Chrome Desktop
      if (isSafari || isIOS || isMobile || isPWA) {
        // استخدام Redirect
        await signInWithRedirect(auth, provider);
        // سيتم إعادة التوجيه - getRedirectResult سيتعامل مع النتيجة
      } else {
        // استخدام Popup في Chrome Desktop
        try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          // التحقق من وجود المستخدم في Firestore
          const userExists = await checkUserExists(user.uid);
          
          if (!userExists) {
            // المستخدم غير موجود - إنشاء مستند جديد
            try {
              await createUserDocument(user, "user");
              
              // التحقق مرة أخرى من إنشاء المستند
              const verified = await checkUserExists(user.uid);
              if (!verified) {
                await signOut(auth);
                showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
                return;
              }
            } catch (createError) {
              await signOut(auth);
              showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
              return;
            }
          }

          // حفظ البيانات
          if (typeof window !== "undefined") {
            localStorage.setItem("userName", user.displayName || user.email || "");
          }

          showSuccess("تم تسجيل الدخول بنجاح");
          // التوجيه إلى الصفحة الرئيسية
          router.push("/home");
        } catch (popupError) {
          // إذا فشل Popup، استخدم Redirect كبديل
          if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/popup-closed-by-user") {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      if (error.code === "auth/operation-not-allowed") {
        showError("تسجيل الدخول بـ Google غير مفعّل في Firebase Console");
      } else if (error.code === "auth/unauthorized-domain") {
        showError(
          "النطاق الحالي غير مصرح به. يرجى إضافة النطاق في Firebase Console"
        );
      } else if (error.code !== "auth/popup-closed-by-user") {
        showError("حدث خطأ أثناء تسجيل الدخول بـ Google. يرجى المحاولة مرة أخرى");
      }
      throw error;
    }
  };

  const value = {
    user,
    loading: loading || isCheckingRedirect,
    signInWithGoogle,
    signOut: handleUnauthorizedUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return <AuthProviderWithNotifications>{children}</AuthProviderWithNotifications>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
