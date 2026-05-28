import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ScanLine, LayoutGrid, Images, Wallet, Layers, Bell, BarChart3, LogOut, Settings } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser, ownerWhere } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reseller — Snap. Price. Profit.",
  description:
    "Photograph anything and instantly see what it resells for across eBay, Etsy, Mercari, Facebook Marketplace and more.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Reseller" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const alertCount = await prisma.item
    .count({ where: { alertTriggeredAt: { not: null }, ...ownerWhere(user?.id ?? null) } })
    .catch(() => 0);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/30">
                <ScanLine className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              <span className="text-[15px]">Reseller</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <LayoutGrid className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Library</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <BarChart3 className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/batch"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Images className="h-4 w-4" /> <span className="hidden sm:inline">Bulk</span>
              </Link>
              <Link
                href="/lot"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Lot</span>
              </Link>
              <Link
                href="/inventory"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Wallet className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Inventory</span>
              </Link>
              <Link
                href="/alerts"
                className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-steal px-1 text-[10px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </Link>
              <Link
                href="/scan"
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-3.5 py-1.5 font-medium text-white shadow-lg shadow-brand/30 transition hover:opacity-90"
              >
                <ScanLine className="h-4 w-4" /> Scan
              </Link>
              </div>
              <Link
                href="/settings"
                title="Settings"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Settings className="h-4 w-4" />
              </Link>
              {user && (
                <form action="/auth/signout" method="post" className="ml-1">
                  <button
                    type="submit"
                    title={`Sign out${user.email ? ` (${user.email})` : ""}`}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:pb-6">
          {children}
        </main>
        <BottomNav alertCount={alertCount} />
      </body>
    </html>
  );
}
