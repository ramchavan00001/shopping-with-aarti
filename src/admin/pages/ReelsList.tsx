import { EyeOff, Plus, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { AdminReel } from "@shared/admin";
import { lookPath } from "@shared/paths";
import { cn } from "@/lib/format";
import { StoreDots } from "@/components/StoreBadge";
import { resolveMedia, useAdminQuery } from "../api";
import { useAdminConfig } from "../context";
import { Empty, ErrorBanner, PageHeader } from "../ui";

type Filter = "all" | "live" | "hidden";

export default function ReelsList() {
  const { data, error, reload, loading } = useAdminQuery<{ reels: AdminReel[] }>("/reels");
  const { mediaBaseUrl } = useAdminConfig();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const reels = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^#/, "");
    return (data?.reels ?? []).filter((r) => {
      if (filter === "live" && r.isPublished === false) return false;
      if (filter === "hidden" && r.isPublished !== false) return false;
      if (!term) return true;
      return [r.code, r.title, r.category, ...r.tags, ...r.products.map((p) => p.title)].join(" ").toLowerCase().includes(term);
    });
  }, [data, q, filter]);

  return (
    <div>
      <PageHeader
        title="Reels & products"
        description="Each reel is a look on the site. Add the products from the reel with their affiliate links."
        actions={
          <Link to="/admin/reels/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-soft hover:brightness-110">
            <Plus className="size-4" /> Add reel
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, title or product"
            className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex rounded-full border border-line bg-surface p-1">
          {(["all", "live", "hidden"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition", filter === f ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
              {f}
            </button>
          ))}
        </div>
        {data && <span className="text-sm text-muted">{reels.length} of {data.reels.length}</span>}
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}
      {data && !reels.length && <Empty title={data.reels.length ? "No reels match" : "No reels yet"}>Use “Add reel” to create the first one.</Empty>}

      {reels.length > 0 && (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {reels.map((r) => (
            <li key={r.code} className="border-b border-line last:border-b-0">
              <Link to={`/admin/reels/${r.code}`} className="flex items-center gap-4 p-3 transition hover:bg-surface-2 sm:px-4">
                <img src={resolveMedia(r.poster, mediaBaseUrl)} alt="" className={cn("h-16 w-12 shrink-0 rounded-lg object-cover", r.isPublished === false && "opacity-50")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">#{r.code}</span>
                    {r.isFeatured && <span className="flex items-center gap-1 text-xs font-semibold text-gold"><Star className="size-3.5 fill-current" /> Featured</span>}
                    {r.isPublished === false && <span className="flex items-center gap-1 text-xs font-semibold text-muted"><EyeOff className="size-3.5" /> Hidden</span>}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted">
                    {r.category} · {new Date(r.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                  <span className="text-xs text-muted">{r.products.length} products</span>
                  <StoreDots ids={r.products.map((p) => p.store)} />
                </div>
              </Link>
              {r.isPublished !== false && (
                <a href={lookPath(r)} target="_blank" className="sr-only focus:not-sr-only">View #{r.code} on site</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
