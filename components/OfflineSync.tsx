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
import { sendJson } from "@/lib/utils";

/**
 * Mounted once in the root layout. Registers the service worker, and drains the
 * offline scan queue (snap-now, analyze-later) whenever the app is open and
 * online — on load, when connectivity returns, and when a new scan is queued.
 */
export function OfflineSync() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

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
          await sendJson("/api/items", "POST", {
            images: scan.images,
            askingPrice: scan.askingPrice,
            hint: scan.hint || undefined,
          });
          await removeQueuedScan(scan.id);
          uploaded += 1;
          setPending((n) => Math.max(0, n - 1));
        } catch {
          // Likely offline again or a transient server error — keep the rest
          // queued and try again on the next online/queue event.
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
