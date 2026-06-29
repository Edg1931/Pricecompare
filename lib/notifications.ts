import { createClient } from "@supabase/supabase-js";

async function getUserEmail(userId: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await client.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

function buildAlertHtml(params: {
  itemName: string;
  median: number;
  target: number;
  direction: string;
  itemId: string;
  siteUrl: string;
}): string {
  const { itemName, median, target, direction, itemId, siteUrl } = params;
  const verb = direction === "above" ? "risen to" : "dropped to";
  const label = direction === "above" ? "above" : "below";
  const formattedMedian = `$${median.toFixed(2)}`;
  const formattedTarget = `$${target.toFixed(2)}`;
  const link = siteUrl ? `${siteUrl}/item/${itemId}` : `/item/${itemId}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 12px">Price alert triggered 🔔</h2>
  <p style="margin:0 0 8px">
    <strong>${itemName}</strong> has <strong>${verb} ${formattedMedian}</strong> on the resale market —
    ${label} your target of <strong>${formattedTarget}</strong>.
  </p>
  <p style="margin:16px 0">
    <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
      View item
    </a>
  </p>
  <p style="font-size:12px;color:#888;margin:24px 0 0">
    You can dismiss this alert or update your target from the item page.
  </p>
</body>
</html>`;
}

/**
 * Send a price-alert email via Resend (https://resend.com).
 * Requires RESEND_API_KEY. Silently no-ops if unconfigured or auth is disabled.
 */
export async function sendAlertEmail(params: {
  userId: string | null;
  itemName: string;
  itemId: string;
  median: number;
  target: number;
  direction: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !params.userId) return;

  const email = await getUserEmail(params.userId);
  if (!email) return;

  const siteUrl = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "")
  ).replace(/\/$/, "");

  const from =
    process.env.RESEND_FROM ?? "Pricecompare <alerts@pricecompare.app>";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Price alert: "${params.itemName}" hit your target`,
      html: buildAlertHtml({ ...params, siteUrl }),
    }),
  }).catch((err) => console.error("Alert email failed:", err));
}
