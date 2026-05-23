import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ScanLine, LayoutGrid, Images, Wallet } from "lucide-react";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <LayoutGrid className="h-4 w-4" /> Library
              </Link>
              <Link
                href="/batch"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Images className="h-4 w-4" /> Bulk
              </Link>
              <Link
                href="/inventory"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface hover:text-fg"
              >
                <Wallet className="h-4 w-4" /> Inventory
              </Link>
              <Link
                href="/scan"
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-3.5 py-1.5 font-medium text-white shadow-lg shadow-brand/30 transition hover:opacity-90"
              >
                <ScanLine className="h-4 w-4" /> Scan
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
