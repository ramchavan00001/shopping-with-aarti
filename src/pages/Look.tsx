import { motion } from "motion/react";
import { ChevronRight, Clapperboard, Copy, Eye, Heart, Link2, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { LookPayload } from "@shared/types";
import { categoryPath, codeFromLookSlug, lookPath } from "@shared/paths";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { cn, formatCount, timeAgo } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { trackEvent } from "@/lib/track";
import { toggleSaved, useSaved } from "@/lib/saved";
import { lookUrl, shareReel, whatsappShareUrl } from "@/lib/share";
import { WhatsAppIcon } from "@/components/icons";
import { LookPlayer } from "@/components/LookPlayer";
import { ProductCard } from "@/components/ProductCard";
import { ReelCard } from "@/components/ReelCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreBadge } from "@/components/StoreBadge";
import NotFound from "./NotFound";

export default function Look() {
  const { slug = "" } = useParams();
  const code = codeFromLookSlug(slug);
  const { data, loading, error } = useApi<LookPayload>(`/api/looks/${code}`);
  const saved = useSaved().includes(code);
  const [copied, setCopied] = useState(false);

  usePageMeta(data && `${data.reel.title} · #${data.reel.code}`, data?.reel.caption);
  useEffect(() => {
    if (data) trackEvent("look_view", data.reel.code);
  }, [data]);

  if (loading && !data) return <LookSkeleton />;
  if (error || !data) return <NotFound />;

  const { reel, similar, category } = data;
  const storeIds = [...new Set(reel.products.map((p) => p.store))];

  const copy = async () => {
    await navigator.clipboard?.writeText(lookUrl(reel));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="container-page pb-8 pt-4 sm:pt-6">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-accent">Home</Link>
        <ChevronRight className="size-3.5" />
        {category && (
          <>
            <Link to={categoryPath(category.slug)} className="hover:text-accent">{category.name}</Link>
            <ChevronRight className="size-3.5" />
          </>
        )}
        <span className="font-medium text-ink">#{reel.code}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14">
        <motion.div
          key={reel.code}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-[400px] lg:sticky lg:top-24 lg:self-start"
        >
          <LookPlayer reel={reel} />
        </motion.div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-bold text-accent">#{reel.code}</span>
            <span>{timeAgo(reel.publishedAt)}</span>
            <span className="flex items-center gap-1"><Eye className="size-3.5" /> {formatCount(reel.views)} views</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">{reel.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{reel.caption}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {reel.tags.map((t) => (
              <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink/75 transition hover:border-accent hover:text-accent">
                #{t.replace(/\s+/g, "")}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => toggleSaved(reel.code)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                saved ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-accent hover:text-accent",
              )}
            >
              <Heart className={cn("size-4", saved && "fill-current")} /> {saved ? "Saved" : "Save look"}
            </button>
            <a
              href={whatsappShareUrl(reel)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#073B1D] transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-4" /> Share on WhatsApp
            </a>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent">
              {copied ? <Copy className="size-4" /> : <Link2 className="size-4" />} {copied ? "Link copied" : "Copy link"}
            </button>
            {"share" in navigator && (
              <button onClick={() => shareReel(reel)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent">
                <Send className="size-4" /> Share
              </button>
            )}
            <Link to={`/reels?start=${reel.code}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent">
              <Clapperboard className="size-4" /> Watch in reels feed
            </Link>
          </div>

          <section id="shop" className="mt-10 scroll-mt-24" aria-labelledby="shop-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Shop this look</p>
                <h2 id="shop-heading" className="mt-1 font-display text-2xl font-semibold">
                  {reel.products.length} {reel.products.length === 1 ? "item" : "items"} from {storeIds.length} {storeIds.length === 1 ? "store" : "stores"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {storeIds.map((s) => <StoreBadge key={s} store={s} size="md" />)}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {reel.products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-2 p-4 text-xs leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
              I bought and tried everything in this reel. Buttons open {storeIds.map((s) => stores[s].name).join(", ")} at
              the same price you'd pay anyway; I may earn a small commission. Prices are approximate and can change on the store.
            </p>
          </section>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="pt-16 sm:pt-20">
          <SectionHeading eyebrow="You may also like" title="Similar looks" action={category && { to: categoryPath(category.slug), label: `More ${category.name}` }} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {similar.map((r) => <ReelCard key={r.code} reel={r} to={lookPath(r)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function LookSkeleton() {
  return (
    <div className="container-page grid gap-8 pt-10 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14">
      <div className="mx-auto aspect-[9/16] w-full max-w-[400px] animate-pulse rounded-[2rem] bg-surface-2" />
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded-full bg-surface-2" />
        <div className="h-10 w-3/4 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-20 w-full animate-pulse rounded-xl bg-surface-2" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/7] animate-pulse rounded-3xl bg-surface-2" />)}
        </div>
      </div>
    </div>
  );
}
