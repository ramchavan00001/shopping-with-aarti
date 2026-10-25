import { codeFromLookSlug, categoryPath, lookPath } from "../shared/paths";
import { langPath, splitLangPath, translate, type Lang } from "../shared/i18n";
import { site } from "../shared/site";
import { stores } from "../shared/stores";
import type { SiteSettings } from "../shared/settings";
import type { PublicProduct, PublicReel } from "../shared/types";
import type { Repo } from "./repo";
import { esc, withMeta } from "./seo";

// Server-rendered head and a plain-HTML snapshot for every public page, in
// English (/…) and Hindi (/hi/…). Search engines and link previews get the
// page's own title, description, canonical and hreflang links, structured
// data and its real text and links without running any JavaScript. The React
// app replaces the snapshot as soon as it starts. Used by the Node server and
// (for look pages) the Workers preview.

export interface PageContext {
  indexHtml: string;
  url: URL;
  repo: Repo;
  /** Public site address, e.g. https://shopping-with-aarti.onrender.com */
  origin: string;
  settings: SiteSettings;
  mediaBaseUrl?: string;
  /** Share image for a look (the Node server's /og/look/… card). */
  lookImage?: (reel: PublicReel) => string;
  /** Site-wide share image. */
  siteImage?: string;
}

interface Page {
  status: number;
  title: string;
  description: string;
  /** Path without language prefix or query; omitted for pages that shouldn't be indexed. */
  canonical?: string;
  /** Whether a Hindi version exists (policy pages are English only). */
  bilingual?: boolean;
  noindex?: boolean;
  ogType?: string;
  image?: string;
  jsonLd?: object[];
  body?: string;
}

export interface RenderedPage {
  html: string;
  status: number;
  noindex: boolean;
}

/* ---------------------------------------------------------- HTML helpers -- */

const attrs = (a: Record<string, string | undefined>) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${esc(v!)}"`)
    .join("");
const el = (tag: string, a: Record<string, string | undefined>, inner: string) => `<${tag}${attrs(a)}>${inner}</${tag}>`;
const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "");
const json = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");

export function renderPage(ctx: PageContext): RenderedPage {
  const { lang, path } = splitLangPath(ctx.url.pathname.replace(/\/+$/, "") || "/");
  const T = (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
  const page = build(ctx, lang, path, T);
  const abs = (p: string) => `${ctx.origin}${p}`;
  const local = (p: string) => abs(langPath(lang, p));

  const title = page.title.includes(site.name) ? page.title : `${page.title} | ${site.name}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(page.description.slice(0, 300))}" />`,
    page.noindex ? `<meta name="robots" content="noindex, follow" />` : "",
    page.canonical ? `<link rel="canonical" href="${esc(page.bilingual === false ? abs(page.canonical) : local(page.canonical))}" />` : "",
    ...(page.canonical && page.bilingual !== false && !page.noindex
      ? [
          `<link rel="alternate" hreflang="en-IN" href="${esc(abs(page.canonical))}" />`,
          `<link rel="alternate" hreflang="hi-IN" href="${esc(abs(langPath("hi", page.canonical)))}" />`,
          `<link rel="alternate" hreflang="x-default" href="${esc(abs(page.canonical))}" />`,
        ]
      : []),
    `<meta property="og:type" content="${page.ogType ?? "website"}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:locale" content="${lang === "hi" ? "hi_IN" : "en_IN"}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description.slice(0, 300))}" />`,
    `<meta property="og:url" content="${esc(local(page.canonical ?? path))}" />`,
    ...(page.image ?? ctx.siteImage
      ? [`<meta property="og:image" content="${esc(page.image ?? ctx.siteImage!)}" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(page.jsonLd ?? []).map((o) => `<script type="application/ld+json">${json(o)}</script>`),
  ].filter(Boolean);

  let html = withMeta(ctx.indexHtml, tags.join("\n    ")).replace(/<html lang="[^"]*">/, `<html lang="${lang === "hi" ? "hi-IN" : "en-IN"}">`);
  if (page.body) html = html.replace('<div id="root"></div>', `<div id="root"><div class="seo-snapshot">${page.body}</div></div>`);
  return { html, status: page.status, noindex: !!page.noindex };
}

/* ----------------------------------------------------------------- Pages -- */

function build(ctx: PageContext, lang: Lang, path: string, T: (text: string, vars?: Record<string, string | number>) => string): Page {
  const { repo, settings: s, origin } = ctx;
  const opts = { mediaBaseUrl: ctx.mediaBaseUrl };
  const href = (p: string) => langPath(lang, p);
  const abs = (p: string) => `${origin}${href(p)}`;
  const a = (p: string, text: string) => el("a", { href: href(p) }, esc(text));
  const reelLink = (r: PublicReel) => `${a(lookPath(r), r.title)} <small>#${esc(r.code)} · ${esc(T("Shop {n} items", { n: r.products.length }))}</small>`;
  const productLine = (p: PublicProduct, withLook = true) =>
    [
      `<strong>${esc(p.title)}</strong>`,
      esc(stores[p.store].name),
      p.showPrice && p.approxPrice ? `~₹${p.approxPrice.toLocaleString("en-IN")}` : "",
      p.note ? `<em>${esc(p.note)}</em>` : "",
      withLook ? a(lookPath({ code: p.reelCode, slug: repo.getReel(p.reelCode, opts)?.slug ?? "" }), T("Look #{code}", { code: p.reelCode })) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  const categories = repo.allCategories();
  const nav = el(
    "nav",
    { "aria-label": T("Main") },
    list([a("/", T("Home")), a("/reels", T("Shop Reels")), a("/deals", T("Deals")), a("/about", T("About")), ...categories.map((c) => a(categoryPath(c.slug), T(c.name)))]),
  );
  const crumbs = (items: { name: string; path: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  });
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Aarti",
    alternateName: s.instagramHandle,
    url: abs("/about"),
    image: s.aboutPortrait.startsWith("http") ? s.aboutPortrait : `${origin}${s.aboutPortrait}`,
    sameAs: [s.instagramUrl],
    description: T(s.heroIntro),
  };
  const siteDescription = T("Watch Aarti's try-on reels and shop every look from Amazon, Flipkart, Meesho and Myntra in one tap.");

  // Home
  if (path === "/") {
    const home = repo.getHome(opts);
    return {
      status: 200,
      title: `${site.name} · ${T("Tried-on fashion finds")}`,
      description: siteDescription,
      canonical: "/",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: abs("/"),
          inLanguage: lang === "hi" ? "hi-IN" : "en-IN",
          potentialAction: { "@type": "SearchAction", target: `${abs("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
        },
        person,
      ],
      body: [
        nav,
        el("h1", {}, esc(`${T("Real outfits.")} ${T("Real prices.")} ${lang === "hi" ? "मैंने ख़ुद पहनकर देखे।" : "Tried on by me."}`)),
        el("p", {}, esc(T(s.heroIntro))),
        el("h2", {}, esc(T("Latest try-on reels"))),
        list(home.latest.map(reelLink)),
        el("h2", {}, esc(T("Shop by category"))),
        list(home.categories.map((c) => `${a(categoryPath(c.slug), T(c.name))} · ${esc(T(c.blurb))}`)),
        el("h2", {}, esc(T("Trending finds this week"))),
        list(home.trending.map((p) => productLine(p))),
        el("h2", {}, esc(T("How it works"))),
        el("p", {}, esc(T(site.disclosure))),
      ].join(""),
    };
  }

  // Reels feed
  if (path === "/reels") {
    const reels = repo.listReels({}, opts);
    return {
      status: 200,
      title: T("Shop try-on reels"),
      description: T("Every try-on reel by Aarti, with each outfit and accessory linked: Amazon, Flipkart, Meesho and Myntra."),
      canonical: "/reels",
      body: [nav, el("h1", {}, esc(T("Shop try-on reels"))), list(reels.map(reelLink))].join(""),
    };
  }

  // Look
  if (path.startsWith("/look/")) {
    const look = repo.getLook(codeFromLookSlug(path.slice(6)), opts);
    if (!look) return notFound();
    const { reel, similar, category } = look;
    const storeNames = [...new Set(reel.products.map((p) => stores[p.store].name))].join(", ");
    const poster = reel.poster.startsWith("http") ? reel.poster : `${origin}${reel.poster.startsWith("/") ? "" : "/"}${reel.poster}`;
    return {
      status: 200,
      title: `${reel.title} · ${T("Shop the look")} #${reel.code}`,
      description: `${reel.caption} ${T("Shop all {n} items from {stores}.", { n: reel.products.length, stores: storeNames })}`,
      canonical: lookPath(reel),
      ogType: "video.other",
      image: ctx.lookImage?.(reel) ?? poster,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: reel.title,
          description: reel.caption || reel.title,
          thumbnailUrl: [poster],
          uploadDate: reel.publishedAt,
          contentUrl: reel.video,
          url: abs(lookPath(reel)),
        },
        crumbs([{ name: T("Home"), path: "/" }, ...(category ? [{ name: T(category.name), path: categoryPath(category.slug) }] : []), { name: `#${reel.code}`, path: lookPath(reel) }]),
      ],
      body: [
        nav,
        el("h1", {}, esc(reel.title)),
        el("p", {}, esc(reel.caption)),
        el("h2", {}, esc(T("Shop this look"))),
        list(reel.products.map((p) => productLine(p, false))),
        el("p", {}, esc(T(site.disclosure))),
        similar.length ? el("h2", {}, esc(T("Similar looks"))) + list(similar.map(reelLink)) : "",
      ].join(""),
    };
  }

  // Category
  if (path.startsWith("/category/")) {
    const slug = path.slice(10);
    const data = repo.listProducts({ category: slug }, opts);
    if (!data.category) return notFound();
    const c = data.category;
    return {
      status: 200,
      title: T("{name} · Tried-on finds", { name: T(c.name) }),
      description: T("{blurb}. Shop {name} Aarti has tried on, from Amazon, Flipkart, Meesho and Myntra.", { blurb: T(c.blurb), name: T(c.name).toLowerCase() }),
      canonical: categoryPath(slug),
      image: undefined,
      jsonLd: [
        crumbs([{ name: T("Home"), path: "/" }, { name: T(c.name), path: categoryPath(slug) }]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: T(c.name),
          itemListElement: (data.reels ?? []).map((r, i) => ({ "@type": "ListItem", position: i + 1, url: abs(lookPath(r)), name: r.title })),
        },
      ],
      body: [
        nav,
        el("h1", {}, esc(T(c.name))),
        el("p", {}, esc(T("{blurb}. Every piece tried on by Aarti, with honest notes and size tips.", { blurb: T(c.blurb) }))),
        data.reels?.length ? el("h2", {}, esc(T("Watch the try-ons"))) + list(data.reels.map(reelLink)) : "",
        el("h2", {}, esc(T("{n} products", { n: data.total }))),
        list(data.products.map((p) => productLine(p))),
      ].join(""),
    };
  }

  // Deals
  if (path === "/deals") {
    const deals = repo.getDeals(opts);
    const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    const live = deals.events.filter((e) => e.status === "live");
    const upcoming = deals.events.filter((e) => e.status === "upcoming");
    return {
      status: 200,
      title: T("Deals & sale calendar"),
      description: T("Live sales, upcoming sale dates and short-lived loot deals on fashion from Amazon, Flipkart, Meesho and Myntra."),
      canonical: "/deals",
      body: [
        nav,
        el("h1", {}, esc(T("Deals worth waking up for"))),
        el("p", {}, esc(T("Live sales, the dates of upcoming ones, and loot deals I've spotted that won't last long."))),
        live.length ? el("h2", {}, esc(T("Live"))) + list(live.map((e) => `<strong>${esc(e.name)}</strong> · ${esc(stores[e.store].name)} · ${esc(e.headline)}`)) : "",
        deals.loot.length ? el("h2", {}, esc(T("Loot deals ending soon"))) + list(deals.loot.map((d) => `<strong>${esc(d.title)}</strong> · ${esc(stores[d.store].name)}`)) : "",
        upcoming.length
          ? el("h2", {}, esc(T("Upcoming sales"))) + list(upcoming.map((e) => `<strong>${esc(e.name)}</strong> · ${esc(stores[e.store].name)} · ${esc(date(e.startsAt))} – ${esc(date(e.endsAt))}`))
          : "",
      ].join(""),
    };
  }

  // About
  if (path === "/about") {
    return {
      status: 200,
      title: T("About Aarti & brand collaborations"),
      description: T("Meet Aarti, who tries on affordable fashion so you don't have to. Brands can enquire about collaborations here."),
      canonical: "/about",
      ogType: "profile",
      jsonLd: [person],
      body: [
        nav,
        el("h1", {}, esc(lang === "hi" ? "नमस्ते, मैं Aarti हूँ। आपके ख़रीदने से पहले मैं पहनकर देखती हूँ।" : "Hi, I'm Aarti. I try it on before you buy it.")),
        ...s.aboutStory.map((p) => el("p", {}, esc(T(p)))),
        el("h2", {}, esc(T("Reach shoppers who are ready to buy"))),
        list(s.mediaKitStats.map((st) => `${esc(st.value)} ${esc(T(st.label))}`)),
        el("p", {}, `${a("/about#collab", T("Work with me"))} · ${el("a", { href: s.instagramUrl, rel: "me" }, esc(s.instagramHandle))}`),
      ].join(""),
    };
  }

  if (path === "/alerts") {
    return {
      status: 200,
      title: T("Deal alerts"),
      description: T("Get Aarti's loot deals and sale reminders as phone notifications or on WhatsApp."),
      canonical: "/alerts",
      body: [nav, el("h1", {}, esc(T("Deal alerts"))), el("p", {}, esc(T("Get Aarti's loot deals and sale reminders as phone notifications or on WhatsApp.")))].join(""),
    };
  }

  // Policy pages are English only; the Hindi address points Google to them.
  if (path === "/privacy" || path === "/terms") {
    const name = path === "/privacy" ? "Privacy policy" : "Terms of use";
    return { status: 200, title: T(name), description: `${name} for ${site.name}.`, canonical: path, bilingual: false, body: nav };
  }

  // Personal or endless pages: usable, but kept out of search results.
  if (path === "/search") return { status: 200, title: T("Search"), description: T("Search Aarti's try-on reels by reel code, product or category."), noindex: true };
  if (path === "/saved") return { status: 200, title: T("Saved"), description: T("Looks and products you've saved on this device."), noindex: true };
  if (path === "/admin" || path.startsWith("/admin/")) return { status: 200, title: "Admin", description: site.name, noindex: true };

  return notFound();

  function notFound(): Page {
    return { status: 404, title: T("This page went out of stock"), description: siteDescription, noindex: true };
  }
}
