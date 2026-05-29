"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, X, Sparkles, Loader2, ScanBarcode } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { readJson } from "@/lib/utils";
import { BarcodeScanner, isBarcodeSupported } from "@/components/BarcodeScanner";
import { VoiceInput } from "@/components/VoiceInput";

const STAGES = [
  "Looking at your photos…",
  "Identifying the item…",
  "Searching eBay & resale sites…",
  "Comparing prices across the web…",
  "Scoring the deal & writing your listing…",
];

export default function ScanPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [asking, setAsking] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [loading]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setImages((prev) => [...prev, ...urls].slice(0, 8));
  }

  async function analyze() {
    if (images.length === 0) return;
    // Measure the actual upload payload (the base64 data URLs as sent), not the
    // decoded image size, so we stay under Vercel's ~4.5 MB request-body limit.
    const payloadBytes = images.reduce((sum, src) => sum + src.length, 0);
    if (payloadBytes > 4_300_000) {
      setError("These photos are too large to upload together — remove one or two and try again.");
      return;
    }
    setLoading(true);
    setStage(0);
    setError(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          askingPrice: asking.trim() ? Number(asking) : null,
          hint: hint.trim() || undefined,
        }),
      });
      const data = await readJson(res);
      if (typeof data.id !== "string") {
        throw new Error("The server didn't return a saved item. Please try again.");
      }
      router.push(`/item/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
            <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-2xl shadow-brand/40">
              <Sparkles className="h-9 w-9 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{STAGES[stage]}</p>
            <p className="text-sm text-muted">This usually takes 20–60 seconds.</p>
          </div>
          <div className="flex gap-1.5">
            {STAGES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition ${
                  i <= stage ? "bg-brand" : "bg-surface-2"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scan an item</h1>
        <p className="text-sm text-muted">
          Add a few photos from different angles for the most accurate price.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={i} className="group relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full rounded-xl border border-border object-cover"
            />
            <button
              onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-over text-white shadow-lg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < 8 && (
          <button
            onClick={() => fileRef.current?.click()}
            className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted transition hover:border-brand hover:text-brand"
          >
            <div className="flex flex-col items-center gap-1">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Add photo</span>
            </div>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      {images.length === 0 && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-4 font-medium transition hover:border-brand"
        >
          <Camera className="h-5 w-5" /> Take or choose photos
        </button>
      )}

      {/* Inputs */}
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Asking price (optional)</span>
          <div className="mt-1 flex items-center rounded-xl border border-border bg-surface px-3">
            <span className="text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={asking}
              onChange={(e) => setAsking(e.target.value)}
              placeholder="What's it being sold for?"
              className="w-full bg-transparent px-2 py-3 outline-none"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Hint (optional)</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. brand, model, size — anything you know"
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 outline-none placeholder:text-muted"
            />
            <VoiceInput
              onResult={(text) =>
                setHint((prev) => (prev.trim() ? `${prev} ${text}` : text))
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-brand"
            />
          </div>
          {isBarcodeSupported() && (
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition hover:text-brand"
            >
              <ScanBarcode className="h-4 w-4" /> Scan barcode
            </button>
          )}
        </label>
      </div>

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onDetected={(code) => {
            setHint((prev) => (prev.trim() ? `${prev} UPC ${code}` : `UPC ${code}`));
            setScanning(false);
          }}
        />
      )}

      {error && (
        <p className="rounded-xl border border-over/40 bg-over/10 px-4 py-3 text-sm text-over">
          {error}
        </p>
      )}

      <button
        onClick={analyze}
        disabled={images.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        Analyze {images.length > 0 ? `(${images.length})` : ""}
      </button>
    </div>
  );
}
