# Reseller — Snap. Price. Profit.

Photograph any object and instantly see what it resells for across eBay, Etsy, Mercari,
Facebook Marketplace, Swappa, Poshmark and StockX. Enter the asking price and the app
scores how good a deal it is, tells you the best platform to sell on after fees, generates
a ready-to-post listing, and saves everything to a searchable library.

Built as a **PWA** (installable on phone, desktop, and the browser of AR glasses like the
Inmo Air 3). All logic lives in backend API routes so any future client — including a
glasses app — can reuse the same endpoints.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, installable as a PWA
- **Claude (Anthropic)** — vision identifies the item from photos; web search researches
  resale prices and writes the listing
- **eBay Browse API** — accurate comparable listings (optional but recommended)
- **Supabase** — Postgres (items/photos/comps via Prisma) + Storage (uploaded photos)

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **pooled** connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | yes | Supabase **direct** connection (port 5432) for migrations |
| `SUPABASE_URL` | yes* | `https://PROJECT.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes* | Server-only secret for photo uploads |
| `SUPABASE_BUCKET` | no | Defaults to `item-photos` (create as a **public** bucket) |
| `ANTHROPIC_API_KEY` | yes | Vision + research. https://console.anthropic.com |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-4-6` |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | no | Free dev account at https://developer.ebay.com. Without these, pricing falls back to Claude web search only. |

\* If Supabase Storage isn't configured, photos fall back to the local `public/uploads`
folder (fine for local dev, but won't work on Vercel).

## Local development

```bash
npm install
cp .env.example .env        # fill in Supabase + Anthropic values
npm run db:push             # create tables in your Supabase Postgres
npm run dev                 # http://localhost:3000
```

## Deploy to Vercel (mobile-ready, HTTPS for camera)

1. **Supabase** — create a free project. Then:
   - Project Settings → Database → copy the **pooled** and **direct** connection strings
     into `DATABASE_URL` and `DIRECT_URL`.
   - Storage → create a **public** bucket named `item-photos`.
   - Project Settings → API → copy the URL and the **service_role** key.
   - Run `npm run db:push` once (locally, with your `.env` filled in) to create the tables.
2. **Vercel** — import the GitHub repo. Add all env vars above in Project → Settings →
   Environment Variables. Deploy.
3. **On your phone** — open the Vercel HTTPS URL. The scan screen opens the camera
   directly; use the browser's "Add to Home Screen" to install it as an app. The same URL
   also works in the Inmo Air 3 browser.

> The analyze endpoint runs Claude vision + web research and can take ~40–60s. `maxDuration`
> is set to 60s (Vercel's free-tier ceiling). If you hit timeouts, lower `web_search` uses in
> `lib/ai/research.ts` or upgrade the Vercel plan.

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
