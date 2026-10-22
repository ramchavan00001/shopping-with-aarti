# Shopping with Aarti

Shoppable reels website for [@shopping.with.aartii](https://www.instagram.com/shopping.with.aartii/).
Followers watch Aarti's try-on reels and buy every item from Amazon, Flipkart,
Meesho and Myntra in one tap.

**Stack:** React 19, Vite, Tailwind CSS v4, Motion, and a [Hono](https://hono.dev) API.
The same API code runs on **Render (Node)** and **Cloudflare Workers**.

## What's built so far

| Page | URL | Highlights |
|---|---|---|
| Home | `/` | Hero with live reel preview and instant search, stores, latest reels, categories, budget picks, trending, how it works, about |
| Reels feed | `/reels` | Full-screen vertical feed, autoplay, save/share/mute, "Shop this look" drawer, desktop product panel, keyboard controls |
| Look page | `/look/a112-white-summer-dress-under-999` | Video, every product, share to WhatsApp/copy link, tags, similar looks. **Server-rendered meta tags** so links shared on WhatsApp/Instagram/Google show the reel's title and poster |
| Category | `/category/dresses` | Banner, category switcher, try-on reels strip, filters (store, price, occasion, colour), sort, mobile filter sheet; filters live in the URL |
| Search | `/search?q=kurti` | Instant results while typing (looks, products, categories); header search shows a live dropdown. Understands reel codes, spelling variants (kurta/kurti, sari/saree, jhumka/earrings) and "under 500" |
| Deals | `/deals` | Featured live sale with countdown, other live sales, loot deals with expiry timers and copyable coupons, upcoming sale calendar, WhatsApp CTA |
| About | `/about` | Story, promises, brand media kit, collaboration formats, FAQ, and a validated **brand enquiry form** |

Also included:

- **Click tracking:** every buy, deal and sale button goes to `/go/:id`, which logs the
  click and redirects (302) to the affiliate link. Affiliate URLs are never sent to the
  browser.
- **Saved looks:** stored in the browser, no login needed (`/reels?saved=1`).
- **SEO:** `/sitemap.xml` lists every page, category and look.
- **Compliance:** affiliate disclosure, `rel="sponsored"` on outbound links, and no
  copied prices shown for Amazon products or deals (Associates rule).

## Project layout

```
shared/      catalogue data, types, store definitions, site config (used by API and UI)
server/
  app.ts     Hono API: /api/{home,reels,looks,products,search,deals,enquiries}, /go/:id, /sitemap.xml
  repo.ts    data access and search ranking (swap for a database later without touching routes)
  seo.ts     injects per-look meta tags into index.html
  node.ts    Render / Node entry: serves dist/ + API + look pages
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
| `ENQUIRY_WEBHOOK_URL` | Render env var / `npx wrangler secret put ENQUIRY_WEBHOOK_URL` | Optional. Brand enquiries are POSTed here as JSON (Google Apps Script, Zapier, Make…). Without it they only appear in the server logs. |
| `PORT` | Render (automatic) | Node server port |

## Adding Aarti's real content

1. Create a Cloudflare R2 bucket (for example `aarti-media`), turn on public access or
   connect a custom domain (for example `media.shopwithaarti.in`), and set
   `MEDIA_BASE_URL`.
2. Export each reel from Instagram or the editing app as 720×1280 MP4 (H.264, roughly
   2–4 Mbps), plus a JPG poster. Upload as `reels/<code>.mp4` and `reels/<code>.jpg`.
3. Add the reel and its products to `shared/catalog.ts`. Use the same code (`A113`) in
   the Instagram caption: "Shop this look → link in bio, code A113".
4. Give each product a `colour` and `occasions` so category filters work.
5. Update `saleEvents` and `lootDeals` in `shared/catalog.ts` each sale season. Expired
   deals hide themselves automatically.
6. Replace the placeholder numbers, photos, story and links in `shared/site.ts` and
   `src/pages/About.tsx` (media kit stats come from Instagram Insights).

> The demo videos are free [Mixkit](https://mixkit.co) stock clips and the photos are
> from [Unsplash](https://unsplash.com). They're placeholders only: replace them before
> launch. The demo affiliate links are plain store search URLs.

## Next phases

- **Admin panel:** add reels and products, auto-detect the store from a pasted link
  (`detectStore()` in `shared/stores.ts` is ready), and upload to R2.
- **Database:** Postgres (Neon/Supabase), which works from both Render and Workers.
  Store reels, products and the `clicks` table, then build an analytics dashboard.
- **Other features:** nightly broken-link checker, product-level wishlist, price-drop
  alerts, and PWA.
