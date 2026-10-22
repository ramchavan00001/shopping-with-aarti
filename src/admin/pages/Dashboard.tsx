import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { AdminStats } from "@shared/admin";
import { stores } from "@shared/stores";
import type { StoreId } from "@shared/types";
import { cn } from "@/lib/format";
import { StoreBadge } from "@/components/StoreBadge";
import { resolveMedia, useAdminQuery } from "../api";
import { BarList, ClickChart } from "../ClickChart";
import { useAdminConfig } from "../context";
import { Card, Empty, ErrorBanner, PageHeader } from "../ui";

const periods = [7, 30, 90];

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { data, error, reload } = useAdminQuery<AdminStats>(`/stats?days=${days}`);
  const { mediaBaseUrl } = useAdminConfig();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="How shoppers are using the site. Clicks are taps on Buy, Grab deal and Shop the sale buttons."
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label={`Clicks, last ${days} days`} value={data.totals.clicks} />
            <Stat label="Clicks today" value={data.totals.clicksToday} />
            <Stat label="Live products" value={data.totals.products} />
            <Stat label="Reels" value={data.totals.reels} />
            <Stat label="New enquiries" value={data.totals.newEnquiries} to="/admin/enquiries" highlight={data.totals.newEnquiries > 0} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card title="Clicks per day">
              <ClickChart data={data.clicksByDay} />
            </Card>
            <Card title="Clicks by store">
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
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
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
              <Card title="Top reels">
                {data.topReels.length ? (
                  <ul className="space-y-2">
                    {data.topReels.map((r) => (
                      <li key={r.code}>
                        <Link to={`/admin/reels/${r.code}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2">
                          <img src={resolveMedia(r.poster, mediaBaseUrl)} alt="" className="h-12 w-9 rounded-md object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-accent">#{r.code}</span>
                            <span className="block truncate text-sm">{r.title}</span>
                          </span>
                          <span className="text-sm font-semibold tabular-nums">{r.clicks}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No reel clicks in this period yet.</p>
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
        </div>
      )}
      {!data && !error && <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}
    </div>
  );
}

function Stat({ label, value, to, highlight }: { label: string; value: number; to?: string; highlight?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
    </>
  );
  const cls = cn("block rounded-2xl border bg-surface p-4 shadow-soft", highlight ? "border-accent/50" : "border-line");
  return to ? <Link to={to} className={cn(cls, "transition hover:border-accent")}>{body}</Link> : <div className={cls}>{body}</div>;
}
