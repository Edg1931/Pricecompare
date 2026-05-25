import { Settings as SettingsIcon } from "lucide-react";
import { currentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";

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
    </div>
  );
}
