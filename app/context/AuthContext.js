"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const isGoogleSignInRef = useRef(false); // Track if Google sign-in is in progress
  const router = useRouter();

  // دالة للتحقق من وجود المستخدم في Firestore
  const checkUserExists = async (uid, retries = 3) => {
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
  };

  // دالة لحفظ المستخدم في Firestore
  const saveUserToFirestore = async (user, displayNameFallback = null) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const displayName = user.displayName || displayNameFallback || user.email || "";
      
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          name: displayName,
          email: user.email,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("Document was not created after setDoc");
      }
    } catch (err) {
      throw err;
    }
  };

  // دالة لتسجيل الخروج وإعادة التوجيه
  const handleUnauthorizedUser = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userName");
        localStorage.removeItem("userPhoto");
        localStorage.removeItem("rememberMe");
      }
      router.push("/login");
    } catch (error) {
      // Silently fail
    }
  };

  // دالة لتسجيل الدخول باستخدام Google
  const signInWithGoogle = async () => {
    if (googleLoading) return; // Prevent multiple calls
    
    setGoogleLoading(true);
    isGoogleSignInRef.current = true;
    
    try {
      // Sign out first to force account selection
      try {
        await signOut(auth);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (signOutError) {
        // Ignore error if no user is signed in
      }

      // Setup Google Auth Provider
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      
      // Use popup - opens in a new window
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // التحقق من وجود المستخدم في Firestore
      const userExists = await checkUserExists(user.uid);
      
      if (!userExists) {
        // المستخدم غير موجود - إنشاء مستند جديد
        try {
          await saveUserToFirestore(user, null);
          
          // التحقق مرة أخرى من إنشاء المستند
          let verified = await checkUserExists(user.uid);
          let retries = 3;
          
          while (!verified && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 150));
            verified = await checkUserExists(user.uid);
            retries--;
          }
          
          if (!verified) {
            // Final retry
            await saveUserToFirestore(user, null);
            await new Promise(resolve => setTimeout(resolve, 200));
            verified = await checkUserExists(user.uid);
            
            if (!verified) {
              throw new Error("Failed to create user document");
            }
          }
        } catch (createError) {
          await signOut(auth);
          showError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى");
          setGoogleLoading(false);
          isGoogleSignInRef.current = false;
          return;
        }
      } else {
        // المستخدم موجود - تحديث البيانات
        await saveUserToFirestore(user, null);
      }

      // حفظ البيانات في localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("userName", user.displayName || user.email || "");
        if (user.photoURL) {
          localStorage.setItem("userPhoto", user.photoURL);
        }
      }

      showSuccess("تم تسجيل الدخول بنجاح");
      
      // Wait a bit before redirecting to ensure everything is saved
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reset flag before redirecting
      isGoogleSignInRef.current = false;
      setGoogleLoading(false);
      
      // التوجيه إلى الصفحة الرئيسية
      router.push("/home");
      
    } catch (err) {
      setGoogleLoading(false);
      isGoogleSignInRef.current = false;
      
      if (err.code === "auth/popup-closed-by-user") {
        // User closed the popup - don't show error
        return;
      } else if (err.code === "auth/popup-blocked") {
        showError("تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة من هذا الموقع");
      } else if (err.code === "auth/operation-not-allowed") {
        showError("تسجيل الدخول بـ Google غير مفعّل في Firebase Console. يرجى تفعيله من Authentication > Sign-in method");
      } else if (err.code === "auth/unauthorized-domain") {
        const currentDomain = typeof window !== "undefined" ? window.location.hostname : "unknown";
        showError(`النطاق "${currentDomain}" غير مصرح به. يرجى إضافته في Firebase Console > Authentication > Settings > Authorized domains`);
      } else if (err.code === "auth/network-request-failed") {
        showError("مشكلة في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت");
      } else {
        showError(err.message || "فشل تسجيل الدخول باستخدام Google. يرجى المحاولة مرة أخرى");
      }
    }
  };

  // الاستماع لتغييرات حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Skip if Google sign-in is in progress (it will handle everything)
      if (isGoogleSignInRef.current) {
        return;
      }

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
            if (currentUser.photoURL) {
              localStorage.setItem("userPhoto", currentUser.photoURL);
            }
          }
        } catch (error) {
          await handleUnauthorizedUser();
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("userName");
          localStorage.removeItem("userPhoto");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, showError, checkUserExists, handleUnauthorizedUser]);

  const value = {
    user,
    loading: loading || googleLoading,
    signOut: handleUnauthorizedUser,
    signInWithGoogle,
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
