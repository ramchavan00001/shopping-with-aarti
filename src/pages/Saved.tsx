import { Clapperboard, Heart, Play, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { SavedPayload } from "@shared/types";
import { lookPath } from "@shared/paths";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { savedLooks, savedProducts } from "@/lib/saved";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ReelCard, ReelCardSkeleton } from "@/components/ReelCard";

type Tab = "looks" | "products";

export default function Saved() {
  const looks = savedLooks.useList();
  const products = savedProducts.useList();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "products" || (!looks.length && products.length && !params.get("tab")) ? "products" : "looks";
  usePageMeta("Saved", "Looks and products you've saved on this device.");

  // Fetch whatever is saved; the API skips anything that's been removed since.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const q = new URLSearchParams();
    if (looks.length) q.set("reels", looks.join(","));
    if (products.length) q.set("products", products.join(","));
    setQuery(q.toString());
  }, [looks, products]);
  const { data, error } = useApi<SavedPayload>(query ? `/api/saved?${query}` : null);

  // Drop saved ids that no longer exist on the site, so counts stay honest.
  useEffect(() => {
    if (!data) return;
    const liveLooks = new Set(data.reels.map((r) => r.code));
    const liveProducts = new Set(data.products.map((p) => p.id));
    savedLooks.remove(looks.filter((c) => !liveLooks.has(c.toUpperCase())));
    savedProducts.remove(products.filter((id) => !liveProducts.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Show items in saved order and only those still saved (instant removal).
  const reelByCode = new Map(data?.reels.map((r) => [r.code, r]));
  const productById = new Map(data?.products.map((p) => [p.id, p]));
  const shownLooks = looks.flatMap((c) => reelByCode.get(c.toUpperCase()) ?? []);
  const shownProducts = products.flatMap((id) => productById.get(id) ?? []);
  const loading = !!query && !data && !error;

  const clear = () => {
    if (!confirm(`Remove all saved ${tab}?`)) return;
    (tab === "looks" ? savedLooks : savedProducts).clear();
  };

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Heart className="size-3.5 fill-current" /> Your shortlist
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Saved</h1>
          <p className="mt-1 text-sm text-muted">Saved on this device only. No account needed.</p>
        </div>
        {tab === "looks" && shownLooks.length > 0 && (
          <Link to="/reels?saved=1" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-soft transition hover:brightness-110">
            <Play className="size-4 fill-current" /> Play saved looks
          </Link>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <div role="tablist" aria-label="Saved items" className="flex gap-1">
          {(["looks", "products"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setParams(t === "looks" ? {} : { tab: t }, { replace: true })}
              className={cn(
                "-mb-px border-b-2 px-4 py-3 text-sm font-semibold capitalize transition",
                tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t} <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink">{t === "looks" ? looks.length : products.length}</span>
            </button>
          ))}
        </div>
        {(tab === "looks" ? looks.length : products.length) > 0 && (
          <button onClick={clear} className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
            <Trash2 className="size-3.5" /> Clear all
          </button>
        )}
      </div>

      {error && <p className="mt-8 text-sm text-muted">Couldn't load your saved items. Please refresh.</p>}

      <div className="mt-8">
        {tab === "looks" &&
          (loading ? (
            <Grid>{Array.from({ length: Math.min(looks.length, 6) }, (_, i) => <ReelCardSkeleton key={i} />)}</Grid>
          ) : shownLooks.length ? (
            <Grid>
              {shownLooks.map((r) => (
                <div key={r.code} className="relative">
                  <ReelCard reel={r} to={lookPath(r)} />
                  <button
                    onClick={() => savedLooks.toggle(r.code)}
                    aria-label={`Remove ${r.title} from saved`}
                    className="absolute right-3 top-12 grid size-9 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-sm backdrop-blur transition hover:bg-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={<Clapperboard className="size-7" />}
              title="No saved looks yet"
              text="Tap the heart on any reel or look page to keep it here."
              cta={{ to: "/reels", label: "Browse reels" }}
            />
          ))}

        {tab === "products" &&
          (loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: Math.min(products.length, 8) }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : shownProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {shownProducts.map((p) => (
                <div key={p.id} className="flex flex-col gap-2">
                  <ProductCard product={p} />
                  <Link to={lookPath({ code: p.reelCode, slug: p.reelSlug })} className="truncate px-1 text-xs text-muted hover:text-accent">
                    From look #{p.reelCode}: {p.reelTitle}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Heart className="size-7" />}
              title="No saved products yet"
              text="Tap the heart on any product to build your shortlist, then buy when you're ready."
              cta={{ to: "/category/dresses", label: "Browse products" }}
            />
          ))}
      </div>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{children}</div>;
}

function EmptyState({ icon, title, text, cta }: { icon: ReactNode; title: string; text: string; cta: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">{icon}</span>
      <h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <Link to={cta.to} className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">{cta.label}</Link>
    </div>
  );
}
