import { Hash, Loader2, Search as SearchIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { HomePayload, SearchPayload } from "@shared/types";
import { categoryPath, lookPath } from "@shared/paths";
import { useApi } from "@/lib/api";
import { usePageMeta } from "@/lib/meta";
import { useDebounced } from "@/lib/useDebounced";
import { ProductCard } from "@/components/ProductCard";
import { ReelCard } from "@/components/ReelCard";
import { imgUrl } from "@/lib/img";
import { useT } from "@/lib/i18n";

const popular = ["kurti", "co-ord", "party dress", "earrings", "saree", "sneakers", "makeup", "under 500"];

export default function Search() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const q = useDebounced(value.trim().replace(/^#/, ""), 200);

  // Keep ?q= in sync so results are shareable and survive refresh.
  useEffect(() => {
    setParams((prev) => ((prev.get("q") ?? "") === q ? prev : new URLSearchParams(q ? { q } : undefined)), { replace: true });
  }, [q, setParams]);
  useEffect(() => {
    const fromUrl = params.get("q") ?? "";
    if (fromUrl !== q) setValue(fromUrl);
    // Only react to outside navigation (e.g. header search), not typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { data, loading } = useApi<SearchPayload>(q ? `/api/search?q=${encodeURIComponent(q)}&limit=12` : null);
  const { data: home } = useApi<HomePayload>("/api/home");
  usePageMeta(q ? t("Search: {q}", { q }) : t("Search"), t("Search Aarti's try-on reels by reel code, product or category."));

  const total = data ? data.reels.length + data.products.length : 0;

  return (
    <div className="container-page pb-10 pt-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t("Find a look")}</h1>
        <p className="mt-1 text-sm text-muted">{t("Type the reel code from Instagram, or search for a product, colour or occasion.")}</p>
        <div className="relative mt-6">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            type="search"
            enterKeyHint="search"
            placeholder={t("Try A112, “kurti” or “red party”")}
            aria-label={t("Search")}
            className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-12 [&::-webkit-search-cancel-button]:hidden text-base shadow-soft outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          {loading ? (
            <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted" />
          ) : value && (
            <button onClick={() => setValue("")} aria-label={t("Clear search")} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-surface-2">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!q && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t("Popular searches")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {popular.map((p) => (
              <button key={p} onClick={() => setValue(t(p))} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent">
                {t(p)}
              </button>
            ))}
          </div>

          {home && (
            <>
              <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t("Recent reel codes")}</h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {home.latest.slice(0, 6).map((r) => (
                  <li key={r.code}>
                    <Link to={lookPath(r)} className="flex items-center gap-3 p-3 transition hover:bg-surface-2">
                      <img src={imgUrl(r.poster, 160)} alt="" className="h-14 w-10 rounded-lg object-cover" />
                      <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                        <Hash className="size-3" />{r.code}
                      </span>
                      <span className="truncate text-sm font-medium">{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {q && data && (
        <div className="mt-10" aria-live="polite">
          <p className="mb-6 text-sm text-muted">
            {total ? t("{n} results for “{q}”", { n: total, q }) : t("No results for “{q}”", { q })}
          </p>

          {data.categories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {data.categories.map((c) => (
                <Link key={c.slug} to={categoryPath(c.slug)} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-sm font-medium transition hover:border-accent">
                  <img src={imgUrl(c.image, 160)} alt="" className="size-7 rounded-full object-cover" />
                  {t("Browse {name}", { name: t(c.name) })}
                </Link>
              ))}
            </div>
          )}

          {data.reels.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 font-display text-2xl font-semibold">{t("Looks")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                {data.reels.map((r) => <ReelCard key={r.code} reel={r} to={lookPath(r)} />)}
              </div>
            </section>
          )}

          {data.products.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-2xl font-semibold">{t("Products")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          {!total && (
            <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-xl font-semibold">{t("Nothing found")}</p>
              <p className="mt-2 text-sm text-muted">{t("Check the reel code in the Instagram caption, or try one of these:")}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {popular.slice(0, 5).map((p) => (
                  <button key={p} onClick={() => setValue(t(p))} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium hover:text-accent">{t(p)}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
