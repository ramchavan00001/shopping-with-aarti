import { useState, type ReactNode } from "react";

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", opts);

/** Round the axis max up to a clean number (1, 2, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * Single-series column chart of clicks per day. Columns are capped at 24px with
 * a 4px rounded top; hover (or focus) shows the exact day and count; the peak
 * day carries the only direct label.
 */
export function ClickChart({ data }: { data: { day: string; clicks: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 180;
  const max = niceMax(Math.max(0, ...data.map((d) => d.clicks)));
  const peak = data.reduce((best, d, i) => (d.clicks > (data[best]?.clicks ?? -1) ? i : best), 0);
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <figure className="relative">
      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative w-8 shrink-0 text-right text-[11px] tabular-nums text-muted" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / max) * H }}>
              {compact.format(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* gridlines */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ top: H - (t / max) * H }} />
          ))}
          <div className="relative flex items-end gap-0.5" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const h = d.clicks ? Math.max(3, (d.clicks / max) * H) : 0;
              return (
                <button
                  key={d.day}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${dayLabel(d.day, { day: "numeric", month: "short" })}: ${d.clicks} clicks`}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-chart transition-opacity"
                    style={{ height: h, opacity: hover === null || hover === i ? 1 : 0.45 }}
                  />
                  {i === peak && d.clicks > 0 && hover === null && (
                    <span className="absolute text-[11px] font-semibold tabular-nums text-ink" style={{ bottom: h + 4 }}>
                      {d.clicks}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lift"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: -8 }}
            >
              <span className="block text-muted">{dayLabel(data[hover].day, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="font-semibold tabular-nums text-ink">{data[hover].clicks} clicks</span>
            </div>
          )}
          {/* x axis */}
          <div className="mt-2 flex gap-0.5 text-[11px] text-muted">
            {data.map((d, i) => (
              <span key={d.day} className="flex-1 text-center">
                {i % labelEvery === 0 || i === data.length - 1 ? dayLabel(d.day, { day: "numeric", month: "short" }) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">View as table</summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <thead>
            <tr className="text-muted"><th className="py-1 font-medium">Day</th><th className="py-1 text-right font-medium">Clicks</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{dayLabel(d.day, { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="py-1 text-right">{d.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars for a short list of categories, value at the bar tip. */
export function BarList({ rows }: { rows: { key: string; label: ReactNode; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-4 max-w-full rounded-r-[4px] bg-chart" style={{ width: `${(r.value / max) * 85}%`, minWidth: 3 }} />
            <span className="text-xs font-semibold tabular-nums">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
