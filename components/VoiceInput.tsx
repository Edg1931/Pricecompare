"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isVoiceSupported(): boolean {
  return !!getCtor();
}

/** A mic button that transcribes speech and passes the text to onResult. */
export function VoiceInput({
  onResult,
  className,
}: {
  onResult: (text: string) => void;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  if (!isVoiceSupported()) return null;

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript)
        .join(" ")
        .trim();
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Dictate"
      className={
        className ??
        `grid h-9 w-9 place-items-center rounded-lg border border-border transition ${
          listening ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-fg"
        }`
      }
    >
      <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
    </button>
  );
}
