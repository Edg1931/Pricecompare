import { ExternalLink } from "lucide-react";

/**
 * Deep links into live marketplace searches for this item. Individual comp
 * links can go stale as listings end; these always land on fresh, live
 * results — including eBay's sold/completed filter, the ground truth for
 * resale value.
 */
export function MarketLinks({ query }: { query: string }) {
  const q = encodeURIComponent(query);
  const links: { label: string; href: string; highlight?: boolean }[] = [
    {
      label: "eBay sold",
      href: `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      highlight: true,
    },
    { label: "eBay active", href: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    { label: "Mercari", href: `https://www.mercari.com/search/?keyword=${q}` },
    { label: "Poshmark", href: `https://poshmark.com/search?query=${q}` },
    {
      label: "Facebook",
      href: `https://www.facebook.com/marketplace/search/?query=${q}`,
    },
    {
      label: "Google Shopping",
      href: `https://www.google.com/search?tbm=shop&q=${q}`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        Check live prices
      </span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
            l.highlight
              ? "bg-steal/10 text-steal border border-steal/30 hover:bg-steal/20"
              : "border border-border bg-surface-2 text-muted hover:text-fg hover:border-brand"
          }`}
        >
          {l.label}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}
