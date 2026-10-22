import { motion } from "motion/react";
import { ArrowUpRight, BellRing, CalendarDays, Check, Copy, Flame, Timer, Zap } from "lucide-react";
import { useState } from "react";
import type { DealsPayload, PublicLootDeal, PublicSaleEvent } from "@shared/types";
import { site } from "@shared/site";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { cn, discountPct, formatPrice } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { CountdownBlocks, CountdownText, useNow } from "@/components/Countdown";
import { WhatsAppIcon } from "@/components/icons";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreBadge } from "@/components/StoreBadge";

const dateRange = (a: string, b: string) => {
  const f = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${f(a)} – ${f(b)}`;
};

export default function Deals() {
  const { data, error } = useApi<DealsPayload>("/api/deals");
  const now = useNow();
  usePageMeta("Deals & sale calendar", "Live sales, upcoming sale dates and short-lived loot deals on fashion from Amazon, Flipkart, Meesho and Myntra.");

  // Re-derive status on the client so cards flip from upcoming to live without a reload.
  const events = (data?.events ?? []).map((e) => ({
    ...e,
    status: now < Date.parse(e.startsAt) ? "upcoming" : now > Date.parse(e.endsAt) ? "ended" : "live",
  })) as PublicSaleEvent[];
  const live = events.filter((e) => e.status === "live");
  const upcoming = events.filter((e) => e.status === "upcoming");
  const loot = (data?.loot ?? []).filter((d) => Date.parse(d.expiresAt) > now);
  const [featured, ...otherLive] = live;

  return (
    <div className="pb-8">
      <section className="container-page pt-8 sm:pt-12">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
          <Flame className="size-3.5" /> Updated daily by Aarti
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Deals worth waking up for
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Live sales, the dates of upcoming ones, and loot deals I've spotted that won't last long.
        </p>
      </section>

      {error && <p className="container-page mt-8 text-sm text-muted">Couldn't load deals right now. Please refresh.</p>}

      {!data && !error && (
        <div className="container-page mt-8 grid gap-4">
          <div className="h-72 animate-pulse rounded-[2rem] bg-surface-2" />
        </div>
      )}

      {featured && <FeaturedSale event={featured} />}

      {otherLive.length > 0 && (
        <section className="container-page mt-6 grid gap-4 md:grid-cols-2">
          {otherLive.map((e) => <LiveSaleCard key={e.id} event={e} />)}
        </section>
      )}

      {loot.length > 0 && (
        <section className="container-page pt-16">
          <SectionHeading eyebrow="Hurry" title="Loot deals ending soon" />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {loot.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.05 }}>
                <LootCard deal={d} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="container-page pt-16">
          <SectionHeading eyebrow="Mark your calendar" title="Upcoming sales" />
          <ol className="relative space-y-4 border-l-2 border-dashed border-line pl-6 sm:pl-8">
            {upcoming.map((e) => <UpcomingRow key={e.id} event={e} />)}
          </ol>
        </section>
      )}

      <section className="container-page pt-16">
        <div className="flex flex-col items-start gap-5 rounded-[2rem] bg-[#0B3D22] px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Never miss a loot deal</h2>
            <p className="mt-1 text-sm text-white/75">I post price drops on WhatsApp the minute I find them. No spam, just deals.</p>
          </div>
          <a href={site.whatsappChannelUrl} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#073B1D] transition hover:brightness-105">
            <WhatsAppIcon className="size-4" /> Join the WhatsApp channel
          </a>
        </div>
      </section>
    </div>
  );
}

function storeGradient(store: PublicSaleEvent["store"]) {
  const c = stores[store].color;
  return { background: `radial-gradient(120% 140% at 0% 0%, ${c} 0%, color-mix(in oklab, ${c} 55%, #120A0E) 70%)` };
}

function FeaturedSale({ event }: { event: PublicSaleEvent }) {
  return (
    <section className="container-page mt-8">
      <div className="relative overflow-hidden rounded-[2rem] px-6 py-8 text-white shadow-lift sm:px-10 sm:py-12" style={storeGradient(event.store)}>
        <div aria-hidden className="absolute -right-10 -top-16 font-display text-[14rem] font-bold leading-none opacity-10">%</div>
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-white" /> Live now on {stores[event.store].name}
            </span>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">{event.name}</h2>
            <p className="mt-2 text-lg text-white/85">{event.headline}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {event.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                  <Check className="size-3.5" /> {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:justify-self-end">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80"><Timer className="size-3.5" /> Ends in</p>
            <CountdownBlocks to={event.endsAt} />
            <a
              href={event.href}
              target="_blank"
              rel="sponsored noopener"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-neutral-900 transition hover:bg-neutral-100 active:scale-[0.98]"
            >
              Shop the sale on {stores[event.store].name} <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveSaleCard({ event }: { event: PublicSaleEvent }) {
  return (
    <a href={event.href} target="_blank" rel="sponsored noopener" className="group flex items-center justify-between gap-4 rounded-3xl p-5 text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift" style={storeGradient(event.store)}>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">Live · {stores[event.store].name}</p>
        <h3 className="mt-1 truncate font-display text-2xl font-semibold">{event.name}</h3>
        <p className="mt-0.5 truncate text-sm text-white/80">{event.headline}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Ends in</p>
        <p className="font-display text-xl font-semibold"><CountdownText to={event.endsAt} /></p>
        <ArrowUpRight className="ml-auto mt-1 size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  );
}

function LootCard({ deal }: { deal: PublicLootDeal }) {
  const now = useNow();
  const [copied, setCopied] = useState(false);
  const urgent = Date.parse(deal.expiresAt) - now < 6 * 3600_000;
  const off = discountPct(deal.dealPrice, deal.mrp);

  const copyCoupon = async () => {
    if (!deal.coupon) return;
    await navigator.clipboard?.writeText(deal.coupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
      <a href={deal.href} target="_blank" rel="sponsored noopener" className="relative block aspect-square overflow-hidden bg-surface-2">
        <img src={deal.image} alt={deal.title} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
        <StoreBadge store={deal.store} className="absolute left-3 top-3" />
        {deal.showPrice && off > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white">{off}% OFF</span>
        )}
        <span
          className={cn(
            "absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur",
            urgent ? "bg-red-600/90 text-white" : "bg-black/55 text-white",
          )}
        >
          {urgent ? <Zap className="size-3.5 animate-pulse" /> : <Timer className="size-3.5" />}
          Ends in <CountdownText to={deal.expiresAt} />
        </span>
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{deal.title}</h3>
        {deal.showPrice ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold">{formatPrice(deal.dealPrice)}</span>
            <span className="text-xs text-muted line-through">{formatPrice(deal.mrp)}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Deal price live on {stores[deal.store].name}</p>
        )}
        {deal.note && <p className="text-xs italic text-muted">“{deal.note}”</p>}
        {deal.coupon && (
          <button onClick={copyCoupon} className="flex items-center justify-between rounded-xl border border-dashed border-accent/50 bg-accent-soft/50 px-3 py-2 text-xs">
            <span>Code <b className="font-mono text-accent">{deal.coupon}</b></span>
            <span className="flex items-center gap-1 font-semibold text-accent">{copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}</span>
          </button>
        )}
        <a
          href={deal.href}
          target="_blank"
          rel="sponsored noopener"
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent hover:text-accent-ink"
        >
          Grab deal <ArrowUpRight className="size-4" />
        </a>
      </div>
    </article>
  );
}

function UpcomingRow({ event }: { event: PublicSaleEvent }) {
  const now = useNow();
  const days = Math.ceil((Date.parse(event.startsAt) - now) / 86_400_000);
  return (
    <li className="relative">
      <span className="absolute -left-[33px] top-6 size-4 rounded-full border-4 border-bg sm:-left-[41px]" style={{ backgroundColor: stores[event.store].color }} />
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StoreBadge store={event.store} />
            <span className="flex items-center gap-1 text-xs text-muted"><CalendarDays className="size-3.5" /> {dateRange(event.startsAt, event.endsAt)}</span>
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold">{event.name}</h3>
          <p className="text-sm text-muted">{event.headline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Starts in</p>
            <p className="font-display text-xl font-semibold">{days <= 1 ? <CountdownText to={event.startsAt} /> : `${days} days`}</p>
          </div>
          <a href={site.whatsappChannelUrl} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-xs font-semibold transition hover:border-accent hover:text-accent">
            <BellRing className="size-3.5" /> Remind me
          </a>
        </div>
      </div>
    </li>
  );
}
