"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode } from "lucide-react";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
}

export function isBarcodeSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    if (!Ctor) return;
    const detector = new Ctor({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
    });

    async function tick() {
      if (stopped || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const code = codes[0]?.rawValue;
        if (code) {
          onDetected(code);
          return;
        }
      } catch {
        // transient detect errors are fine; keep polling
      }
      timer = setTimeout(tick, 350);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        timer = setTimeout(tick, 400);
      } catch {
        setError("Couldn't access the camera. Check permissions and try again.");
      }
    }
    start();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <ScanBarcode className="h-5 w-5 text-brand" /> Scan barcode
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-square bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-brand/80 shadow-[0_0_12px] shadow-brand" />
        </div>
        <p className="p-3 text-center text-xs text-muted">
          {error ?? "Center a UPC or barcode in the frame."}
        </p>
      </div>
    </div>
  );
}
