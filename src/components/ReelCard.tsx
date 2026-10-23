import { Eye, Play, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import type { PublicReel } from "@shared/types";
import { formatCount } from "@/lib/format";
import { StoreDots } from "./StoreBadge";
import { responsive } from "@/lib/img";
import { useT } from "@/lib/i18n";

/** 9:16 reel tile. On hover-capable devices the reel previews muted. */
/** `to` defaults to the full-screen feed; pass a look page path to link there instead. */
export function ReelCard({ reel, priority = false, to }: { reel: PublicReel; priority?: boolean; to?: string }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);

  const start = () => {
    if (!matchMedia("(hover: hover)").matches) return;
    setPreviewing(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  };
  const stop = () => {
    videoRef.current?.pause();
    setPreviewing(false);
  };

  return (
    <Link
      to={to ?? `/reels?start=${reel.code}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group relative block aspect-[9/16] overflow-hidden rounded-3xl bg-surface-2 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <img
        {...responsive(reel.poster, "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw", 640)}
        alt=""
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
      />
      {previewing && (
        <video
          ref={videoRef}
          src={reel.video}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />

      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wide text-neutral-900 backdrop-blur">
          #{reel.code}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          <Eye className="size-3" /> {formatCount(reel.views)}
        </span>
      </div>

      <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100">
        <Play className="size-5 fill-current" />
      </span>

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="line-clamp-2 font-display text-lg font-medium leading-snug">{reel.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            <ShoppingBag className="size-3.5" /> {t("Shop {n} items", { n: reel.products.length })}
          </span>
          <StoreDots ids={reel.products.map((p) => p.store)} />
        </div>
      </div>
    </Link>
  );
}

export function ReelCardSkeleton() {
  return <div className="aspect-[9/16] animate-pulse rounded-3xl bg-surface-2" />;
}
