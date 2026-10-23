# Shopping with Aarti

Shoppable reels website for [@shopping.with.aartii](https://www.instagram.com/shopping.with.aartii/).
Followers watch Aarti's try-on reels and buy every item from Amazon, Flipkart,
Meesho and Myntra in one tap. Aarti manages everything from an admin panel.

**Stack:** React 19, Vite, Tailwind CSS v4, Motion, a [Hono](https://hono.dev) API,
PostgreSQL ([Neon](https://neon.tech)) with [Drizzle ORM](https://orm.drizzle.team). Hosted on **Render**.

## What's built (phase 1)

| Page | URL | Highlights |
|---|---|---|
| Home | `/` | Hero with live reel preview and instant search, stores, latest reels, categories, budget picks, trending (by real clicks), about |
| Reels feed | `/reels` | Full-screen vertical feed, autoplay, save/share/mute, "Shop this look" drawer, desktop product panel |
| Saved | `/saved` | Saved looks and products (hearts across the site), stored in the browser; no login |
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
- **SEO:** `/sitemap.xml`, `/robots.txt`, per-look titles/descriptions, and generated
  share images (`/og/site.png`, `/og/look/a113.png`) for WhatsApp/Instagram/Google previews.
- **Compliance:** affiliate disclosure, `rel="sponsored"`, no copied Amazon prices.

## Phase 2: monitoring, alerts and automation

| Feature | Where | What it does |
|---|---|---|
| Broken-link checker | Admin → Link health | Checks every buy, deal and sale link daily. 404/410 = broken (alert sent); 403/503 from big stores = "store blocked check" (open it yourself) |
| WhatsApp deal alerts | `/alerts`, Deals page, Admin → WhatsApp alerts | Join-the-channel button plus a sign-up form (name, number, interests, consent). Export as CSV or message from the admin |
| Share images + Search Console | `/og/*`, `GOOGLE_SITE_VERIFICATION` | Branded 1200×630 preview cards per look; Google verification tag |
| Error alerts + uptime | Admin → System | Server and browser errors are grouped and listed; Telegram (or webhook) alerts at most once an hour per problem; background jobs with "Run now" |
| Instagram auto-sync | Admin → Instagram sync | New reels are copied (video + cover into R2) as hidden drafts every 6 hours; add products, then publish |

Background jobs run inside the web service every 10 minutes (link check daily,
Instagram every 6 hours). On Render's free plan the service sleeps when idle, so set
up UptimeRobot (below) to keep it awake, or call `/api/cron?key=<CRON_SECRET>` from
any scheduler.

### Phone alerts (Telegram)

1. In Telegram, open **@BotFather**, send `/newbot`, pick a name, copy the **bot token**.
2. Open your new bot and send it any message.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the number after `"chat":{"id":`.
4. Render → Environment: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Redeploy, then
   Admin → System → **Send test alert**.

(Alternatively `ALERT_WEBHOOK_URL`: a Discord/Slack-style webhook receiving `{content, text}`.)

### Uptime monitoring (UptimeRobot, free)

[uptimerobot.com](https://uptimerobot.com) → **New monitor** → HTTP(s) →
`https://shopping-with-aarti.onrender.com/api/health` → every 5 minutes.

### Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console) →
   **Add property** → **URL prefix** → the site URL.
2. Choose **HTML tag**, copy only the `content="…"` value into Render as
   `GOOGLE_SITE_VERIFICATION`, redeploy, then click **Verify**.
3. **Sitemaps** → submit `sitemap.xml`.

### Instagram auto-sync

Needs R2 uploads (above). Instagram's API requires a Meta app:

1. Aarti's Instagram must be a **Professional** (Creator or Business) account.
2. [developers.facebook.com](https://developers.facebook.com) → **Create app** → use case
   **Manage messaging & content on Instagram** → **API setup with Instagram login**.
3. Under **Generate access tokens**, add the Instagram account and generate a token
   (`instagram_business_basic` permission).
4. Paste it in Admin → Instagram sync → **Connect**. The token renews itself weekly.

The first sync only marks the starting point; reels posted after that are imported.
Older reels can be imported one by one from the grid on that page.

## Phase 3: app, notifications, speed and Hindi

| Feature | Where | What it does |
|---|---|---|
| Install as an app (PWA) | Banner on phones, `/alerts`, Deals page | Adds Aarti's icon to the home screen; opens full-screen; pages, images and data seen before still open offline. One tap on Android Chrome, step-by-step help on iPhone and inside Instagram's browser |
| Push notifications | `/alerts`, Deals page, Admin → **Notifications** | Followers turn on deal notifications; Aarti sends them from the admin (ready-made text for the newest reel, live sales and loot deals), tests on her own phone first, and sees deliveries and taps. Optional Hindi version per message |
| Faster images | everywhere | `/img?w=…&src=…` resizes photos to WebP for each screen size (cached), so phones download a fraction of the original |
| Hindi version | **EN / हि** button in the header | Every menu, button and message in Hindi, with Devanagari fonts. Search understands Hindi words ("लाल कुर्ती", "500 से कम"). Aarti's own titles and captions stay as she writes them; policy pages stay in English |

Nothing to set up: the push keys are created automatically on first use and kept in
the database (or set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`; never change them later,
it would cancel every subscription). On iPhone, notifications work only after the site
is added to the home screen (iOS 16.4+). Translations live in `src/lib/hi.ts`; the app
icons are generated by `npx tsx scripts/icons.ts`.

## Deploy (Render + Neon)

The site runs on **Render**; the database is **Neon** (serverless Postgres; the free
plan doesn't expire).

### 1. Create the database on Neon

1. Sign up at [neon.tech](https://neon.tech) (GitHub or Google login works).
2. **Create project**: name `shopping-with-aarti`, Postgres version as suggested,
   region **AWS Asia Pacific (Singapore)** (or the region closest to your Render
   service). Database name `neondb` is fine.
3. On the project dashboard click **Connect**, keep the defaults (branch
   `production`/`main`, database `neondb`, role `neondb_owner`, connection pooling
   on) and copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:npg_xxxx@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   Keep it secret: it contains the database password.

You don't need to create tables: the app does that on start.

### 2. Configure the Render web service

Render dashboard → **shopping-with-aarti** → **Environment** → add:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string |
| `ADMIN_PASSWORD` | a long, unique password for `/admin` |
| `SESSION_SECRET` | any long random string (use Render's **Generate** button) |
| `SEED_DEMO` | `true` to start with the demo catalogue, `false` to start empty |
| `NODE_VERSION` | `22` |

Build command `npm ci && npm run build`, start command `npm start`, health check
path `/api/health`. **Save, rebuild and deploy.** On start the app creates the tables
in Neon and (with `SEED_DEMO=true`) adds the demo content.

Check `https://<your-service>.onrender.com/api/health`: it should say
`"data":"database"`. Then log in at `/admin`.

Every push to `main` redeploys automatically.

> **Free plan notes:** Render's free web service **sleeps after 15 idle minutes**
> (the next visitor waits about a minute); upgrade the instance before sharing the
> site widely. Neon's free plan pauses the database after 5 idle minutes and wakes it
> in under a second; it includes 1 GB of storage per project, plenty for this site.

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
- **Site settings:** Instagram/WhatsApp links, email, home page intro and numbers,
  hero/About/"Meet Aarti" photos, About story, media kit. Empty WhatsApp link or email
  hides those buttons. **Remove demo content** (same page) deletes the starter reels,
  sales and deals in one go; demo reels that now use her own video are kept.
- **Dashboard:** visitors, reel plays, look-page views and buy clicks per day; where
  visitors come from (Instagram, WhatsApp, Google, direct…) and how many of them click;
  per-reel performance (plays → clicks); most-clicked products; clicks by store.

### How visits and clicks are counted

- **Visit:** someone opens the site (once per browser tab session), labelled with its
  source: `?utm_source=` on the link, else the referring site, else Instagram/Facebook's
  in-app browser, else "direct". Use `https://<site>/?utm_source=instagram` as the bio
  link and `?utm_source=whatsapp` when sharing on WhatsApp.
- **Reel play:** a reel watched for 3 seconds (or 80% of a shorter reel), once per reel
  per visit. **Look view:** a look page opened.
- **Buy click:** a tap on a buy/deal/sale button, recorded by `/go/:id` with the source.
- **Not counted:** robots and link-preview bots, and anyone logged in to `/admin`.
- **Privacy:** no cookies or IDs on shoppers, no IP addresses stored. Unique visitors are
  a SHA-256 hash of date + IP + browser + server secret, so they change daily and can't
  be traced back to a person.

The demo reels (stock videos and search links) are there so the site isn't empty.
Delete them from the admin panel as real reels go in, or set `SEED_DEMO=false`
before the very first deploy to start empty.

### Uploading videos and photos (Cloudflare R2)

Without R2 you paste media URLs. With it, the admin shows "Upload" buttons; files go
straight from the browser to R2, and a reel uploaded without a cover gets one
automatically (a frame from the video).

1. Cloudflare dashboard → **R2 object storage** → **Create bucket**, name
   `aarti-media`, location **Automatic** (leave jurisdiction unset).
2. Bucket → **Settings** → public access:
   - **Custom Domains → Add** (recommended): e.g. `media.shopwithaarti.in`. The domain
     must be added to the same Cloudflare account.
   - or **Public Development URL → Enable** (`https://pub-….r2.dev`). Cloudflare
     rate-limits this one and says it's for development only.

   That public URL is `MEDIA_BASE_URL`. Uploads are saved as paths (e.g.
   `reels/2026-10/look.mp4`), so switching from r2.dev to a custom domain later only
   means changing `MEDIA_BASE_URL`; nothing has to be re-uploaded.
3. Bucket → **Settings** → **CORS Policy → Add CORS policy** → JSON tab:
   ```json
   [
     {
       "AllowedOrigins": ["https://shopping-with-aarti.onrender.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Add your custom site domain to `AllowedOrigins` too once you have one (no trailing slash).
4. R2 **Overview** → **API Tokens: Manage** → **Create Account API token**, permission
   **Object Read & Write**, applied to the `aarti-media` bucket only. Copy the
   **Access Key ID** and **Secret Access Key** (shown once). The **Account ID** is on
   the R2 Overview page.
5. In Render → Environment, set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `MEDIA_BASE_URL`, then redeploy.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon). Without it the site runs read-only on the demo catalogue |
| `ADMIN_PASSWORD` | Yes, for `/admin` | Admin login password |
| `SESSION_SECRET` | Recommended | Signs admin login cookies; without it, admins are logged out on every restart |
| `SEED_DEMO` | No (default `true`) | Fill an empty database with demo content on first boot |
| `MEDIA_BASE_URL` | For uploads | Public URL of the R2 bucket; relative media paths resolve against it |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | For uploads | Cloudflare R2 credentials |
| `R2_JURISDICTION` | No | Only if the bucket was created in a jurisdiction (`eu` or `fedramp`) |
| `ENQUIRY_WEBHOOK_URL` | No | Also POST brand enquiries as JSON to this URL |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Recommended | Error, job and broken-link alerts to Telegram |
| `ALERT_WEBHOOK_URL` | No | Same alerts as JSON to a webhook |
| `GOOGLE_SITE_VERIFICATION` | No | Google Search Console HTML-tag value |
| `SITE_URL` | No | Public address (e.g. a custom domain) for share links and the sitemap; defaults to Render's URL |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | No | Push notification keys; created automatically when not set |
| `CRON_SECRET` | No | Enables `/api/cron?key=…` to run due background jobs from an outside scheduler |
| `PORT` | No | Render sets it |

Defaults for site settings live in `shared/settings.ts`; values saved in
Admin → Site settings override them. Privacy policy and terms are at `/privacy` and
`/terms` (`src/pages/Privacy.tsx`, `src/pages/Terms.tsx`): plain-language templates,
worth a quick review by someone familiar with Indian law before relying on them.

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
  ops/           background jobs, link checker, alerts, error log, subscribers, Instagram sync
  og.ts          share-image generation (satori + resvg)
  images.ts      image resizing for /img (sharp)
  node.ts        Render / Node entry
  worker.ts      Cloudflare Workers entry (read-only preview, no database)
drizzle/         SQL migrations (committed)
src/             React site; src/admin/ is the admin panel
```

## Cloudflare (optional preview)

`npm run deploy:cf` deploys a read-only copy to Cloudflare Workers using the demo
catalogue. The database and admin panel only run on the Render (Node) deployment.

## Roadmap

- **Phase 2 (done):** analytics, site settings, broken-link checker, WhatsApp alerts,
  share images, error alerts, Instagram auto-sync.
- **Phase 3 (done):** install as an app, push notifications, faster images, Hindi.
- **Later:** shopper login (saved items across devices), team accounts, price-drop and back-in-stock alerts.
