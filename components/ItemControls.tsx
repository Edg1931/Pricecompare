"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2, Check, Pencil, X, Loader2, Bell, BellRing } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MARKETPLACES, marketplaceFee, realizedPnL } from "@/lib/analysis/deal";
import { VoiceInput } from "@/components/VoiceInput";

const FLOW = ["watching", "bought", "listed", "sold"] as const;
const FLOW_LABEL: Record<string, string> = {
  watching: "Watching",
  bought: "Bought",
  listed: "Listed",
  sold: "Sold",
};

function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

interface FlipProps {
  itemId: string;
  status: string | null;
  askingPrice: number | null;
  purchasePrice: number | null;
  soldPrice: number | null;
  soldMarketplace: string | null;
  soldFees: number | null;
  shippingCost: number | null;
  projectedNet: number | null; // best take-home at median
  bestPlatform: string | null;
}

export function FlipTracker(props: FlipProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [boughtOpen, setBoughtOpen] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);

  const [buyPrice, setBuyPrice] = useState(
    String(props.purchasePrice ?? props.askingPrice ?? "")
  );
  const [soldPrice, setSoldPrice] = useState(String(props.soldPrice ?? ""));
  const [marketplace, setMarketplace] = useState(
    props.soldMarketplace ?? props.bestPlatform ?? MARKETPLACES[0]
  );
  const [shipping, setShipping] = useState(String(props.shippingCost ?? ""));
  const [feesInput, setFeesInput] = useState(String(props.soldFees ?? ""));
  const [feesTouched, setFeesTouched] = useState(props.soldFees != null);

  // The fee field shows the marketplace estimate until the user overrides it.
  const estFee = marketplaceFee(marketplace, toNum(soldPrice) ?? 0);
  const feesValue = feesTouched ? feesInput : estFee ? String(estFee) : "";
  const effectiveFee = feesTouched ? toNum(feesInput) : estFee;

  const status = props.status ?? "analyzed";
  const sold = props.soldPrice != null;
  const costBasis = props.purchasePrice ?? props.askingPrice ?? null;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/items/${props.itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setBoughtOpen(false);
    setSoldOpen(false);
    router.refresh();
  }

  function clickStatus(key: string) {
    if (key === "bought") return setBoughtOpen(true);
    if (key === "sold") return setSoldOpen(true);
    patch({ status: key });
  }

  const pnl = realizedPnL({
    purchasePrice: costBasis,
    soldPrice: props.soldPrice,
    soldMarketplace: props.soldMarketplace,
    shippingCost: props.shippingCost,
    feesOverride: props.soldFees,
  });

  const preview = realizedPnL({
    purchasePrice: toNum(buyPrice),
    soldPrice: toNum(soldPrice),
    soldMarketplace: marketplace,
    shippingCost: toNum(shipping),
    feesOverride: effectiveFee,
  });

  return (
    <div className="space-y-3">
      {/* Lifecycle pills */}
      <div className="flex flex-wrap gap-1.5">
        {FLOW.map((key) => {
          const active = status === key;
          return (
            <button
              key={key}
              onClick={() => clickStatus(key)}
              disabled={busy}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                active
                  ? "bg-brand text-white"
                  : "border border-border bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {FLOW_LABEL[key]}
            </button>
          );
        })}
      </div>

      {/* Contextual body */}
      {sold && pnl ? (
        <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-sm">
          <Row label="Sold price" value={formatCurrency(pnl.revenue)} />
          {props.soldMarketplace && (
            <Row label="Marketplace" value={props.soldMarketplace} plain />
          )}
          <Row label="Cost" value={`− ${formatCurrency(pnl.cost)}`} muted />
          <Row label="Platform fees" value={`− ${formatCurrency(pnl.fees)}`} muted />
          <Row label="Shipping" value={`− ${formatCurrency(pnl.shipping)}`} muted />
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span>Profit before tax</span>
            <span className={pnl.net >= 0 ? "" : "text-over"}>
              {formatCurrency(pnl.net)}
            </span>
          </div>
          <Row label="Est. tax set-aside" value={`− ${formatCurrency(pnl.tax)}`} muted />
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>Net after tax</span>
            <span className={pnl.afterTax >= 0 ? "text-steal" : "text-over"}>
              {formatCurrency(pnl.afterTax)}
            </span>
          </div>
          <button
            onClick={() => setSoldOpen(true)}
            className="mt-2 text-xs text-muted underline-offset-2 hover:underline"
          >
            Edit sale details
          </button>
        </div>
      ) : status === "bought" || status === "listed" ? (
        <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-sm">
          <Row
            label="Cost basis"
            value={costBasis != null ? formatCurrency(costBasis) : "—"}
          />
          {props.projectedNet != null && costBasis != null && (
            <Row
              label="Projected profit"
              value={formatCurrency(props.projectedNet - costBasis)}
              muted
            />
          )}
          <button
            onClick={() => setSoldOpen(true)}
            className="mt-2 w-full rounded-lg bg-gradient-to-br from-brand to-brand-2 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Mark as sold
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Mark this <span className="font-medium">Bought</span> when you buy it to
          track cost and profit.
        </p>
      )}

      {/* Bought modal */}
      {boughtOpen && (
        <Modal title="Mark as bought" onClose={() => setBoughtOpen(false)}>
          <MoneyField label="What did you pay?" value={buyPrice} onChange={setBuyPrice} autoFocus />
          <ModalActions
            busy={busy}
            onSave={() =>
              patch({ status: "bought", purchasePrice: toNum(buyPrice) })
            }
          />
        </Modal>
      )}

      {/* Sold modal */}
      {soldOpen && (
        <Modal title="Record the sale" onClose={() => setSoldOpen(false)}>
          <MoneyField label="Sold price" value={soldPrice} onChange={setSoldPrice} autoFocus />
          <MoneyField label="Your cost (what you paid)" value={buyPrice} onChange={setBuyPrice} />
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Marketplace</span>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {MARKETPLACES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <div>
            <MoneyField
              label="Platform fees"
              value={feesValue}
              onChange={(v) => {
                setFeesTouched(true);
                setFeesInput(v);
              }}
            />
            {feesTouched && (
              <button
                onClick={() => setFeesTouched(false)}
                className="mt-1 text-[11px] text-muted underline-offset-2 hover:underline"
              >
                Reset to estimate ({formatCurrency(estFee)})
              </button>
            )}
          </div>
          <MoneyField label="Shipping you paid" value={shipping} onChange={setShipping} />

          {preview && (
            <div className="rounded-lg bg-surface-2/60 p-3 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>Fees</span>
                <span>− {formatCurrency(preview.fees)}</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Est. tax set-aside</span>
                <span>− {formatCurrency(preview.tax)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                <span>Net after tax</span>
                <span className={preview.afterTax >= 0 ? "text-steal" : "text-over"}>
                  {formatCurrency(preview.afterTax)}
                </span>
              </div>
            </div>
          )}

          <ModalActions
            busy={busy}
            saveLabel="Save sale"
            onSave={() =>
              patch({
                status: "sold",
                soldPrice: toNum(soldPrice),
                purchasePrice: toNum(buyPrice),
                soldMarketplace: marketplace,
                soldFees: effectiveFee,
                shippingCost: toNum(shipping),
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  plain,
}: {
  label: string;
  value: string;
  muted?: boolean;
  plain?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted">{label}</span>
      <span className={plain ? "" : `tabular-nums ${muted ? "text-muted" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Portal to <body> so the fixed overlay isn't trapped inside an ancestor
  // that creates a containing block (e.g. a card using backdrop-blur).
  // This component only renders after a click, so document is always defined.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function MoneyField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-border bg-surface-2 px-3">
        <span className="text-muted">$</span>
        <input
          autoFocus={autoFocus}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-2 text-sm outline-none"
          placeholder="0"
        />
      </div>
    </label>
  );
}

function ModalActions({
  busy,
  onSave,
  saveLabel = "Save",
}: {
  busy: boolean;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <button
      onClick={onSave}
      disabled={busy}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {saveLabel}
    </button>
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
      <div className="mt-2 flex items-center justify-between">
        <VoiceInput
          onResult={(text) =>
            setValue((prev) => (prev.trim() ? `${prev} ${text}` : text))
          }
        />
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

export function AlertControl({
  itemId,
  alertTarget,
  alertDirection,
  triggered,
}: {
  itemId: string;
  alertTarget: number | null;
  alertDirection: string | null;
  triggered: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState(alertDirection ?? "below");
  const [target, setTarget] = useState(alertTarget != null ? String(alertTarget) : "");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  const active = alertTarget != null;

  if (active && !editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {triggered ? (
          <BellRing className="h-4 w-4 text-steal" />
        ) : (
          <Bell className="h-4 w-4 text-muted" />
        )}
        <span className={triggered ? "font-medium text-steal" : ""}>
          {triggered ? "Target hit — " : "Alerting "}
          when est. price {alertDirection === "above" ? "≥" : "≤"}{" "}
          {formatCurrency(alertTarget)}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="ml-auto text-xs text-muted underline-offset-2 hover:underline"
        >
          Edit
        </button>
        <button
          onClick={() => patch({ alertTarget: null, alertDirection: null })}
          disabled={busy}
          className="text-xs text-muted underline-offset-2 hover:text-over hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  if (!active && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-brand"
      >
        <Bell className="h-4 w-4" /> Set a price alert
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Alert when est. price</span>
      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 outline-none focus:border-brand"
      >
        <option value="below">drops below</option>
        <option value="above">rises above</option>
      </select>
      <div className="flex items-center rounded-lg border border-border bg-surface-2 px-2">
        <span className="text-muted">$</span>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-20 bg-transparent px-1 py-1.5 outline-none"
          placeholder="0"
        />
      </div>
      <button
        onClick={() =>
          patch({ alertTarget: target.trim() ? Number(target) : null, alertDirection: direction })
        }
        disabled={busy || !target.trim()}
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StorageEditor({
  itemId,
  initial,
}: {
  itemId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = value !== (initial ?? "");

  async function save() {
    setSaving(true);
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageLocation: value.trim() || null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && save()}
        placeholder="e.g. Bin A3, Shelf 2"
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-brand"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

export function DismissAlertButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissAlert: true }),
        });
        router.refresh();
      }}
      disabled={busy}
      className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-fg disabled:opacity-50"
    >
      {busy ? "…" : "Dismiss"}
    </button>
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
