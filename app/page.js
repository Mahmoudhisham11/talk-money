"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("جاهز للتسجيل");
  const recognitionRef = useRef(null);
  const permissionAskedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("المتصفح لا يدعم Web Speech API");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      setListening(false);
      setStatus("تم الالتقاط");
    };

    recognition.onerror = (event) => {
      setListening(false);
      setStatus("توقف التسجيل");
      setError(event.error || "حدث خطأ أثناء التسجيل");
    };

    recognition.onend = () => {
      setListening(false);
      setStatus("توقف التسجيل");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop?.();
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setError("");
    setStatus("طلب الإذن...");
    setListening(true);

    // اطلب إذن الميكروفون مرة واحدة لتقليل ظهور مربع الحوار
    if (!permissionAskedRef.current && navigator?.mediaDevices?.getUserMedia) {
      permissionAskedRef.current = true;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          setStatus("جارٍ الاستماع...");
          recognitionRef.current?.start();
        })
        .catch(() => {
          setListening(false);
          setStatus("لم يتم منح الإذن");
          setError("يجب منح إذن الميكروفون حتى يعمل التسجيل");
        });
    } else {
      setStatus("جارٍ الاستماع...");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, #f9fafb, #eef2ff 35%, #e0f2fe 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(680px, 100%)",
          background: "white",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          border: "1px solid #eef2ff",
        }}
      >
        <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #22d3ee 100%)",
              display: "grid",
              placeItems: "center",
              color: "white",
              fontSize: 22,
            }}
          >
            🎙️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#111827" }}>
              التعرف على الكلام
            </h1>
            <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
              سجّل صوتك وسيتم تحويله إلى نص عربي.
            </p>
          </div>
        </header>

        <div
          style={{
            margin: "20px 0",
            padding: 14,
            borderRadius: 12,
            background: listening ? "#eef2ff" : "#f8fafc",
            color: listening ? "#4338ca" : "#475569",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid #e5e7eb",
          }}
        >
          <span style={{ fontSize: 18 }}>{listening ? "🎧" : "ℹ️"}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{status}</div>
            {error && (
              <div style={{ color: "#dc2626", marginTop: 4 }}>{error}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={startListening}
            disabled={listening}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              color: "white",
              fontWeight: 600,
              fontSize: 16,
              background: listening
                ? "linear-gradient(135deg, #a5b4fc, #c7d2fe)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              cursor: listening ? "not-allowed" : "pointer",
              boxShadow: "0 12px 30px rgba(99,102,241,0.25)",
              transition: "transform 0.1s ease, box-shadow 0.2s ease",
            }}
          >
            ابدأ التسجيل
          </button>
          <button
            onClick={stopListening}
            disabled={!listening}
            style={{
              padding: "14px 18px",
              minWidth: 140,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: listening ? "#fee2e2" : "#f8fafc",
              color: listening ? "#b91c1c" : "#475569",
              fontWeight: 600,
              cursor: listening ? "pointer" : "not-allowed",
              transition: "transform 0.1s ease",
            }}
          >
            إيقاف
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 12,
            border: "1px dashed #e5e7eb",
            minHeight: 120,
            background: "#f9fafb",
            color: "#111827",
            lineHeight: 1.6,
          }}
        >
          {listening && "🎧 جاري الاستماع..."}
          {!listening && text && `📝 ${text}`}
          {!listening && !text && "سجّل أول جملة لتظهر هنا."}
        </div>
      </section>
    </main>
  );
}
