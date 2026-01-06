"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

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
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setText("");
    setListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>🎙️ Web Speech API – Next.js</h1>

      <button onClick={startListening} disabled={listening}>
        ابدأ تسجيل
      </button>

      <button onClick={stopListening} disabled={!listening}>
        إيقاف
      </button>

      <div style={{ marginTop: 30, fontSize: 18 }}>
        {listening && "🎧 جاري الاستماع..."}
        {!listening && text && `📝 ${text}`}
      </div>
    </main>
  );
}
