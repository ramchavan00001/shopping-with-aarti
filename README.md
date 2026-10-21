# Shopping with Aarti

Shoppable reels website for [@shopping.with.aartii](https://www.instagram.com/shopping.with.aartii/).
Followers watch Aarti's try-on reels and buy every item from Amazon, Flipkart,
Meesho and Myntra in one tap.

**Stack:** React 19, Vite, Tailwind CSS v4, Motion, and a [Hono](https://hono.dev) API.
The same API code runs on **Render (Node)** and **Cloudflare Workers**.

## What's built so far

- **Home page:** hero with a live reel preview and "find by reel code" search, store
  strip, latest reels carousel (previews on hover), categories, budget picks, trending
  products, how it works, and an about/Instagram/WhatsApp section. Supports light and
  dark mode.
- **Reels feed (`/reels`):** full-screen vertical swipe feed like Instagram. Autoplays
  the reel on screen and loads only the neighbouring videos. Includes mute, save
  (stored in the browser), share, and a "Shop this look" bottom sheet you can drag to
  close. On desktop there's a product side panel and keyboard controls (↑ ↓ M).
- **Deep links:** `/reels?start=A112`, `?category=ethnic`, `?store=meesho`,
  `?maxPrice=499`, `?q=kurti`, `?saved=1`.
- **Click tracking:** every buy button goes to `/go/:productId`, which logs the click
  and redirects (302) to the affiliate link. Affiliate URLs are never sent to the
  browser.
- **Compliance:** affiliate disclosure, `rel="sponsored"` on outbound links, and no
  copied prices shown for Amazon products (Associates rule).

## Project layout

```
shared/      catalogue data, types, store definitions, site config (used by API and UI)
server/
  app.ts     Hono API: /api/health, /api/home, /api/reels, /api/reels/:code, /go/:id
  repo.ts    data access (swap for a database later without touching routes)
  node.ts    Render / Node entry: serves dist/ + API
  worker.ts  Cloudflare Workers entry (static files served by Workers Assets)
src/         React app (pages/Home.tsx, pages/Reels.tsx, components/)
```

## Local development

```bash
npm install
npm run dev          # http://localhost:5173 (Vite + API in one process)
npm run typecheck
```

## Deploy on Render

Option 1: **New → Blueprint** and select this repo. `render.yaml` sets everything up.

Option 2: **New → Web Service** with:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

To test the production build locally: `npm run build && npm start` (port 3000).

## Deploy on Cloudflare (Workers + Static Assets)

```bash
npx wrangler login
npm run deploy:cf    # builds the client and runs wrangler deploy
```

Or connect the repo in **Cloudflare dashboard → Workers & Pages → Create → Import
a repository**, with build command `npm run build:client` and deploy command
`npx wrangler deploy`.

To test locally against the real Workers runtime: `npm run preview:cf` (port 8787).

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `MEDIA_BASE_URL` | Render env var / `wrangler.jsonc` `vars` | Public URL of the R2 bucket holding reel videos and posters. Catalogue entries with relative paths (`reels/a113.mp4`) are resolved against it. |
| `PORT` | Render (automatic) | Node server port |

## Adding Aarti's real content

1. Create a Cloudflare R2 bucket (for example `aarti-media`), turn on public access or
   connect a custom domain (for example `media.shopwithaarti.in`), and set
   `MEDIA_BASE_URL`.
2. Export each reel from Instagram or the editing app as 720×1280 MP4 (H.264, roughly
   2–4 Mbps), plus a JPG poster. Upload as `reels/<code>.mp4` and `reels/<code>.jpg`.
3. Add the reel and its products to `shared/catalog.ts`. Use the same code (`A113`) in
   the Instagram caption: "Shop this look → link in bio, code A113".
4. Replace the placeholder numbers, photos and links in `shared/site.ts`.

> The demo videos are free [Mixkit](https://mixkit.co) stock clips and the photos are
> from [Unsplash](https://unsplash.com). They're placeholders only: replace them before
> launch. The demo affiliate links are plain store search URLs.

## Next phases

- **Admin panel:** add reels and products, auto-detect the store from a pasted link
  (`detectStore()` in `shared/stores.ts` is ready), and upload to R2.
- **Database:** Postgres (Neon/Supabase), which works from both Render and Workers.
  Store reels, products and the `clicks` table, then build an analytics dashboard.
- **Look pages** (`/look/:slug`) with SEO metadata and Open Graph images, plus a
  sitemap.
- **Other features:** nightly broken-link checker, Deals page, WhatsApp signup, brand
  collaboration page, and PWA.
