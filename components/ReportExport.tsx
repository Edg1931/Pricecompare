"use client";

import { FileSpreadsheet } from "lucide-react";

export interface PnlRow {
  name: string;
  status: string;
  marketplace: string | null;
  cost: number | null;
  soldPrice: number | null;
  fees: number | null;
  shipping: number | null;
  net: number | null;
  soldAt: string;
}

export interface PnlTotals {
  revenue: number;
  cost: number;
  fees: number;
  shipping: number;
  net: number;
}

const esc = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const money = (v: number | null) => (v == null ? "" : (Math.round(v * 100) / 100).toFixed(2));

export function PnlExportButton({
  rows,
  totals,
}: {
  rows: PnlRow[];
  totals: PnlTotals;
}) {
  function download() {
    const headers = [
      "Item",
      "Status",
      "Marketplace",
      "Cost",
      "Sold price",
      "Fees",
      "Shipping",
      "Net P&L",
      "Sold date",
    ];
    const body = rows.map((r) =>
      [
        r.name,
        r.status,
        r.marketplace,
        money(r.cost),
        money(r.soldPrice),
        money(r.fees),
        money(r.shipping),
        money(r.net),
        r.soldAt,
      ]
        .map(esc)
        .join(",")
    );
    const totalRow = [
      "TOTAL (sold)",
      "",
      "",
      money(totals.cost),
      money(totals.revenue),
      money(totals.fees),
      money(totals.shipping),
      money(totals.net),
      "",
    ]
      .map(esc)
      .join(",");
    const csv = [headers.join(","), ...body, "", totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-fg"
    >
      <FileSpreadsheet className="h-4 w-4" /> Export P&amp;L report
    </button>
  );
}
