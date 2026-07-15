"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import {
  listQueuedScans,
  removeQueuedScan,
  countQueuedScans,
  onQueueChanged,
} from "@/lib/offline";

/**
 * Mounted once in the root layout. Drains the offline scan queue
 * (snap-now, analyze-later) whenever the app is open and online —
 * on load, when connectivity returns, and when a new scan is queued.
 */
export function OfflineSync() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const runningRef = useRef(false);


  const flush = useCallback(async () => {
    if (runningRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPending(await countQueuedScans().catch(() => 0));
      return;
    }
    runningRef.current = true;
    try {
      const queue = await listQueuedScans().catch(() => []);
      setPending(queue.length);
      if (queue.length === 0) return;

      setSyncing(true);
      let uploaded = 0;
      for (const scan of queue) {
        try {
          const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: scan.images,
              askingPrice: scan.askingPrice,
              hint: scan.hint || undefined,
            }),
          });
          if (res.ok || res.status === 409) {
            // 409 = duplicate already in library — remove from queue so it
            // doesn't block the rest of the queue on every sync attempt.
            await removeQueuedScan(scan.id);
            if (res.ok) uploaded += 1;
            setPending((n) => Math.max(0, n - 1));
          } else {
            // Transient server error — keep queued and retry later.
            break;
          }
        } catch {
          // Likely offline again — keep the rest queued.
          break;
        }
      }
      if (uploaded > 0) router.refresh();
    } finally {
      runningRef.current = false;
      setSyncing(false);
      setPending(await countQueuedScans().catch(() => 0));
    }
  }, [router]);

  useEffect(() => {
    const initial = setTimeout(flush, 0);
    window.addEventListener("online", flush);
    const offQueue = onQueueChanged(flush);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("online", flush);
      offQueue();
    };
  }, [flush]);

  if (pending === 0 && !syncing) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 sm:bottom-6">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
        ) : (
          <CloudUpload className="h-4 w-4 text-muted" />
        )}
        <span>
          {syncing
            ? "Uploading saved scans…"
            : `${pending} scan${pending === 1 ? "" : "s"} waiting to upload`}
        </span>
      </div>
    </div>
  );
}
