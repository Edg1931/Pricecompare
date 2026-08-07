"use client";

import { Printer } from "lucide-react";

export function PrintLabelButton({
  qrDataUrl,
  sku,
  name,
  price,
  location,
}: {
  qrDataUrl: string;
  sku: string;
  name: string;
  price: string;
  location: string | null;
}) {
  function print() {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!doctype html><html><head><title>${esc(sku)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 16px; }
        .label { width: 2.6in; border: 1px solid #ccc; border-radius: 8px; padding: 12px; text-align: center; }
        .label img { width: 150px; height: 150px; }
        .sku { font-weight: 700; font-size: 14px; letter-spacing: 0.04em; margin-top: 6px; }
        .name { font-size: 12px; margin-top: 4px; }
        .meta { font-size: 12px; color: #444; margin-top: 4px; }
        @media print { body { padding: 0; } .label { border: none; } }
      </style></head><body>
      <div class="label">
        <img src="${qrDataUrl}" alt="QR" />
        <div class="sku">${esc(sku)}</div>
        <div class="name">${esc(name)}</div>
        <div class="meta">${esc(price)}${location ? " &middot; " + esc(location) : ""}</div>
      </div>
      </body></html>`;

    const w = window.open("", "_blank", "width=420,height=520");
    if (w) {
      w.document.write(html + `<script>window.onload = function(){ window.print(); }</script>`);
      w.document.close();
      return;
    }

    // Popup blocked (default on mobile Safari — the primary device): print
    // from a hidden same-page iframe instead of silently doing nothing.
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      document.body.removeChild(frame);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      // Give the print dialog time to grab the content before cleanup.
      setTimeout(() => document.body.removeChild(frame), 60_000);
    };
  }

  return (
    <button
      onClick={print}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-brand"
    >
      <Printer className="h-4 w-4" /> Print label
    </button>
  );
}
