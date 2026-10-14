"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useApp } from "./Providers";

/* Minimal typing for the Web Speech API (not in lib.dom for all TS versions). */
interface SR {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/** Voice dictation in Tamil (ta-IN) or English (en-IN). Falls back to typing when unsupported. */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const { t, lang, L } = useApp();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState("");
  const rec = useRef<SR | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  function toggle() {
    setErr("");
    if (listening) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === "ta" ? "ta-IN" : "en-IN";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      if (text) onText(text);
    };
    r.onerror = (e) => {
      setErr(
        e.error === "not-allowed"
          ? L("Microphone permission was denied. Please type your description.", "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. தட்டச்சு செய்யவும்.")
          : L("Voice input didn't work. Please type your description.", "குரல் உள்ளீடு வேலை செய்யவில்லை. தட்டச்சு செய்யவும்."),
      );
    };
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setErr(t("voiceUnavailable"));
    }
  }

  if (supported === false) return <p className="text-sm text-mute">{t("voiceUnavailable")}</p>;
  return (
    <div>
      <button type="button" onClick={toggle} className={`btn-secondary px-3 text-[15px] ${listening ? "border-danger text-danger" : ""}`} aria-pressed={listening} disabled={supported === null}>
        {listening ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
        {listening ? t("voiceListening") : `${t("voiceInput")} (${lang === "ta" ? "தமிழ்" : "English"})`}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-danger">{err}</p>
    </div>
  );
}
