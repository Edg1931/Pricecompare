"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ImagePlus,
  X,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
  Layers,
} from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { formatCurrency } from "@/lib/utils";
import { VerdictBadge } from "@/components/ui";
import type { ItemIdentification, Verdict } from "@/lib/types";

type Status = "pending" | "running" | "done" | "error";

interface LotItem {
  id: number;
  ident: ItemIdentification;
  include: boolean;
  status: Status;
  itemId?: string;
  verdict?: string | null;
  median?: number | null;
  error?: string;
}

export default function LotPage() {
  const [images, setImages] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LotItem[]>([]);
  const [pricing, setPricing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setImages((prev) => [...prev, ...urls].slice(0, 8));
  }

  async function findItems() {
    if (images.length === 0) return;
    setIdentifying(true);
    setError(null);
    try {
      const res = await fetch("/api/lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, hint: hint.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Identification failed");
      const detected: ItemIdentification[] = data.items ?? [];
      if (detected.length === 0) {
        setError("No resellable items were detected. Try a clearer photo.");
      }
      setItems(
        detected.map((ident) => ({
          id: nextId.current++,
          ident,
          include: true,
          status: "pending" as Status,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIdentifying(false);
    }
  }

  function update(id: number, patch: Partial<LotItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function priceAll() {
    if (pricing) return;
    setPricing(true);
    const todo = items.filter((it) => it.include && it.status !== "done");
    for (const it of todo) {
      update(it.id, { status: "running", error: undefined });
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images, identification: it.ident }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Pricing failed");

        let verdict: string | null = null;
        let median: number | null = null;
        try {
          const r2 = await fetch(`/api/items/${data.id}`);
          if (r2.ok) {
            const d2 = await r2.json();
            verdict = d2.item?.verdict ?? null;
            median = d2.item?.recommendedMedian ?? null;
          }
        } catch {
          // detail fetch is best-effort
        }
        update(it.id, { status: "done", itemId: data.id, verdict, median });
      } catch (err) {
        update(it.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }
    setPricing(false);
  }

  const included = items.filter((i) => i.include);
  const done = items.filter((i) => i.status === "done").length;
  const started = items.some((i) => i.status !== "pending");
  const remaining = included.filter((i) => i.status !== "done").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Layers className="h-6 w-6 text-brand" /> Lot / pile mode
        </h1>
        <p className="text-sm text-muted">
          Photograph a pile, box, or table of stuff. The AI splits it into
          individual items, then prices each one.
        </p>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={i} className="group relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full rounded-xl border border-border object-cover" />
            {items.length === 0 && (
              <button
                onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-over text-white shadow-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {images.length < 8 && items.length === 0 && (
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
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Identify step */}
      {items.length === 0 && (
        <>
          <label className="block">
            <span className="text-sm font-medium">Hint (optional)</span>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. mostly vintage electronics and tools"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 outline-none placeholder:text-muted"
            />
          </label>
          {error && (
            <p className="rounded-xl border border-over/40 bg-over/10 px-4 py-3 text-sm text-over">
              {error}
            </p>
          )}
          <button
            onClick={findItems}
            disabled={images.length === 0 || identifying}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {identifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {identifying ? "Finding items…" : "Find items"}
          </button>
        </>
      )}

      {/* Review + price step */}
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {started ? `Priced ${done}/${included.length}` : `Found ${items.length} item${items.length === 1 ? "" : "s"}`}
            </h2>
            <span className="text-xs text-muted">{included.length} selected</span>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className={`flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-2.5 ${
                  it.include ? "" : "opacity-50"
                }`}
              >
                {!started && (
                  <input
                    type="checkbox"
                    checked={it.include}
                    onChange={(e) => update(it.id, { include: e.target.checked })}
                    className="h-4 w-4 shrink-0 accent-brand"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {started ? (
                    <>
                      <div className="flex items-center gap-2">
                        {it.status === "done" && (
                          <VerdictBadge verdict={it.verdict as Verdict | null} />
                        )}
                        {it.median != null && (
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(it.median)}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-1 text-sm text-muted">{it.ident.name}</p>
                      {it.status === "error" && (
                        <p className="text-xs text-over">{it.error}</p>
                      )}
                    </>
                  ) : (
                    <input
                      value={it.ident.name}
                      onChange={(e) =>
                        update(it.id, { ident: { ...it.ident, name: e.target.value } })
                      }
                      className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-border focus:bg-surface-2"
                    />
                  )}
                </div>

                {it.status === "running" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
                ) : it.status === "done" ? (
                  <Link
                    href={`/item/${it.itemId}`}
                    className="shrink-0 rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-brand"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : it.status === "error" ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-over" />
                ) : (
                  !started && (
                    <button
                      onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:text-over"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                )}
                {it.status === "done" && <Check className="h-5 w-5 shrink-0 text-steal" />}
              </div>
            ))}
          </div>

          {done === included.length && included.length > 0 && started ? (
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90"
            >
              View library <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={priceAll}
              disabled={pricing || remaining === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-2 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pricing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {pricing ? `Pricing ${done}/${included.length}…` : `Price ${remaining} item${remaining === 1 ? "" : "s"}`}
            </button>
          )}
          {pricing && (
            <p className="text-center text-xs text-muted">
              Keep this page open — items are priced one at a time (~20–60s each).
            </p>
          )}
        </>
      )}
    </div>
  );
}
