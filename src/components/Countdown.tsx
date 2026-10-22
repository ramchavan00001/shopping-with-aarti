import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

// One shared 1-second ticker for every countdown on the page.
const subscribers = new Set<(t: number) => void>();
let timer: ReturnType<typeof setInterval> | undefined;

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    subscribers.add(setNow);
    timer ??= setInterval(() => subscribers.forEach((s) => s(Date.now())), 1000);
    return () => {
      subscribers.delete(setNow);
      if (!subscribers.size && timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
  }, []);
  return now;
}

export function splitDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Big segmented countdown: 02d : 14h : 05m : 09s */
export function CountdownBlocks({ to, className }: { to: string; className?: string }) {
  const now = useNow();
  const { d, h, m, s } = splitDuration(Date.parse(to) - now);
  const parts = [
    { v: d, l: "days" },
    { v: h, l: "hrs" },
    { v: m, l: "min" },
    { v: s, l: "sec" },
  ];
  return (
    <div className={cn("flex gap-2", className)} role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {parts.map((p) => (
        <span key={p.l} className="grid min-w-14 place-items-center rounded-2xl bg-black/25 px-2 py-2 backdrop-blur">
          <span className="font-display text-2xl font-semibold tabular-nums leading-none">{pad(p.v)}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-75">{p.l}</span>
        </span>
      ))}
    </div>
  );
}

/** Compact text countdown: "1d 04:05:09" */
export function CountdownText({ to, endedLabel = "Ended" }: { to: string; endedLabel?: string }) {
  const now = useNow();
  const ms = Date.parse(to) - now;
  if (ms <= 0) return <span>{endedLabel}</span>;
  const { d, h, m, s } = splitDuration(ms);
  return (
    <span className="tabular-nums">
      {d > 0 && `${d}d `}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
