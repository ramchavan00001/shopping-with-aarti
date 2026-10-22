# Shopping with Aarti

Shoppable reels website for [@shopping.with.aartii](https://www.instagram.com/shopping.with.aartii/).
Followers watch Aarti's try-on reels and buy every item from Amazon, Flipkart,
Meesho and Myntra in one tap. Aarti manages everything from an admin panel.

**Stack:** React 19, Vite, Tailwind CSS v4, Motion, a [Hono](https://hono.dev) API,
PostgreSQL with [Drizzle ORM](https://orm.drizzle.team). Hosted on **Render**.

## What's built (phase 1)

| Page | URL | Highlights |
|---|---|---|
| Home | `/` | Hero with live reel preview and instant search, stores, latest reels, categories, budget picks, trending (by real clicks), about |
| Reels feed | `/reels` | Full-screen vertical feed, autoplay, save/share/mute, "Shop this look" drawer, desktop product panel |
| Look page | `/look/a112-white-summer-dress-under-999` | Video, every product, WhatsApp share, similar looks. Server-rendered meta tags for link previews |
| Category | `/category/dresses` | Filters (store, price, occasion, colour), sort, try-on reels strip |
| Search | `/search?q=kurti` | Instant results; understands reel codes, spelling variants and "under 500" |
| Deals | `/deals` | Live sales with countdowns, loot deals, sale calendar |
| About | `/about` | Story, media kit for brands, brand enquiry form |
| **Admin** | `/admin` | Password login; dashboard with click stats; add/edit reels and products; deals and sale calendar; categories; brand enquiries inbox |

Behind the scenes:

- **Click tracking:** every buy, deal and sale button goes to `/go/:id`, which
  records the click in the database and redirects to the affiliate link. Affiliate
  URLs never reach the browser. Link-preview bots are ignored.
- **Database:** PostgreSQL. Migrations run automatically on start; an empty
  database is filled with the demo catalogue on first boot (`SEED_DEMO`).
- **SEO:** `/sitemap.xml`, per-look titles/descriptions/Open Graph images.
- **Compliance:** affiliate disclosure, `rel="sponsored"`, no copied Amazon prices.

## Deploy on Render

1. In Render: **New → Blueprint**, connect GitHub, pick this repository.
2. Render reads `render.yaml` and shows a **PostgreSQL database** and a **web
   service**. Enter an `ADMIN_PASSWORD` (long and unique). Leave the R2 and webhook
   fields empty for now.
3. Click **Apply**. The first build takes a few minutes. When it's live, open
   `https://<your-service>.onrender.com`, then `/admin` to log in.

Every push to `main` redeploys automatically. Database migrations run on start.

> **Free plan limits (Render's rules):** a free database **expires 30 days after
> creation** and is deleted 14 days later unless upgraded, and a free web service
> **sleeps after 15 idle minutes** (the next visitor waits about a minute). Free is
> fine for testing; before sharing the site publicly, upgrade the database to a paid
> plan and the web service to a paid instance in the Render dashboard.

**Custom domain:** Render dashboard → web service → Settings → Custom Domains
(e.g. `shopwithaarti.in`), then add the DNS records it shows at your domain registrar.

## Managing content (admin panel)

Log in at `/admin` with `ADMIN_PASSWORD`.

- **Reels & products → Add reel:** paste (or upload) the video and cover, write the
  title and caption, then add each product. Paste the affiliate link first: the store
  is detected automatically. Set colour and occasions so category filters work. The
  reel code (e.g. `A113`) goes in the Instagram caption so followers can find the look.
- **Hide a reel** with "Show on site" instead of deleting it; **feature** a reel to put
  it in the home page hero.
- **Deals & sales:** add sale dates (shown with countdowns) and short-lived loot deals,
  which hide themselves when they expire.
- **Enquiries:** brand enquiries from the About page, with reply/archive.
- **Dashboard:** clicks per day, by store, most-clicked products and reels.

The demo reels (stock videos and search links) are there so the site isn't empty.
Delete them from the admin panel as real reels go in, or set `SEED_DEMO=false`
before the very first deploy to start empty.

### Uploading videos and photos (Cloudflare R2, optional)

Without R2 you paste media URLs. To upload directly from the admin panel:

1. Cloudflare dashboard → R2 → create a bucket (e.g. `aarti-media`).
2. Bucket → Settings → **Public access**: connect a custom domain (e.g.
   `media.shopwithaarti.in`) or enable the r2.dev URL. That URL is `MEDIA_BASE_URL`.
3. Bucket → Settings → **CORS policy**: allow `PUT` from your site's origin, with
   the `Content-Type` header:
   ```json
   [{ "AllowedOrigins": ["https://shopwithaarti.in", "https://<your-service>.onrender.com"],
      "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
4. R2 → **Manage API tokens** → create a token with Object Read & Write on the bucket.
5. In Render, set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET` and `MEDIA_BASE_URL`, then redeploy. "Upload" buttons appear in the admin.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes (Render sets it from the Blueprint) | PostgreSQL connection string. Without it the site runs read-only on the demo catalogue |
| `ADMIN_PASSWORD` | Yes, for `/admin` | Admin login password |
| `SESSION_SECRET` | Recommended (Blueprint generates it) | Signs admin login cookies |
| `SEED_DEMO` | No (default `true`) | Fill an empty database with demo content on first boot |
| `MEDIA_BASE_URL` | For uploads | Public URL of the R2 bucket; relative media paths resolve against it |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | For uploads | Cloudflare R2 credentials |
| `ENQUIRY_WEBHOOK_URL` | No | Also POST brand enquiries as JSON to this URL |
| `PORT` | No | Render sets it |

Site copy that isn't in the admin panel yet (follower numbers, WhatsApp channel link,
email, About-page story and media kit) lives in `shared/site.ts` and
`src/pages/About.tsx`.

## Local development

```bash
npm install
cp .env.example .env     # set DATABASE_URL to a local Postgres, or remove it to use demo data
npm run dev              # http://localhost:5173 (site + API + /admin in one process)
npm run typecheck
```

Database commands:

```bash
npm run db:migrate       # apply migrations
npm run db:seed          # migrate + add demo data if the database is empty
npm run db:generate      # after editing server/db/schema.ts: create a new migration in drizzle/
npm run db:studio        # browse the database
```

Production build locally: `npm run build && npm start` (port 3000).

## Project layout

```
shared/          types, demo catalogue, store list, admin/enquiry validation (used by API and UI)
server/
  app.ts         public API: /api/{home,reels,looks,products,search,deals,enquiries}, /go/:id, /sitemap.xml
  admin-api.ts   /api/admin/*: login, stats, reels, categories, events, deals, enquiries, uploads
  repo.ts        catalogue queries and search ranking
  data/          data sources: db.ts (PostgreSQL), demo.ts (read-only demo catalogue)
  db/            Drizzle schema, migrations runner, demo seeding
  auth.ts        admin session cookie, CSRF and login rate limiting
  uploads.ts     signed direct-to-R2 upload URLs
  node.ts        Render / Node entry
  worker.ts      Cloudflare Workers entry (read-only preview, no database)
drizzle/         SQL migrations (committed)
src/             React site; src/admin/ is the admin panel
```

## Cloudflare (optional preview)

`npm run deploy:cf` deploys a read-only copy to Cloudflare Workers using the demo
catalogue. The database and admin panel only run on the Render (Node) deployment.

## Roadmap

- **Phase 2:** broken-link checker, Instagram auto-sync, WhatsApp channel signup,
  editable site settings (stats, links) in the admin panel, deeper analytics.
- **Phase 3:** product-level wishlist with login, price-drop alerts, PWA.
