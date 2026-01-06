"use client";

import useSpeechRecognition from "@/hooks/voiseRecording"

export default function Main() {
  const {
    text,
    isListening,
    startListening,
    stopListening,
    hasRecognitionSupport,
    error,
  } = useSpeechRecognition();

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

        {hasRecognitionSupport ? (
          <>
            <div
              style={{
                margin: "20px 0",
                padding: 14,
                borderRadius: 12,
                background: isListening ? "#eef2ff" : "#f8fafc",
                color: isListening ? "#4338ca" : "#475569",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #e5e7eb",
              }}
            >
              <span style={{ fontSize: 18 }}>
                {isListening ? "🎧" : "ℹ️"}
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {isListening
                    ? "جارٍ الاستماع... تحدث الآن"
                    : text
                    ? "تم حفظ النص"
                    : "جاهز للتسجيل"}
                </div>
                {error && (
                  <div
                    style={{
                      color: "#dc2626",
                      marginTop: 8,
                      fontSize: 14,
                      fontWeight: 400,
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={startListening}
                disabled={isListening}
                style={{
                  flex: 1,
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 16,
                  background: isListening
                    ? "linear-gradient(135deg, #a5b4fc, #c7d2fe)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  cursor: isListening ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 30px rgba(99,102,241,0.25)",
                  transition: "transform 0.1s ease, box-shadow 0.2s ease",
                }}
                onMouseDown={(e) => {
                  if (!isListening) e.currentTarget.style.transform = "scale(0.98)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {isListening ? "جاري التسجيل..." : "🎤 ابدأ التسجيل"}
              </button>
              <button
                onClick={stopListening}
                disabled={!isListening}
                style={{
                  padding: "14px 18px",
                  minWidth: 140,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: isListening ? "#fee2e2" : "#f8fafc",
                  color: isListening ? "#b91c1c" : "#475569",
                  fontWeight: 600,
                  cursor: isListening ? "pointer" : "not-allowed",
                  transition: "transform 0.1s ease",
                }}
                onMouseDown={(e) => {
                  if (isListening) e.currentTarget.style.transform = "scale(0.98)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                ⏹️ إيقاف
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
                fontSize: 16,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {isListening && !text && (
                <div style={{ color: "#6b7280", fontStyle: "italic" }}>
                  🎧 جاري الاستماع... تحدث الآن
                </div>
              )}
              {!isListening && text && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    📝 النص المسجل:
                  </div>
                  <div style={{ color: "#111827" }}>{text}</div>
                </div>
              )}
              {!isListening && !text && (
                <div style={{ color: "#9ca3af", textAlign: "center" }}>
                  سجّل أول جملة لتظهر هنا.
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              margin: "20px 0",
              padding: 20,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#b91c1c",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>
              ⚠️ المتصفح لا يدعم Web Speech API
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              يرجى استخدام متصفح يدعم هذه الميزة (Chrome, Edge, Safari)
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
