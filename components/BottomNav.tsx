"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BarChart3, ScanLine, Wallet, Bell } from "lucide-react";

export function BottomNav({ alertCount }: { alertCount: number }) {
  const path = usePathname();
  if (path.startsWith("/login")) return null;

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const tab = (
    href: string,
    label: string,
    Icon: typeof LayoutGrid,
    badge?: number
  ) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
          active ? "text-brand" : "text-muted"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {label}
        {badge ? (
          <span className="absolute right-1/2 top-1 translate-x-3 rounded-full bg-steal px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tab("/", "Library", LayoutGrid)}
        {tab("/dashboard", "Stats", BarChart3)}
        <Link
          href="/scan"
          className="flex flex-1 flex-col items-center"
          aria-label="Scan"
        >
          <span className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-xl shadow-brand/40 ring-4 ring-bg">
            <ScanLine className="h-6 w-6" strokeWidth={2.4} />
          </span>
        </Link>
        {tab("/inventory", "Inventory", Wallet)}
        {tab("/alerts", "Alerts", Bell, alertCount)}
      </div>
    </nav>
  );
}
