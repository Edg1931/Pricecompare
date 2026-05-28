"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { EXPENSE_TYPES, EXPENSE_LABEL, MILEAGE_RATE } from "@/lib/expenses";
import { VoiceInput } from "@/components/VoiceInput";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseForm({ mileageRate = MILEAGE_RATE }: { mileageRate?: number }) {
  const router = useRouter();
  const [type, setType] = useState<string>("supplies");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [miles, setMiles] = useState("");
  const [saving, setSaving] = useState(false);

  const isMileage = type === "mileage";

  async function add() {
    setSaving(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        date,
        description: description.trim() || null,
        amount: isMileage ? null : Number(amount) || 0,
        miles: isMileage ? Number(miles) || 0 : null,
      }),
    });
    setSaving(false);
    setDescription("");
    setAmount("");
    setMiles("");
    router.refresh();
  }

  const valid = isMileage ? Number(miles) > 0 : Number(amount) > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <h2 className="mb-3 font-semibold">Add expense</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {EXPENSE_TYPES.map((t) => (
            <option key={t} value={t}>
              {EXPENSE_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {isMileage ? (
          <label className="flex items-center rounded-lg border border-border bg-surface-2 px-3">
            <input
              type="number"
              inputMode="decimal"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              placeholder="miles"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
            <span className="text-xs text-muted">mi</span>
          </label>
        ) : (
          <div className="flex items-center rounded-lg border border-border bg-surface-2 px-3">
            <span className="text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="amount"
              className="w-full bg-transparent px-1 py-2 text-sm outline-none"
            />
          </div>
        )}
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="note"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <VoiceInput
            onResult={(t) => setDescription((p) => (p.trim() ? `${p} ${t}` : t))}
          />
        </div>
      </div>
      {isMileage && (
        <p className="mt-2 text-xs text-muted">
          Mileage is valued at ${mileageRate.toFixed(2)}/mi (set in Settings).
        </p>
      )}
      <button
        onClick={add}
        disabled={saving || !valid}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </button>
    </div>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      disabled={busy}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:text-over disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

export function TaxReportButton({
  lines,
}: {
  lines: { label: string; amount: number }[];
}) {
  function download() {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = lines.map((l) =>
      [esc(l.label), (Math.round(l.amount * 100) / 100).toFixed(2)].join(",")
    );
    const csv = ["Line item,Amount", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-fg"
    >
      <FileSpreadsheet className="h-4 w-4" /> Tax report
    </button>
  );
}
