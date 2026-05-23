"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted transition hover:text-fg"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-steal" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

// Shares the current item via the native share sheet (mobile), falling back to
// copying the link to the clipboard on desktop browsers without Web Share.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; nothing more we can do
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-brand"
    >
      {copied ? (
        <Check className="h-4 w-4 text-steal" />
      ) : canShare ? (
        <Share2 className="h-4 w-4" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
