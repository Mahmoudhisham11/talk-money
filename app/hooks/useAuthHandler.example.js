/**
 * مثال على استخدام دالة useAuthHandler
 * 
 * هذا الملف يوضح كيفية استخدام الدالة في صفحة تسجيل الدخول
 */

"use client";

import { useState } from "react";
import { useAuthHandler } from "./useAuthHandler";
import { useNotifications } from "../context/NotificationContext";

export default function LoginPageExample() {
  // استخدام الدالة
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    loading,
    error,
  } = useAuthHandler();

  const { showSuccess, showError } = useNotifications();

  // States للنموذج
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // دالة لتسجيل الدخول بالبريد الإلكتروني
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    try {
      await signInWithEmail(email, password, rememberMe);
      showSuccess("تم تسجيل الدخول بنجاح");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    }
  };

  // دالة لإنشاء حساب جديد
  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    
    try {
      await signUpWithEmail(email, password, name, rememberMe);
      showSuccess("تم إنشاء الحساب بنجاح");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء إنشاء الحساب");
    }
  };

  // دالة لتسجيل الدخول باستخدام Google
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle(rememberMe);
      // ملاحظة: رسالة النجاح تظهر تلقائياً من الدالة
    } catch (err) {
      // لا نعرض رسالة خطأ إذا أغلق المستخدم النافذة
      if (err.message && !err.message.includes("popup-closed")) {
        showError(err.message || "حدث خطأ أثناء تسجيل الدخول بـ Google");
      }
    }
  };

  return (
    <div>
      <h1>{isLogin ? "تسجيل الدخول" : "إنشاء حساب"}</h1>

      {/* عرض الأخطاء */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* نموذج تسجيل الدخول/إنشاء حساب */}
      <form onSubmit={isLogin ? handleEmailLogin : handleEmailSignUp}>
        {!isLogin && (
          <div>
            <label>الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label>البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {isLogin && (
          <div>
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              تذكرني
            </label>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading
            ? "جاري المعالجة..."
            : isLogin
            ? "تسجيل الدخول"
            : "إنشاء حساب"}
        </button>
      </form>

      {/* زر تسجيل الدخول بـ Google */}
      <button onClick={handleGoogleLogin} disabled={loading}>
        تسجيل الدخول باستخدام Google
      </button>

      {/* زر التبديل بين تسجيل الدخول وإنشاء حساب */}
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ تسجيل الدخول"}
      </button>
    </div>
  );
}

/**
 * ملاحظات مهمة:
 * 
 * 1. الدالة useAuthHandler تتعامل تلقائياً مع:
 *    - الكشف عن نوع الجهاز (iOS, Safari, PWA, Mobile, Desktop)
 *    - اختيار الطريقة المناسبة (Popup أو Redirect)
 *    - معالجة نتائج Redirect في useEffect
 *    - التحقق من وجود المستخدم في Firestore
 *    - إنشاء مستند جديد عند الحاجة
 *    - حفظ البيانات في localStorage
 *    - التوجيه إلى الصفحة الرئيسية
 * 
 * 2. على iOS PWA و Safari:
 *    - يتم استخدام Redirect تلقائياً
 *    - getRedirectResult في useEffect يتعامل مع النتيجة
 *    - لا حاجة لأي كود إضافي
 * 
 * 3. على Chrome Desktop:
 *    - يتم استخدام Popup
 *    - إذا فشل Popup، يتم استخدام Redirect كبديل
 * 
 * 4. معالجة الأخطاء:
 *    - جميع الأخطاء يتم معالجتها وعرض رسائل مناسبة
 *    - الأخطاء الطبيعية (مثل إغلاق النافذة) لا تعرض رسائل خطأ
 * 
 * 5. خيار "تذكرني":
 *    - يتم حفظه في localStorage
 *    - يتم استخدامه في جميع طرق تسجيل الدخول
 */

