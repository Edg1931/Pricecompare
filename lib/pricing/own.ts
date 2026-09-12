import { prisma } from "@/lib/db";
import type { ItemIdentification, RawComp } from "@/lib/types";

// Words too generic to signal that two listings are the same product.
const STOP_WORDS = new Set([
  "the", "and", "with", "for", "new", "used", "vintage", "set", "lot",
  "size", "series", "edition", "original", "authentic", "genuine",
]);

/** Lowercased, de-noised tokens that actually identify a product. Short
 * tokens are kept when they carry a digit — "R5", "PS5", "13" are often the
 * only thing separating product variants. */
export function significantTokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(
        (t) =>
          (t.length > 2 || (t.length === 2 && /\d/.test(t))) &&
          !STOP_WORDS.has(t)
      )
  );
}

/**
 * 0..1 overlap between two listing names, measured against the shorter one
 * so "Apple Watch Ultra" fully contained in "Apple Watch Ultra 49mm GPS
 * Titanium" scores 1. Conflicting model identifiers are disqualifying:
 * "Canon EOS R5" vs "Canon EOS R6" is 0, not a near-match — pricing one
 * variant off another's sale is exactly the error this must prevent.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const modelsA = [...ta].filter((t) => /\d/.test(t));
  const modelsB = [...tb].filter((t) => /\d/.test(t));
  if (
    modelsA.length > 0 &&
    modelsB.length > 0 &&
    !modelsA.some((t) => tb.has(t))
  ) {
    return 0;
  }
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

/**
 * Comp memory: the user's own recorded sales of similar items, as comps.
 * A price you actually realized is the most trustworthy comp that can
 * exist — it reflects your photos, your condition grading, your market.
 * Only sales from the last 12 months count (prices drift), and matches
 * need a strong name/brand overlap so a sold "Vintage Radio" never prices
 * a "Vintage Lamp".
 */
export async function ownSoldComps(
  userId: string | null,
  ident: ItemIdentification,
  excludeItemId?: string
): Promise<RawComp[]> {
  const descriptor = [ident.brand, ident.name, ident.model]
    .filter(Boolean)
    .join(" ");
  const tokens = [...significantTokens(descriptor)];
  if (tokens.length === 0) return [];

  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  try {
    const candidates = await prisma.item.findMany({
      where: {
        // Same scoping rule as everywhere else: open-mode rows have null userId.
        userId: userId ?? null,
        soldPrice: { not: null },
        soldAt: { gte: yearAgo },
        ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
        OR: tokens.slice(0, 4).map((t) => ({
          name: { contains: t, mode: "insensitive" as const },
        })),
      },
      orderBy: { soldAt: "desc" },
      take: 25,
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        condition: true,
        soldPrice: true,
        soldAt: true,
        soldMarketplace: true,
      },
    });

    return candidates
      .map((it) => ({
        it,
        score: nameSimilarity(
          descriptor,
          [it.brand, it.name, it.model].filter(Boolean).join(" ")
        ),
      }))
      .filter(({ score }) => score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(
        ({ it }): RawComp => ({
          source: "own",
          title: `Your sale: ${it.name}${
            it.soldMarketplace ? ` (${it.soldMarketplace})` : ""
          }`.slice(0, 200),
          price: it.soldPrice!,
          currency: "USD",
          url: `/item/${it.id}`,
          imageUrl: null,
          condition: it.condition,
          listingType: "sold",
        })
      );
  } catch (err) {
    console.error("Own-sales comp lookup failed:", err);
    return [];
  }
}
