"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Zap, RotateCcw } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { readJson, formatCurrency } from "@/lib/utils";
import { searchUrlForSource } from "@/lib/marketplaces";
import { negotiation } from "@/lib/analysis/deal";
import type { Verdict } from "@/lib/types";

interface ItemResult {
  id: string;
  verdict: Verdict | null;
  recommendedMedian: number | null;
  searchQuery: string | null;
}

type Stage = "idle" | "loading" | "result";

export default function QuickScanPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [asking, setAsking] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ItemResult | null>(null);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const url = await fileToDataUrl(files[0]);
    setImage(url);
    setError(null);
  }

  async function analyze() {
    if (!image) return;
    setStage("loading");
    setError(null);
    try {
      const askingPrice = asking.trim() ? Number(asking) : null;
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [image], askingPrice }),
      });
      const data = await readJson(res);
      if (typeof data.id !== "string") {
        throw new Error("The server didn't return a saved item. Please try again.");
      }
      // Fetch full item data to get verdict + recommendedMedian.
      // The API wraps the payload as { item: {...} }.
      // The analysis is already paid for and saved at this point — if this
      // follow-up read fails, still show the result screen (NO VERDICT) with
      // the link to the saved item rather than throwing the work away.
      let item: {
        verdict?: Verdict | null;
        recommendedMedian?: number | null;
        searchQuery?: string | null;
        name?: string | null;
      } = {};
      try {
        const itemRes = await fetch(`/api/items/${data.id}`);
        const detail = await readJson(itemRes);
        item = (detail.item ?? {}) as typeof item;
      } catch {
        // Fall through with empty item — the saved analysis is still linked.
      }
      setResult({
        id: data.id,
        verdict: item.verdict ?? null,
        recommendedMedian: typeof item.recommendedMedian === "number" ? item.recommendedMedian : null,
        searchQuery: item.searchQuery ?? item.name ?? null,
      });
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("idle");
    }
  }

  function reset() {
    setImage(null);
    setAsking("");
    setStage("idle");
    setError(null);
    setResult(null);
  }

  // Loading state
  if (stage === "loading") {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
            <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-2xl shadow-brand/40">
              <Zap className="h-9 w-9 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Analyzing…</p>
            <p className="text-sm text-muted">Checking prices across the market.</p>
          </div>
        </div>
      </div>
    );
  }

  // Result state
  if (stage === "result" && result) {
    const { verdict, recommendedMedian, id } = result;
    const median = recommendedMedian ?? 0;

    let cardClass = "";
    let headlineText = "";
    let subText = "";

    if (verdict === "STEAL") {
      cardClass = "bg-steal/20 border-steal/40 text-steal";
      headlineText = "BUY IT";
      // Same rounded ceiling the item page's negotiation card shows.
      const maxBuy = negotiation(median, null)?.maxBuy;
      subText = maxBuy != null ? `Max buy: ${formatCurrency(maxBuy)}` : `Worth ~${formatCurrency(median)}`;
    } else if (verdict === "GOOD") {
      cardClass = "bg-steal/20 border-steal/40 text-steal";
      headlineText = "GOOD DEAL";
      subText = `Worth ~${formatCurrency(median)}`;
    } else if (verdict === "FAIR") {
      cardClass = "bg-yellow-500/15 border-yellow-500/30 text-yellow-600";
      headlineText = "FAIR PRICE";
      subText = `Worth ~${formatCurrency(median)}`;
    } else if (verdict === "OVERPRICED") {
      cardClass = "bg-over/15 border-over/30 text-over";
      headlineText = "PASS";
      subText = `Only worth ~${formatCurrency(median)}`;
    } else {
      // No verdict — too little market data to call it either way.
      cardClass = "bg-surface-2 border-border text-fg";
      headlineText = "NO VERDICT";
      subText =
        recommendedMedian != null
          ? `Maybe ~${formatCurrency(median)} — not enough comps to be sure`
          : "Not enough market data — check eBay sold prices below";
    }

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4">
        {/* Big verdict card */}
        <div
          className={`flex w-full flex-col items-center gap-3 rounded-3xl border-2 px-8 py-10 text-center ${cardClass}`}
        >
          <p className="text-5xl font-black tracking-tight">{headlineText}</p>
          <p className="text-xl font-semibold opacity-90">{subText}</p>
        </div>

        {/* See full analysis + live verification links */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href={`/item/${id}`}
            className="text-sm font-medium text-brand underline underline-offset-2 hover:opacity-80"
          >
            See full analysis
          </Link>
          {result.searchQuery && (
            <a
              href={searchUrlForSource("ebay", result.searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted underline underline-offset-2 hover:text-fg"
            >
              Verify on eBay sold listings ↗
            </a>
          )}
        </div>

        {/* Scan another */}
        <button
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90"
        >
          <RotateCcw className="h-5 w-5" /> Scan another
        </button>
      </div>
    );
  }

  // Idle / input state
  return (
    <div className="mx-auto max-w-sm space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Scan</h1>
        <p className="text-sm text-muted">
          Snap a photo, get an instant buy/pass verdict.
        </p>
      </div>

      {/* Camera / upload area */}
      <button
        onClick={() => fileRef.current?.click()}
        className="relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-border bg-surface transition hover:border-brand hover:text-brand"
        style={{ minHeight: "260px" }}
      >
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt="Selected item"
            className="h-full w-full object-cover"
            style={{ minHeight: "260px", maxHeight: "320px" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Camera className="h-12 w-12" />
            <span className="text-base font-medium">Tap to scan item</span>
            <span className="text-xs">Take or choose a photo</span>
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFile(e.target.files)}
      />

      {/* Asking price */}
      <label className="block">
        <span className="text-sm font-medium">Asking price (optional)</span>
        <div className="mt-1 flex items-center rounded-xl border border-border bg-surface px-3">
          <span className="text-muted">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={asking}
            onChange={(e) => setAsking(e.target.value)}
            placeholder="What's the seller asking?"
            className="w-full bg-transparent px-2 py-3 outline-none"
          />
        </div>
      </label>

      {error && (
        <p className="rounded-xl border border-over/40 bg-over/10 px-4 py-3 text-sm text-over">
          {error}
        </p>
      )}

      {/* Analyze button */}
      <button
        onClick={analyze}
        disabled={!image}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap className="h-5 w-5" />
        Analyze
      </button>
    </div>
  );
}
