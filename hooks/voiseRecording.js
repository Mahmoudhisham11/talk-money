import { useEffect, useState, useRef } from "react";

const useSpeechRecognition = () => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef("");
  const permissionGrantedRef = useRef(false);
  const permissionCheckedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasRecognitionSupport(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // للحصول على النتائج المؤقتة
    recognition.lang = "ar-EG"; // تغيير اللغة إلى العربية

    recognition.onresult = (event) => {
      console.log("onresult event: ", event);
      
      // جمع كل النتائج من جميع المقاطع
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // حفظ النص المؤقت
      interimTranscriptRef.current = interimTranscript;

      // تحديث النص النهائي إذا كان موجوداً
      if (finalTranscript.trim()) {
        setText((prevText) => {
          const newText = prevText + finalTranscript.trim();
          return newText;
        });
      } else if (interimTranscript) {
        // عرض النص المؤقت أثناء الكلام
        setText((prevText) => prevText + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      // معالجة أنواع الأخطاء المختلفة
      if (event.error === "not-allowed") {
        permissionGrantedRef.current = false; // تحديث حالة الإذن
        setError("تم رفض إذن الميكروفون. سيتم طلب الإذن مرة أخرى عند المحاولة القادمة.");
      } else if (event.error === "no-speech") {
        setError("لم يتم اكتشاف أي كلام. حاول مرة أخرى.");
      } else if (event.error === "audio-capture") {
        setError("لا يوجد ميكروفون متاح.");
      } else if (event.error === "network") {
        setError("مشكلة في الاتصال بالشبكة.");
      } else if (event.error === "aborted") {
        // تم الإيقاف يدوياً، لا نعرض خطأ
        setError("");
      } else {
        setError(`حدث خطأ: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // عند الانتهاء، نضمن أن النص المؤقت يتم حفظه
      if (interimTranscriptRef.current) {
        setText((prevText) => prevText + interimTranscriptRef.current);
        interimTranscriptRef.current = "";
      }
    };

    recognitionRef.current = recognition;
    setHasRecognitionSupport(true);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    // التحقق من حالة الإذن أولاً
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone",
        });
        
        permissionCheckedRef.current = true;
        
        if (permissionStatus.state === "granted") {
          permissionGrantedRef.current = true;
          return true;
        } else if (permissionStatus.state === "denied") {
          permissionGrantedRef.current = false;
          return false;
        }
        // إذا كان "prompt"، سنحاول طلب الإذن
      }
    } catch (err) {
      // بعض المتصفحات لا تدعم permissions API
      console.log("Permissions API not supported, will try getUserMedia");
    }
    
    // إذا لم نتمكن من التحقق من الإذن، نتحقق من حالة الإذن السابقة
    return permissionGrantedRef.current;
  };

  const requestMicrophonePermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // إيقاف الـ stream فوراً لأننا نحتاج فقط للتحقق من الإذن
        stream.getTracks().forEach((track) => track.stop());
        permissionGrantedRef.current = true;
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error getting microphone permission:", err);
      permissionGrantedRef.current = false;
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("تم رفض إذن الميكروفون. يرجى منح الإذن من إعدادات المتصفح.");
      } else {
        setError("حدث خطأ في الوصول للميكروفون. تأكد من وجود ميكروفون متصل.");
      }
      return false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;
    
    // إعادة تعيين النص والنص المؤقت والخطأ
    setText("");
    interimTranscriptRef.current = "";
    setError("");
    
    // التحقق من حالة الإذن أولاً
    const hasPermission = await checkMicrophonePermission();
    
    // إذا لم يكن الإذن ممنوحاً، نطلبه
    if (!hasPermission) {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        setIsListening(false);
        return;
      }
    }
    
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
      
      // إذا كان الخطأ بسبب الإذن، نحدث حالة الإذن
      if (error.name === "NotAllowedError" || error.message?.includes("not-allowed")) {
        permissionGrantedRef.current = false;
        setError("تم رفض إذن الميكروفون. يرجى منح الإذن من إعدادات المتصفح.");
      } else {
        setError("فشل في بدء التسجيل. حاول مرة أخرى.");
      }
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // جمع أي نص مؤقت متبقي
      if (interimTranscriptRef.current) {
        setText((prevText) => {
          const finalText = prevText + interimTranscriptRef.current;
          interimTranscriptRef.current = "";
          return finalText;
        });
      }
    } catch (error) {
      console.error("Error stopping recognition:", error);
      setIsListening(false);
    }
  };

  return {
    text,
    isListening,
    startListening,
    stopListening,
    hasRecognitionSupport,
    error,
  };
};

export default useSpeechRecognition;
