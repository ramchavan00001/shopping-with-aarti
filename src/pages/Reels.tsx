import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Play,
  Send,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { HomePayload, PublicReel } from "@shared/types";
import { lookPath } from "@shared/paths";
import { useSettings } from "@/lib/settings";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { cn, formatCount, timeAgo } from "@/lib/format";
import { toggleSaved, useSaved } from "@/lib/saved";
import { shareReel } from "@/lib/share";
import { reachedPlayThreshold, trackEvent } from "@/lib/track";
import { InstagramIcon } from "@/components/icons";
import { ProductRow } from "@/components/ProductRow";

export default function Reels() {
  const [params, setParams] = useSearchParams();
  const saved = useSaved();
  const savedOnly = params.get("saved") === "1";

  // Everything except `start` changes which reels are listed.
  const apiUrl = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of ["category", "store", "q", "maxPrice"]) {
      const v = params.get(key);
      if (v) q.set(key, v);
    }
    if (savedOnly) q.set("codes", saved.join(",") || "none");
    return `/api/reels?${q}`;
  }, [params, savedOnly, saved]);

  const { data, loading, error } = useApi<{ reels: PublicReel[] }>(apiUrl);
  const { data: home } = useApi<HomePayload>("/api/home");
  const reels = data?.reels ?? [];

  const feedRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [drawerReel, setDrawerReel] = useState<PublicReel>();
  const startHandled = useRef<string | null>(null);

  // Jump to ?start=CODE once per result set.
  useEffect(() => {
    if (!reels.length || startHandled.current === apiUrl) return;
    startHandled.current = apiUrl;
    const start = params.get("start")?.toUpperCase();
    const idx = Math.max(0, reels.findIndex((r) => r.code === start));
    setActive(idx);
    requestAnimationFrame(() => {
      feedRef.current?.children[idx]?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    });
  }, [reels, apiUrl, params]);

  // Track which slide is on screen.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !reels.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root: feed, threshold: 0.6 },
    );
    Array.from(feed.children).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels]);

  // Keep the URL shareable without triggering a router re-render.
  useEffect(() => {
    const reel = reels[active];
    if (!reel) return;
    const url = new URL(location.href);
    url.searchParams.set("start", reel.code);
    history.replaceState(history.state, "", url);
  }, [active, reels]);

  const go = useCallback((dir: 1 | -1) => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollBy({ top: dir * feed.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown" || e.key === "j") (e.preventDefault(), go(1));
      if (e.key === "ArrowUp" || e.key === "k") (e.preventDefault(), go(-1));
      if (e.key === "m") setMuted((m) => !m);
      if (e.key === "Escape") setDrawerReel(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Lock page scroll behind the full-screen feed.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const setFilter = (key: string, value?: string) => {
    const next = new URLSearchParams();
    if (value) next.set(key, value);
    setParams(next);
    startHandled.current = null;
  };

  const activeReel = reels[active];
  const filterLabel = describeFilter(params, home);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white">
      {/* ambient blurred backdrop on large screens */}
      {activeReel && (
        <img
          key={activeReel.code}
          src={activeReel.poster}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden size-full scale-110 object-cover opacity-30 blur-3xl lg:block"
        />
      )}

      <TopBar
        categories={home?.categories ?? []}
        current={params.get("category")}
        filterLabel={filterLabel}
        onCategory={(slug) => setFilter("category", slug)}
        onClear={() => setFilter("", undefined)}
      />

      <div ref={feedRef} className="no-scrollbar relative h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {reels.map((reel, i) => (
          <ReelSlide
            key={reel.code}
            reel={reel}
            index={i}
            isActive={i === active}
            shouldLoad={Math.abs(i - active) <= 1}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onShop={() => setDrawerReel(reel)}
          />
        ))}
      </div>

      {loading && !reels.length && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="aspect-[9/16] h-[80dvh] max-w-[90vw] animate-pulse rounded-3xl bg-white/5" />
        </div>
      )}

      {!loading && !reels.length && (
        <EmptyState savedOnly={savedOnly} error={error} onReset={() => setFilter("", undefined)} />
      )}

      {/* desktop: up/down controls and persistent product panel */}
      {reels.length > 1 && (
        <div className="absolute right-[calc(50%+min(28.125dvh,45vw)+1.5rem)] top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          <button onClick={() => go(-1)} disabled={active === 0} aria-label="Previous reel" className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:opacity-30">
            <ChevronUp className="size-5" />
          </button>
          <button onClick={() => go(1)} disabled={active === reels.length - 1} aria-label="Next reel" className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:opacity-30">
            <ChevronDown className="size-5" />
          </button>
        </div>
      )}
      {activeReel && <DesktopPanel reel={activeReel} />}

      <ProductDrawer reel={drawerReel} onClose={() => setDrawerReel(undefined)} />
    </div>
  );
}

function describeFilter(params: URLSearchParams, home?: HomePayload) {
  if (params.get("saved") === "1") return "Saved reels";
  const store = params.get("store");
  if (store && store in stores) return `${stores[store as keyof typeof stores].name} finds`;
  const max = params.get("maxPrice");
  if (max) return `Under ₹${max}`;
  const q = params.get("q");
  if (q) return `“${q}”`;
  const cat = params.get("category");
  if (cat) return home?.categories.find((c) => c.slug === cat)?.name ?? cat;
  return null;
}

/* ---------------------------------------------------------------- Top bar -- */

function TopBar({
  categories,
  current,
  filterLabel,
  onCategory,
  onClear,
}: {
  categories: HomePayload["categories"];
  current: string | null;
  filterLabel: string | null;
  onCategory: (slug?: string) => void;
  onClear: () => void;
}) {
  const showChip = filterLabel && !current;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex items-center gap-2 px-3 lg:px-6">
        <Link to="/" aria-label="Back to home" className="grid size-10 shrink-0 place-items-center rounded-full bg-black/30 backdrop-blur transition hover:bg-black/50">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
          {showChip ? (
            <button onClick={onClear} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900">
              {filterLabel} <X className="size-3.5" />
            </button>
          ) : (
            <Chip active={!current} onClick={() => onCategory(undefined)}>For you</Chip>
          )}
          {categories
            .filter((c) => c.count > 0)
            .map((c) => (
              <Chip key={c.slug} active={current === c.slug} onClick={() => onCategory(c.slug)}>
                {c.name}
              </Chip>
            ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur transition",
        active ? "bg-white text-neutral-900" : "bg-white/15 text-white hover:bg-white/25",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Slide -- */

function ReelSlide({
  reel,
  index,
  isActive,
  shouldLoad,
  muted,
  onToggleMute,
  onShop,
}: {
  reel: PublicReel;
  index: number;
  isActive: boolean;
  shouldLoad: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onShop: () => void;
}) {
  const s = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saved = useSaved().includes(reel.code);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && !paused) v.play().catch(() => setPaused(true));
    else v.pause();
  }, [isActive, paused, shouldLoad]);

  useEffect(() => {
    if (!isActive) {
      setPaused(false);
      setExpanded(false);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const onShare = async () => {
    const r = await shareReel(reel);
    if (r === "copied") flash("Link copied");
  };

  return (
    <section
      data-index={index}
      aria-label={`Reel ${reel.code}: ${reel.title}`}
      className="relative flex h-[100dvh] snap-start snap-always items-center justify-center lg:py-4"
    >
      <div className="relative h-full w-full overflow-hidden bg-neutral-900 lg:aspect-[9/16] lg:h-full lg:w-auto lg:rounded-3xl lg:shadow-2xl">
        <img src={reel.poster} alt="" className="absolute inset-0 size-full object-cover" loading={index < 2 ? "eager" : "lazy"} />
        {shouldLoad && (
          <video
            ref={videoRef}
            src={reel.video}
            poster={reel.poster}
            muted={muted}
            loop
            playsInline
            preload={isActive ? "auto" : "metadata"}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
              if (isActive && reachedPlayThreshold(v)) trackEvent("reel_play", reel.code);
            }}
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {/* tap to play / pause */}
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play" : "Pause"}
          className="absolute inset-0 z-0 cursor-default"
        />
        <AnimatePresence>
          {paused && isActive && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="pointer-events-none absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 backdrop-blur"
            >
              <Play className="ml-1 size-7 fill-current" />
            </motion.span>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* right action rail */}
        <div className="absolute bottom-40 right-3 z-10 flex flex-col items-center gap-5 sm:bottom-44">
          <RailButton label={saved ? "Saved" : "Save"} onClick={() => (toggleSaved(reel.code), flash(saved ? "Removed from saved" : "Saved"))}>
            <Heart className={cn("size-6 transition", saved && "scale-110 fill-accent text-accent")} />
          </RailButton>
          <RailButton label="Share" onClick={onShare}>
            <Send className="size-6" />
          </RailButton>
          <RailButton label={muted ? "Sound" : "Mute"} onClick={onToggleMute}>
            {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
          </RailButton>
          <a href={reel.instagramUrl || s.instagramUrl} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 text-[11px] font-semibold">
            <span className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur"><InstagramIcon className="size-6" /></span>
            Insta
          </a>
        </div>

        {/* caption + products */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-16 sm:pr-20">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white px-2 py-0.5 font-bold text-neutral-900">#{reel.code}</span>
            <span className="text-white/70">{timeAgo(reel.publishedAt)} · {formatCount(reel.views)} views</span>
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-balance">{reel.title}</h2>
          <button onClick={() => setExpanded((e) => !e)} className={cn("mt-1 block text-left text-sm text-white/80", !expanded && "line-clamp-2")}>
            {reel.caption}
          </button>

          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
            {reel.products.map((p) => (
              <button key={p.id} onClick={onShop} className="flex shrink-0 items-center gap-2 rounded-xl bg-white/12 p-1.5 pr-3 text-left backdrop-blur-md">
                <img src={p.image} alt="" className="size-9 rounded-lg object-cover" />
                <span className="max-w-28">
                  <span className="block truncate text-[11px] font-semibold">{p.title}</span>
                  <span className="text-[10px] text-white/70">{stores[p.store].name}</span>
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={onShop}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-neutral-900 shadow-lg transition active:scale-[0.98] lg:hidden"
          >
            <ShoppingBag className="size-4" /> Shop this look ({reel.products.length})
          </button>
        </div>

        {/* progress */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/15">
          <div className="h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-lg"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1 text-[11px] font-semibold transition active:scale-90">
      <span className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur">{children}</span>
      {label}
    </button>
  );
}

/* --------------------------------------------------------------- Products -- */

function ProductDrawer({ reel, onClose }: { reel?: PublicReel; onClose: () => void }) {
  return (
    <AnimatePresence>
      {reel && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Products in reel ${reel.code}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col rounded-t-[1.75rem] bg-bg text-ink shadow-2xl sm:mx-auto sm:max-w-lg"
          >
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-12 rounded-full bg-line" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Shop this look · #{reel.code}</p>
                <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{reel.title}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2">
                <X className="size-4" />
              </button>
            </div>
            <ul className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-4">
              {reel.products.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="text-[11px] leading-relaxed text-muted">
                Affiliate links: same price for you. Prices are approximate.
              </p>
              <Link to={lookPath(reel)} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
                Full look <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DesktopPanel({ reel }: { reel: PublicReel }) {
  return (
    <aside className="absolute bottom-4 left-[calc(50%+min(28.125dvh,45vw)+1.5rem)] top-20 z-20 hidden w-[22rem] flex-col overflow-hidden rounded-3xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-xl xl:flex">
      <div className="px-5 pb-3 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Shop this look</p>
        <p className="mt-1 flex items-center justify-between text-sm text-white/80">
          {reel.products.length} items from #{reel.code}
          <Link to={lookPath(reel)} className="flex items-center gap-1 text-xs font-semibold text-white hover:underline">
            Full look <ExternalLink className="size-3.5" />
          </Link>
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.ul
          key={reel.code}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
          className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 pb-3"
        >
          {reel.products.map((p) => (
            <ProductRow key={p.id} product={p} dark />
          ))}
        </motion.ul>
      </AnimatePresence>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-relaxed text-white/50">
        Affiliate links: same price for you. Use ↑ ↓ to switch reels, M to mute.
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------ Empty -- */

function EmptyState({ savedOnly, error, onReset }: { savedOnly: boolean; error?: string; onReset: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-8 text-center">
      <div className="max-w-xs">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/10">
          {savedOnly ? <Heart className="size-7" /> : <ShoppingBag className="size-7" />}
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">
          {error ? "Something went wrong" : savedOnly ? "No saved reels yet" : "No reels match that"}
        </h2>
        <p className="mt-2 text-sm text-white/65">
          {error
            ? "Please check your connection and try again."
            : savedOnly
              ? "Tap the heart on any reel to keep it here for later."
              : "Try a different reel code or browse everything."}
        </p>
        <button onClick={onReset} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900">
          Browse all reels
        </button>
      </div>
    </div>
  );
}
