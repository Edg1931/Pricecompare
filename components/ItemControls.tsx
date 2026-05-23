"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Check, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function AskingPriceEditor({
  itemId,
  initial,
}: {
  itemId: string;
  initial: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const parsed = value.trim() === "" ? null : Number(value);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ askingPrice: parsed }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-2xl font-bold tabular-nums transition hover:text-brand"
      >
        {initial !== null ? formatCurrency(initial) : "Add price"}
        <Pencil className="h-4 w-4 text-muted" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border bg-surface-2 px-2">
        <span className="text-muted">$</span>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-24 bg-transparent px-1 py-1.5 text-lg font-semibold outline-none"
          placeholder="0"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ItemActions({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reanalyzing, setReanalyzing] = useState(false);

  async function reanalyze() {
    setReanalyzing(true);
    await fetch(`/api/items/${itemId}/reanalyze`, { method: "POST" });
    setReanalyzing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    startTransition(() => router.push("/"));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={reanalyze}
        disabled={reanalyzing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:text-brand disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${reanalyzing ? "animate-spin" : ""}`} />
        {reanalyzing ? "Re-pricing…" : "Re-analyze"}
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-over disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </div>
  );
}
