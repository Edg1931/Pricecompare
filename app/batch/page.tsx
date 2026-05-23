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
} from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { formatCurrency, readJson } from "@/lib/utils";
import { VerdictBadge } from "@/components/ui";
import type { Verdict } from "@/lib/types";

type JobStatus = "pending" | "running" | "done" | "error";

interface Job {
  id: number;
  src: string;
  status: JobStatus;
  itemId?: string;
  name?: string;
  verdict?: string | null;
  median?: number | null;
  error?: string;
}

export default function BatchPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setJobs((prev) => [
      ...prev,
      ...urls.map((src) => ({ id: nextId.current++, src, status: "pending" as JobStatus })),
    ]);
  }

  function update(id: number, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function start() {
    if (running) return;
    setRunning(true);
    const todo = jobs.filter((j) => j.status !== "done");
    for (const job of todo) {
      update(job.id, { status: "running", error: undefined });
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [job.src], askingPrice: null }),
        });
        const data = await readJson(res);

        let name: string | undefined;
        let verdict: string | null = null;
        let median: number | null = null;
        try {
          const r2 = await fetch(`/api/items/${data.id}`);
          if (r2.ok) {
            const d2 = await r2.json();
            name = d2.item?.name;
            verdict = d2.item?.verdict ?? null;
            median = d2.item?.recommendedMedian ?? null;
          }
        } catch {
          // detail fetch is best-effort; the item was still created
        }
        update(job.id, {
          status: "done",
          itemId: data.id as string,
          name,
          verdict,
          median,
        });
      } catch (err) {
        update(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }
    setRunning(false);
  }

  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "done").length;
  const errors = jobs.filter((j) => j.status === "error").length;
  const remaining = jobs.filter((j) => j.status !== "done").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk price</h1>
        <p className="text-sm text-muted">
          Upload a batch of photos from your gallery — each photo becomes its own
          item and gets priced one after another. Great for walking a house or
          estate sale and pricing everything later.
        </p>
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

      {jobs.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface py-12 font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          <ImagePlus className="h-8 w-8" />
          Choose photos from your gallery
          <span className="text-xs font-normal">One photo per item</span>
        </button>
      ) : (
        <>
          {/* Progress */}
          <div className="rounded-2xl border border-border bg-surface/70 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                {running
                  ? `Pricing… ${done}/${total}`
                  : done === total
                    ? `Done — ${done} priced`
                    : `${total} photo${total === 1 ? "" : "s"} ready`}
              </span>
              {errors > 0 && (
                <span className="text-xs text-over">{errors} failed</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Job list */}
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.src}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  {job.status === "done" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <VerdictBadge verdict={job.verdict as Verdict | null} />
                        {job.median != null && (
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(job.median)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                        {job.name ?? "Item created"}
                      </p>
                    </>
                  ) : job.status === "error" ? (
                    <p className="line-clamp-2 text-sm text-over">{job.error}</p>
                  ) : job.status === "running" ? (
                    <p className="text-sm text-brand">Pricing…</p>
                  ) : (
                    <p className="text-sm text-muted">Waiting…</p>
                  )}
                </div>

                {/* Trailing control */}
                {job.status === "running" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
                ) : job.status === "done" ? (
                  <Link
                    href={`/item/${job.itemId}`}
                    className="shrink-0 rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-brand"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : job.status === "error" ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-over" />
                ) : (
                  <button
                    onClick={() =>
                      setJobs((prev) => prev.filter((j) => j.id !== job.id))
                    }
                    disabled={running}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:text-over disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {job.status === "done" && (
                  <Check className="h-5 w-5 shrink-0 text-steal" />
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={running}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 font-medium transition hover:border-brand disabled:opacity-40"
            >
              <ImagePlus className="h-5 w-5" /> Add more
            </button>
            {done === total && total > 0 ? (
              <Link
                href="/"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-4 py-3 font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-90"
              >
                View library <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={start}
                disabled={running || remaining === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-4 py-3 font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {running
                  ? `Pricing ${done}/${total}…`
                  : errors > 0
                    ? `Price remaining (${remaining})`
                    : `Price all (${remaining})`}
              </button>
            )}
          </div>
          {running && (
            <p className="text-center text-xs text-muted">
              Keep this page open — items are priced one at a time (~20–60s each).
            </p>
          )}
        </>
      )}
    </div>
  );
}
