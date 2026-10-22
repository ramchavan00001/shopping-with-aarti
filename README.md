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
- **SEO:** `/sitemap.xml`, per-look titles/descriptions/Open Graph images.
- **Compliance:** affiliate disclosure, `rel="sponsored"`, no copied Amazon prices.

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
- **Phase 3:** shopper login to sync saved items across devices, price-drop alerts, PWA.
