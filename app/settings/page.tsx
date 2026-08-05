import { Settings as SettingsIcon } from "lucide-react";
import { currentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { DataSourcesCard } from "@/components/DataSourcesCard";
import { hasEbay } from "@/lib/pricing/ebay";
import { hasGoogle } from "@/lib/pricing/google";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await currentUserId();
  const settings = await getSettings(userId);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <SettingsIcon className="h-6 w-6 text-brand" /> Settings
      </h1>
      <p className="text-sm text-muted">
        These tune the profit math to your situation — used across the sold
        breakdown, inventory totals, and tax report.
      </p>
      <SettingsForm initial={settings} />
      <DataSourcesCard
        sources={[
          {
            label: "AI identification & web research",
            configured: Boolean(process.env.ANTHROPIC_API_KEY),
            detail:
              "Identifies items from photos and researches sold prices across marketplaces. Requires ANTHROPIC_API_KEY (and account credits).",
          },
          {
            label: "eBay live listings (official API)",
            configured: hasEbay(),
            detail:
              "Real active-listing prices with direct links, plus live verification of researched eBay links. Requires EBAY_CLIENT_ID / EBAY_CLIENT_SECRET.",
          },
          {
            label: "Google Shopping",
            configured: hasGoogle(),
            detail:
              "Retail price comps with links via Google Programmable Search. Requires GOOGLE_CSE_KEY / GOOGLE_CSE_ID.",
          },
          {
            label: "Price-drop alert emails",
            configured: Boolean(process.env.RESEND_API_KEY),
            detail: "Emails you when a watched item hits its target. Requires RESEND_API_KEY.",
          },
          {
            label: "Scheduled re-checks",
            configured: Boolean(process.env.CRON_SECRET),
            detail:
              "Daily automatic repricing of watched items (9am UTC). Requires CRON_SECRET.",
          },
        ]}
      />
    </div>
  );
}
