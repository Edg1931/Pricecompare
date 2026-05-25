import { prisma } from "@/lib/db";

export interface ResellerSettings {
  taxRate: number;
  mileageRate: number;
  defaultMarketplace: string | null;
}

export const DEFAULT_SETTINGS: ResellerSettings = {
  taxRate: 0.25,
  mileageRate: 0.7,
  defaultMarketplace: null,
};

// Open mode (no auth) shares one settings row under this key.
function key(userId: string | null): string {
  return userId ?? "__default__";
}

export async function getSettings(userId: string | null): Promise<ResellerSettings> {
  const row = await prisma.userSettings
    .findUnique({ where: { userId: key(userId) } })
    .catch(() => null);
  if (!row) return DEFAULT_SETTINGS;
  return {
    taxRate: row.taxRate,
    mileageRate: row.mileageRate,
    defaultMarketplace: row.defaultMarketplace,
  };
}

export async function saveSettings(
  userId: string | null,
  data: Partial<ResellerSettings>
): Promise<void> {
  const k = key(userId);
  await prisma.userSettings.upsert({
    where: { userId: k },
    create: { userId: k, ...DEFAULT_SETTINGS, ...data },
    update: data,
  });
}
