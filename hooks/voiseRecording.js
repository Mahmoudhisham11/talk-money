import { useEffect, useRef, useState } from "react";

const useSpeechRecognition = () => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const permissionGrantedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasRecognitionSupport(false);
      return;
    }

    const recognition = new SpeechRecognition();

    // ⭐ الإعدادات الصح
    recognition.continuous = false; // مهم جدًا لتجنب التكرار
    recognition.interimResults = true;
    recognition.lang = "ar-EG";

    recognition.onresult = (event) => {
      const lastIndex = event.results.length - 1;
      const result = event.results[lastIndex];
      const transcript = result[0].transcript.trim();

      if (result.isFinal) {
        setText(transcript);
      } else {
        setText(transcript); // نص مؤقت أثناء الكلام
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        permissionGrantedRef.current = false;
        setError("تم رفض إذن الميكروفون.");
      } else if (event.error === "no-speech") {
        setError("لم يتم اكتشاف أي كلام.");
      } else if (event.error === "audio-capture") {
        setError("لا يوجد ميكروفون متاح.");
      } else if (event.error === "network") {
        setError("مشكلة في الاتصال بالشبكة.");
      } else if (event.error === "aborted") {
        setError("");
      } else {
        setError("حدث خطأ أثناء التسجيل.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setHasRecognitionSupport(true);

    return () => {
      recognition.stop();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      permissionGrantedRef.current = true;
      return true;
    } catch (err) {
      permissionGrantedRef.current = false;
      setError("يرجى السماح باستخدام الميكروفون.");
      return false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;

    setText("");
    setError("");

    if (!permissionGrantedRef.current) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    try {
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err) {
      setIsListening(false);
      setError("فشل في بدء التسجيل.");
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (err) {
      console.error(err);
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
