import { Hash } from "lucide-react";
import { Link } from "react-router";
import type { HomePayload } from "@shared/types";
import { useApi } from "@/lib/api";
import { SearchBox } from "@/components/SearchBox";

const popular = ["kurti", "co-ord", "black dress", "earrings", "lehenga", "sneakers", "makeup"];

export default function Search() {
  const { data } = useApi<HomePayload>("/api/home");
  return (
    <div className="container-page max-w-2xl pb-10 pt-8">
      <h1 className="font-display text-3xl font-semibold">Find a look</h1>
      <p className="mt-1 text-sm text-muted">Type the reel code from Instagram, or search for a product.</p>
      <SearchBox size="lg" autoFocus className="mt-6" />

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Popular searches</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {popular.map((q) => (
          <Link key={q} to={`/reels?q=${encodeURIComponent(q)}`} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent">
            {q}
          </Link>
        ))}
      </div>

      {data && (
        <>
          <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Recent reel codes</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {data.latest.slice(0, 6).map((r) => (
              <li key={r.code}>
                <Link to={`/reels?start=${r.code}`} className="flex items-center gap-3 p-3 transition hover:bg-surface-2">
                  <img src={r.poster} alt="" className="h-14 w-10 rounded-lg object-cover" />
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
  );
}
