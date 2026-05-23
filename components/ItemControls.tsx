"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Check, Pencil, X, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { STATUS_OPTIONS, statusMeta } from "@/lib/display";

export function StatusControl({
  itemId,
  initial,
}: {
  itemId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial ?? "analyzed");
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    setStatus(next);
    setSaving(true);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted">Status</span>
      <select
        value={status}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium outline-none focus:border-brand"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {statusMeta(s).label}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
    </div>
  );
}

export function NotesEditor({
  itemId,
  initial,
}: {
  itemId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = value !== (initial ?? "");

  async function save() {
    setSaving(true);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value.trim() === "" ? null : value }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Private notes — buy price, where you found it, condition details…"
        className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:text-brand disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 text-steal" />
          ) : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save notes"}
        </button>
      </div>
    </div>
  );
}

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

type EditableItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  searchQuery: string | null;
};

const FIELDS: { key: keyof Omit<EditableItem, "id">; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition" },
  { key: "searchQuery", label: "Search query" },
];

export function EditDetailsButton({ item }: { item: EditableItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<null | "save" | "reprice">(null);
  const [form, setForm] = useState({
    name: item.name ?? "",
    brand: item.brand ?? "",
    model: item.model ?? "",
    category: item.category ?? "",
    condition: item.condition ?? "",
    searchQuery: item.searchQuery ?? "",
  });

  async function save(reprice: boolean) {
    setSaving(reprice ? "reprice" : "save");
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim() || item.name,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        category: form.category.trim() || null,
        condition: form.condition.trim() || null,
        searchQuery: form.searchQuery.trim() || null,
      }),
    });
    if (res.ok && reprice) {
      await fetch(`/api/items/${item.id}/reanalyze`, { method: "POST" });
    }
    setSaving(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:text-brand"
      >
        <Pencil className="h-4 w-4" /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Edit item details</h3>
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {label}
                  </span>
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted">
              Correcting the brand, model, or search query and re-pricing usually
              improves accuracy.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => save(false)}
                disabled={saving !== null}
                className="flex-1 rounded-lg border border-border bg-surface-2 py-2.5 text-sm font-medium transition hover:text-brand disabled:opacity-60"
              >
                {saving === "save" ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving !== null}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving === "reprice" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Re-pricing…
                  </>
                ) : (
                  "Save & re-price"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
