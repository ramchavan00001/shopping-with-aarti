import { ArrowRight, Info, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { AdminStats } from "@shared/admin";
import { sourceLabels, type TrafficSource } from "@shared/analytics";
import { stores } from "@shared/stores";
import type { StoreId } from "@shared/types";
import { cn } from "@/lib/format";
import { StoreBadge } from "@/components/StoreBadge";
import { resolveMedia, useAdminQuery } from "../api";
import { BarList, DailyChart } from "../Charts";
import { useAdminConfig } from "../context";
import { Card, Empty, ErrorBanner, PageHeader } from "../ui";

const periods = [7, 30, 90];

const metrics = [
  { id: "visitors", label: "Visitors", unit: "visitors" },
  { id: "reelPlays", label: "Reel plays", unit: "plays" },
  { id: "clicks", label: "Buy clicks", unit: "clicks" },
] as const;
type Metric = (typeof metrics)[number]["id"];

const pct = (part: number, whole: number) => {
  if (whole <= 0) return "–";
  const v = (part / whole) * 100;
  return `${v === 0 || v >= 10 ? Math.round(v) : v.toFixed(1)}%`;
};

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>("visitors");
  const { data, error, reload } = useAdminQuery<AdminStats>(`/stats?days=${days}`);
  const { mediaBaseUrl } = useAdminConfig();
  const m = metrics.find((x) => x.id === metric)!;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Who visits, what they watch, and which links they tap through to buy."
        actions={
          <>
            <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Period">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setDays(p)}
                  aria-pressed={days === p}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", days === p ? "bg-ink text-bg" : "text-muted hover:text-ink")}
                >
                  {p} days
                </button>
              ))}
            </div>
            <Link to="/admin/reels/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-soft hover:brightness-110">
              <Plus className="size-4" /> Add reel
            </Link>
          </>
        }
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Visitors" value={data.totals.visitors} hint="Unique people per day, added up" />
            <Stat label="Reel plays" value={data.totals.reelPlays} hint="Watched 3+ seconds on the site" />
            <Stat label="Look page views" value={data.totals.lookViews} />
            <Stat label="Buy clicks" value={data.totals.clicks} hint={`${data.totals.clicksToday} today`} />
            <Stat label="Click rate" text={pct(data.totals.clicks, data.totals.visits)} hint="Buy clicks per visit" />
            <Stat label="New enquiries" value={data.totals.newEnquiries} to="/admin/enquiries" highlight={data.totals.newEnquiries > 0} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card
              title={`${m.label} per day`}
              action={
                <div className="flex rounded-full bg-surface-2 p-0.5" role="group" aria-label="Chart metric">
                  {metrics.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => setMetric(x.id)}
                      aria-pressed={metric === x.id}
                      className={cn("rounded-full px-2.5 py-1 text-xs font-semibold transition", metric === x.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              }
            >
              <DailyChart data={data.daily.map((d) => ({ day: d.day, value: d[metric] }))} unit={m.unit} />
            </Card>

            <Card title="Where visitors come from">
              {data.sources.length ? (
                <SourceTable rows={data.sources} />
              ) : (
                <p className="text-sm text-muted">No visits recorded in this period yet.</p>
              )}
            </Card>
          </div>

          <Card title="Reel performance">
            {data.reelPerformance.length ? (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="px-2 pb-2 font-medium">Reel</th>
                      <th className="px-2 pb-2 text-right font-medium">Plays</th>
                      <th className="px-2 pb-2 text-right font-medium">Look views</th>
                      <th className="px-2 pb-2 text-right font-medium">Buy clicks</th>
                      <th className="px-2 pb-2 text-right font-medium" title="Buy clicks per reel play">Clicks per play</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.reelPerformance.map((r) => (
                      <tr key={r.code} className="border-t border-line">
                        <td className="px-2 py-2">
                          <Link to={`/admin/reels/${r.code}`} className="flex items-center gap-3 hover:text-accent">
                            <img src={resolveMedia(r.poster, mediaBaseUrl)} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover" />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-accent">#{r.code}</span>
                              <span className="line-clamp-1">{r.title}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-right">{r.plays}</td>
                        <td className="px-2 py-2 text-right">{r.lookViews}</td>
                        <td className="px-2 py-2 text-right font-semibold">{r.clicks}</td>
                        <td className="px-2 py-2 text-right">{pct(r.clicks, r.plays)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No reel activity yet">Plays, look views and clicks per reel will show here.</Empty>
            )}
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Most-clicked products">
              {data.topProducts.length ? (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-muted">
                        <th className="px-2 pb-2 font-medium">Product</th>
                        <th className="px-2 pb-2 font-medium">Store</th>
                        <th className="px-2 pb-2 font-medium">Reel</th>
                        <th className="px-2 pb-2 text-right font-medium">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.id} className="border-t border-line">
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-3">
                              <img src={resolveMedia(p.image, mediaBaseUrl)} alt="" className="size-10 rounded-lg object-cover" />
                              <span className="line-clamp-2 font-medium">{p.title}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2"><StoreBadge store={p.store as StoreId} size="xs" /></td>
                          <td className="px-2 py-2">
                            <Link to={`/admin/reels/${p.reelCode}`} className="font-semibold text-accent hover:underline">#{p.reelCode}</Link>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">{p.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No product clicks yet">Share a look link and clicks will appear here.</Empty>
              )}
            </Card>
            <div className="space-y-5">
              <Card title="Buy clicks by store">
                {data.byStore.length ? (
                  <BarList
                    rows={data.byStore.map((s) => ({
                      key: s.store,
                      value: s.clicks,
                      label: (
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stores[s.store as StoreId]?.color }} />
                          {stores[s.store as StoreId]?.name ?? s.store}
                        </span>
                      ),
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted">No clicks in this period yet.</p>
                )}
              </Card>
              <Card title="Latest enquiries" action={<Link to="/admin/enquiries" className="flex items-center gap-1 text-xs font-semibold text-accent">All <ArrowRight className="size-3.5" /></Link>}>
                {data.recentEnquiries.length ? (
                  <ul className="divide-y divide-line">
                    {data.recentEnquiries.map((e) => (
                      <li key={e.id} className="py-2.5 text-sm">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{e.brand}</span>
                          {e.status === "new" && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase text-accent">New</span>}
                        </span>
                        <span className="block truncate text-xs text-muted">{e.type} · {e.budget}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No enquiries yet.</p>
                )}
              </Card>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Your own visits and clicks aren't counted while you're logged in here. Buy clicks show who went to the store, not who bought;
            sales are in each affiliate program's dashboard. The "views" number on reel cards is the Instagram figure you type in the reel editor.
          </p>
        </div>
      )}
      {!data && !error && <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}
    </div>
  );
}

function SourceTable({ rows }: { rows: AdminStats["sources"] }) {
  const max = Math.max(1, ...rows.map((r) => r.visits));
  return (
    <div>
      <div className="mb-2 grid grid-cols-[7rem_1fr_3.5rem_3.5rem] gap-3 text-xs text-muted">
        <span>Source</span>
        <span>Visits</span>
        <span className="text-right">Clicks</span>
        <span className="text-right">Rate</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.source} className="grid grid-cols-[7rem_1fr_3.5rem_3.5rem] items-center gap-3 text-sm">
            <span className="truncate">{sourceLabels[r.source as TrafficSource] ?? r.source}</span>
            <span className="flex items-center gap-2">
              <span className="h-4 rounded-r-[4px] bg-chart" style={{ width: `${(r.visits / max) * 80}%`, minWidth: r.visits ? 3 : 0 }} />
              <span className="text-xs font-semibold tabular-nums">{r.visits}</span>
            </span>
            <span className="text-right tabular-nums">{r.clicks}</span>
            <span className="text-right text-xs tabular-nums text-muted">{pct(r.clicks, r.visits)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Tip: use <code className="whitespace-nowrap rounded bg-surface-2 px-1">?utm_source=instagram</code> on the bio link and <code className="whitespace-nowrap rounded bg-surface-2 px-1">?utm_source=whatsapp</code> when sharing on WhatsApp, so every visit is labelled correctly.
      </p>
    </div>
  );
}

function Stat({ label, value, text, hint, to, highlight }: { label: string; value?: number; text?: string; hint?: string; to?: string; highlight?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{text ?? (value ?? 0).toLocaleString("en-IN")}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </>
  );
  const cls = cn("block rounded-2xl border bg-surface p-4 shadow-soft", highlight ? "border-accent/50" : "border-line");
  return to ? <Link to={to} className={cn(cls, "transition hover:border-accent")}>{body}</Link> : <div className={cls}>{body}</div>;
}
