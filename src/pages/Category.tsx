import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { colours, type Colour, type HomePayload, type Occasion, type ProductSort, type ProductsPayload, type StoreId } from "@shared/types";
import { categoryPath, lookPath } from "@shared/paths";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ReelCard } from "@/components/ReelCard";
import NotFound from "./NotFound";
import { imgUrl, responsive } from "@/lib/img";
import { useT } from "@/lib/i18n";

const priceBands = [299, 499, 999, 1499];
const sorts: { id: ProductSort; label: string }[] = [
  { id: "popular", label: "Most popular" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];
const FILTER_KEYS = ["store", "maxPrice", "occasion", "colour"] as const;

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Category() {
  const t = useT();
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const apiUrl = useMemo(() => {
    const q = new URLSearchParams({ category: slug });
    for (const k of [...FILTER_KEYS, "sort"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    return `/api/products?${q}`;
  }, [slug, params]);

  const { data, loading, error } = useApi<ProductsPayload>(apiUrl);
  const { data: home } = useApi<HomePayload>("/api/home");
  const category = data?.category;

  usePageMeta(
    category && t("{name} · Tried-on finds", { name: t(category.name) }),
    category && t("{blurb}. Shop {name} Aarti has tried on, from Amazon, Flipkart, Meesho and Myntra.", { blurb: t(category.blurb), name: t(category.name).toLowerCase() }),
  );

  useEffect(() => setSheetOpen(false), [slug]);

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value && next.get(key) !== value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const clearAll = () => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;

  if (!loading && (error || (data && !category))) return <NotFound />;

  const filterPanel = data && <FilterPanel data={data} params={params} onChange={setParam} />;

  return (
    <div className="pb-8">
      {/* banner */}
      <section className="container-page pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-surface-2">
          {category && <img {...responsive(category.image, "100vw")} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
          <div className="relative px-6 py-10 text-white sm:px-10 sm:py-14">
            <nav aria-label={t("Breadcrumb")} className="flex items-center gap-1 text-xs text-white/75">
              <Link to="/" className="hover:text-white">{t("Home")}</Link>
              <ChevronRight className="size-3.5" />
              <span>{t("Categories")}</span>
            </nav>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{category ? t(category.name) : " "}</h1>
            <p className="mt-2 max-w-md text-sm text-white/80 sm:text-base">
              {category ? t("{blurb}. Every piece tried on by Aarti, with honest notes and size tips.", { blurb: t(category.blurb) }) : " "}
            </p>
            {data && (
              <p className="mt-5 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                {t("{p} products · {r} reels", { p: data.facets.stores.reduce((n, s) => n + s.count, 0), r: data.reels?.length ?? 0 })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* category switcher */}
      <nav aria-label={t("Categories")} className="no-scrollbar container-page mt-5 flex gap-2 overflow-x-auto">
        {home?.categories.map((c) => (
          <Link
            key={c.slug}
            to={categoryPath(c.slug)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition",
              c.slug === slug ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-accent",
            )}
          >
            <img src={imgUrl(c.image, 160)} alt="" className="size-7 rounded-full object-cover" />
            {t(c.name)}
          </Link>
        ))}
      </nav>

      {/* reels in this category */}
      {!!data?.reels?.length && (
        <section className="mt-10">
          <div className="container-page flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">{t("Watch the try-ons")}</h2>
            <Link to={`/reels?category=${slug}`} className="text-sm font-semibold text-accent">{t("Play all")}</Link>
          </div>
          <div className="no-scrollbar mt-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            {data.reels.map((r) => (
              <div key={r.code} className="w-36 shrink-0 snap-start sm:w-44">
                <ReelCard reel={r} to={lookPath(r)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* products */}
      <section className="container-page mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("Filters")}</h2>
              {activeCount > 0 && <button onClick={clearAll} className="text-xs font-semibold text-accent">{t("Clear all")}</button>}
            </div>
            {filterPanel}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold lg:hidden"
            >
              <SlidersHorizontal className="size-4" /> {t("Filters")}
              {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] text-accent-ink">{activeCount}</span>}
            </button>
            <p className="text-sm text-muted">
              {data ? t(data.total === 1 ? "{n} product" : "{n} products", { n: data.total }) : t("Loading…")}
            </p>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">{t("Sort")}</span>
              <select
                value={params.get("sort") ?? "popular"}
                onChange={(e) => setParam("sort", e.target.value === "popular" ? undefined : e.target.value)}
                className="rounded-full border border-line bg-surface px-3 py-2 text-sm font-medium outline-none focus:border-accent"
              >
                {sorts.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
              </select>
            </label>
          </div>

          <ActiveFilters params={params} onRemove={(k) => setParam(k)} onClear={clearAll} />

          {data && data.total === 0 ? (
            <div className="rounded-3xl border border-dashed border-line px-6 py-16 text-center">
              <p className="font-display text-2xl font-semibold">{t("Nothing matches those filters")}</p>
              <p className="mt-2 text-sm text-muted">{t("Try removing a filter or two.")}</p>
              <button onClick={clearAll} className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">{t("Clear filters")}</button>
            </div>
          ) : (
            <div className={cn("grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3", loading && data && "opacity-60 transition-opacity")}>
              {data
                ? data.products.map((p) => <ProductCard key={p.id} product={p} />)
                : Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* mobile filter sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)} className="fixed inset-0 z-50 bg-black/45" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("Filters")}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[1.75rem] bg-bg"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-xl font-semibold">{t("Filters")}</h2>
                <button onClick={() => setSheetOpen(false)} aria-label={t("Close")} className="grid size-9 place-items-center rounded-full bg-surface-2">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">{filterPanel}</div>
              <div className="flex gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button onClick={clearAll} className="flex-1 rounded-full border border-line py-3 text-sm font-semibold">{t("Clear all")}</button>
                <button onClick={() => setSheetOpen(false)} className="flex-[2] rounded-full bg-accent py-3 text-sm font-semibold text-accent-ink">
                  {t("Show {n} products", { n: data?.total ?? "" })}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="border-b border-line py-5 first:pt-0">
      <h3 id={id} className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</h3>
      {children}
    </div>
  );
}

function OptionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
        active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface hover:border-accent",
      )}
    >
      {children}
    </button>
  );
}

function FilterPanel({ data, params, onChange }: { data: ProductsPayload; params: URLSearchParams; onChange: (key: string, value?: string) => void }) {
  const t = useT();
  const { facets } = data;
  return (
    <div>
      <FilterGroup title={t("Store")}>
        <div className="flex flex-wrap gap-2">
          {facets.stores.map(({ id, count }) => (
            <OptionChip key={id} active={params.get("store") === id} onClick={() => onChange("store", id)}>
              <span className="size-2 rounded-full" style={{ backgroundColor: stores[id].color }} />
              {stores[id].name} <span className="text-xs opacity-60">{count}</span>
            </OptionChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title={t("Price")}>
        <div className="flex flex-wrap gap-2">
          {priceBands.map((p) => (
            <OptionChip key={p} active={params.get("maxPrice") === String(p)} onClick={() => onChange("maxPrice", String(p))}>
              {t("Under ₹{n}", { n: p.toLocaleString("en-IN") })}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>
      {facets.occasions.length > 0 && (
        <FilterGroup title={t("Occasion")}>
          <div className="flex flex-wrap gap-2">
            {facets.occasions.map(({ id, count }) => (
              <OptionChip key={id} active={params.get("occasion") === id} onClick={() => onChange("occasion", id)}>
                {t(titleCase(id))} <span className="text-xs opacity-60">{count}</span>
              </OptionChip>
            ))}
          </div>
        </FilterGroup>
      )}
      {facets.colours.length > 0 && (
        <FilterGroup title={t("Colour")}>
          <div className="flex flex-wrap gap-2.5">
            {facets.colours.map(({ id }) => {
              const active = params.get("colour") === id;
              return (
                <button
                  key={id}
                  onClick={() => onChange("colour", id)}
                  aria-pressed={active}
                  aria-label={t(titleCase(id))}
                  title={t(titleCase(id))}
                  className={cn(
                    "grid size-9 place-items-center rounded-full ring-1 ring-black/10 transition hover:scale-110",
                    active && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                  )}
                  style={{ background: colours[id as Colour] }}
                >
                  {active && <Check className={cn("size-4", ["white", "beige", "yellow", "gold"].includes(id) ? "text-neutral-900" : "text-white")} />}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

function ActiveFilters({ params, onRemove, onClear }: { params: URLSearchParams; onRemove: (key: string) => void; onClear: () => void }) {
  const t = useT();
  const items = FILTER_KEYS.flatMap((k) => {
    const v = params.get(k);
    if (!v) return [];
    const label =
      k === "store" ? stores[v as StoreId]?.name ?? v
      : k === "maxPrice" ? t("Under ₹{n}", { n: Number(v).toLocaleString("en-IN") })
      : t(titleCase(v as Occasion | Colour));
    return [{ k, label }];
  });
  if (!items.length) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {items.map(({ k, label }) => (
        <button key={k} onClick={() => onRemove(k)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-bg">
          {label} <X className="size-3.5" />
        </button>
      ))}
      <button onClick={onClear} className="text-xs font-semibold text-accent">{t("Clear all")}</button>
    </div>
  );
}
