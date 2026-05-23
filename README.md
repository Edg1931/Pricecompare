# Reseller — Snap. Price. Profit.

Photograph any object and instantly see what it resells for across eBay, Etsy, Mercari,
Facebook Marketplace, Swappa, Poshmark and StockX. Enter the asking price and the app
scores how good a deal it is, tells you the best platform to sell on after fees, generates
a ready-to-post listing, and saves everything to a searchable library.

Built as a **PWA** (installable on phone, desktop, and the browser of AR glasses like the
Inmo Air 3). All logic lives in backend API routes so any future client — including a
glasses app — can reuse the same endpoints.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**
- **Claude (Anthropic)** — vision identifies the item from photos; web search researches
  resale prices and writes the listing
- **eBay Browse API** — accurate comparable listings (optional but recommended)
- **Prisma + SQLite** — stores items, photos, and price comps (swap to Postgres in one line)

## Setup

```bash
npm install
cp .env.example .env        # then fill in your keys
npm run db:push             # create the SQLite database
npm run dev                 # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Vision + research. https://console.anthropic.com |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-4-6` |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | no | Free dev account at https://developer.ebay.com. Without these, pricing falls back to Claude web search only. |
| `DATABASE_URL` | yes | Defaults to `file:./dev.db` |

## How it works

1. **Scan** (`/scan`) — capture/upload up to 8 photos, optionally add an asking price + hint.
2. **Identify** — Claude vision returns a structured identification (brand, model, condition,
   attributes, optimized search query, confidence).
3. **Price** — eBay Browse API + Claude web search run in parallel; comps are merged, outliers
   rejected (1.5×IQR), and summarized into a low/median/high range with a confidence score.
4. **Analyze** — deal score + verdict (Steal / Good / Fair / Overpriced), fee-aware net
   proceeds per platform, best-platform recommendation, and estimated profit.
5. **Store** — item, photos, and comps saved; browse them in the library (`/`).

## Key files

```
app/
  page.tsx                 Library + stats
  scan/page.tsx            Capture & analyze flow
  item/[id]/page.tsx       Result / detail view
  api/items/...            Create, read, update, delete, re-analyze
lib/
  ai/vision.ts             Claude vision -> identification
  ai/research.ts           Claude web search -> comps
  ai/listing.ts            Claude -> listing title + description
  pricing/ebay.ts          eBay OAuth + Browse search
  pricing/aggregate.ts     Outlier rejection + confidence
  analysis/deal.ts         Deal score, fees, best platform
  analysis/pipeline.ts     Orchestrates the full analysis
  item.ts                  Persist + serialize items
```

## Roadmap (toward smart glasses)

- Offline capture queue (snap now, analyze when connected)
- Voice / hands-free "glance" view (big-text minimal layout)
- Bulk scan mode for estate/garage sales; barcode fast-path
- Price-history tracking & re-check alerts
- Marketplace Insights (eBay sold data) once approved
