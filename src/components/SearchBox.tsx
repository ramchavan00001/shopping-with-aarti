import { ArrowRight, Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import type { SearchPayload } from "@shared/types";
import { lookPath } from "@shared/paths";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/format";
import { useDebounced } from "@/lib/useDebounced";
import { imgUrl } from "@/lib/img";
import { useT } from "@/lib/i18n";

const isCode = (v: string) => /^[a-z]\d{2,4}$/i.test(v);

/**
 * Search input that accepts a reel code ("A112", "#a112") or keywords.
 * With `suggest`, shows instant results in a dropdown while typing.
 */
export function SearchBox({
  className,
  size = "md",
  autoFocus,
  suggest = false,
}: {
  className?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  suggest?: boolean;
}) {
  const t = useT();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLFormElement>(null);

  const q = useDebounced(value.trim().replace(/^#/, ""), 160);
  const { data, loading } = useApi<SearchPayload>(suggest && q.length >= 2 ? `/api/search?q=${encodeURIComponent(q)}&limit=4` : null);

  const items = data && q.length >= 2
    ? [
        ...data.reels.map((r) => ({ key: `r${r.code}`, to: lookPath(r), image: r.poster, title: r.title, sub: t("Look #{code} · {n} items", { code: r.code, n: r.products.length }) })),
        ...data.products.slice(0, 4).map((p) => ({ key: p.id, to: `/look/${p.reelCode.toLowerCase()}`, image: p.image, title: p.title, sub: t("{store} · from #{code}", { store: stores[p.store].name, code: p.reelCode }) })),
      ]
    : [];

  useEffect(() => setHighlight(-1), [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function go(to: string) {
    setOpen(false);
    setValue("");
    navigate(to);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (highlight >= 0 && items[highlight]) return go(items[highlight].to);
    const v = value.trim().replace(/^#/, "");
    if (!v) return;
    go(isCode(v) ? `/look/${v.toLowerCase()}` : `/search?q=${encodeURIComponent(v)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!suggest || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = suggest && open && q.length >= 2;

  return (
    <form ref={wrapRef} onSubmit={submit} role="search" className={cn("relative", className)}>
      <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "size-5" : "size-4")} />
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        type="search"
        enterKeyHint="search"
        placeholder={size === "lg" ? t("Try A112 or “kurti”") : t("Search reel code or product")}
        aria-label={t("Search by reel code or product")}
        role={suggest ? "combobox" : undefined}
        aria-expanded={suggest ? showDropdown : undefined}
        aria-controls={suggest ? listId : undefined}
        aria-activedescendant={highlight >= 0 && items[highlight] ? `${listId}-${highlight}` : undefined}
        className={cn(
          "w-full rounded-full border border-line bg-surface text-ink placeholder:text-muted/80 shadow-soft outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15",
          size === "lg" ? "h-14 pl-11 pr-28 text-base" : "h-10 pl-10 pr-4 text-sm",
        )}
      />
      {size === "lg" && (
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 h-11 -translate-y-1/2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110 active:scale-95"
        >
          {t("Find look")}
        </button>
      )}

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          {isCode(q) && (
            <button type="button" onClick={() => go(`/look/${q.toLowerCase()}`)} className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-left text-sm font-semibold text-accent hover:bg-surface-2">
              {t("Open look #{code}", { code: q.toUpperCase() })} <ArrowRight className="size-4" />
            </button>
          )}
          {loading && !items.length ? (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> {t("Searching…")}</p>
          ) : items.length ? (
            <ul id={listId} role="listbox" className="max-h-96 overflow-y-auto py-1">
              {items.map((it, i) => (
                <li key={it.key} id={`${listId}-${i}`} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => go(it.to)}
                    className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", i === highlight && "bg-surface-2")}
                  >
                    <img src={imgUrl(it.image, 160)} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{it.title}</span>
                      <span className="block truncate text-xs text-muted">{it.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">{t("No matches for “{q}”.", { q })}</p>
          )}
          <button
            type="button"
            onClick={() => go(`/search?q=${encodeURIComponent(q)}`)}
            className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-sm font-semibold hover:bg-surface-2"
          >
            {t("See all results for “{q}”", { q })} <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </form>
  );
}
