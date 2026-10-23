import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicReel } from "@shared/types";
import { reachedPlayThreshold, trackEvent } from "@/lib/track";
import { imgUrl } from "@/lib/img";
import { useT } from "@/lib/i18n";

/** Inline 9:16 player for look pages: autoplays muted, tap to pause. */
export function LookPlayer({ reel }: { reel: PublicReel }) {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPaused(false);
    setProgress(0);
  }, [reel.code]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => setPaused(true));
  }, [paused, reel.code]);

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] bg-neutral-900 shadow-lift">
      <video
        key={reel.code}
        ref={ref}
        src={reel.video}
        poster={imgUrl(reel.poster, 960)}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress(v.currentTime / v.duration);
          if (reachedPlayThreshold(v)) trackEvent("reel_play", reel.code);
        }}
        className="absolute inset-0 size-full object-cover"
      />
      <button onClick={() => setPaused((p) => !p)} aria-label={paused ? t("Play") : t("Pause")} className="absolute inset-0" />
      {paused && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
          <Play className="ml-1 size-7 fill-current" />
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-neutral-900">#{reel.code}</span>
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("Play") : t("Pause")}
          className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t("Unmute") : t("Mute")}
          className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <div className="h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
