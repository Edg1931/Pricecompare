"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { MARKETPLACES } from "@/lib/analysis/deal";
import { sendJson, errorMessage } from "@/lib/utils";

export function SettingsForm({
  initial,
}: {
  initial: { taxRate: number; mileageRate: number; defaultMarketplace: string | null };
}) {
  const router = useRouter();
  const [taxPct, setTaxPct] = useState(String(Math.round(initial.taxRate * 100)));
  const [mileage, setMileage] = useState(String(initial.mileageRate));
  const [marketplace, setMarketplace] = useState(initial.defaultMarketplace ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await sendJson("/api/settings", "POST", {
        taxRate: Math.max(0, Math.min(95, Number(taxPct) || 0)) / 100,
        mileageRate: Number(mileage) || 0,
        defaultMarketplace: marketplace || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface/70 p-5">
      <label className="block">
        <span className="text-sm font-medium">Tax set-aside rate</span>
        <p className="mb-1 text-xs text-muted">
          Estimated % of profit to set aside for taxes. Applied as a line in your P&amp;L.
        </p>
        <div className="flex w-32 items-center rounded-lg border border-border bg-surface-2 px-3">
          <input
            type="number"
            inputMode="decimal"
            value={taxPct}
            onChange={(e) => setTaxPct(e.target.value)}
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
          <span className="text-muted">%</span>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Mileage rate</span>
        <p className="mb-1 text-xs text-muted">
          Dollar value per mile for mileage expenses (IRS standard is ~$0.70).
        </p>
        <div className="flex w-32 items-center rounded-lg border border-border bg-surface-2 px-3">
          <span className="text-muted">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="w-full bg-transparent px-1 py-2 text-sm outline-none"
          />
          <span className="text-xs text-muted">/mi</span>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Default marketplace</span>
        <p className="mb-1 text-xs text-muted">Pre-selected when you record a sale.</p>
        <select
          value={marketplace}
          onChange={(e) => setMarketplace(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">No default</option>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4" />
        ) : null}
        {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
      </button>
      {error && (
        <p className="rounded-lg border border-over/40 bg-over/10 px-3 py-2 text-xs text-over">
          {error}
        </p>
      )}
    </div>
  );
}
