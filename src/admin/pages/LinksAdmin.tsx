import { ExternalLink, Loader2, Pencil, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { LinkCheckRow, LinkHealth } from "@shared/admin";
import { cn } from "@/lib/format";
import { adminApi, useAdminQuery } from "../api";
import { Button, Card, Empty, ErrorBanner, PageHeader, useToast } from "../ui";

const badge: Record<LinkCheckRow["status"], { label: string; cls: string }> = {
  broken: { label: "Broken", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  error: { label: "Couldn't connect", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  blocked: { label: "Store blocked check", cls: "bg-surface-2 text-muted" },
  unchecked: { label: "Not checked yet", cls: "bg-surface-2 text-muted" },
  ok: { label: "OK", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";

export default function LinksAdmin() {
  const { data, error, reload } = useAdminQuery<LinkHealth>("/links");
  const toast = useToast();
  const [checking, setChecking] = useState<string | null>(null);
  const [showOk, setShowOk] = useState(false);
  const running = data?.job?.lastStatus === "running";

  // While a full check runs, refresh every few seconds.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [running, reload]);

  async function checkAll() {
    await adminApi("/links/check", { body: {} });
    toast("success", "Checking all links… this takes a minute or two.");
    setTimeout(reload, 1500);
  }
  async function checkOne(id: string) {
    setChecking(id);
    try {
      await adminApi(`/links/${id}/check`, { body: {} });
      reload();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setChecking(null);
    }
  }

  const rows = (data?.links ?? []).filter((l) => showOk || l.status !== "ok");

  return (
    <div>
      <PageHeader
        title="Link health"
        description="Every buy, deal and sale link is checked once a day. Broken links get an alert."
        actions={
          <Button variant="primary" onClick={checkAll} loading={running}>
            <RefreshCw className="size-4" /> {running ? "Checking…" : "Check all links now"}
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["broken", "error", "blocked", "unchecked", "ok"] as const).map((k) => (
              <div key={k} className={cn("rounded-2xl border bg-surface p-4", k === "broken" && data.counts.broken ? "border-red-400" : "border-line")}>
                <p className="text-xs text-muted">{badge[k].label}</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{data.counts[k]}</p>
              </div>
            ))}
          </div>
          <p className="mb-4 text-xs text-muted">
            Last full check: {when(data.job?.lastFinishedAt ?? null)}
            {data.job?.lastSummary ? ` · ${data.job.lastSummary}` : ""}. “Store blocked check” is normal for big stores like Amazon: open those links
            yourself to confirm they work.
          </p>
          <Card
            title={showOk ? "All links" : "Links that need a look"}
            action={
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={showOk} onChange={(e) => setShowOk(e.target.checked)} /> Show OK links too
              </label>
            }
          >
            {!rows.length ? (
              <Empty title={data.links.length ? "All good!" : "No links yet"}>{data.links.length ? "No broken links found." : "Add products to reels first."}</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((l) => (
                  <li key={l.targetId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge[l.status].cls)}>
                          {badge[l.status].label}
                          {l.httpStatus ? ` · ${l.httpStatus}` : ""}
                        </span>
                        {l.reelCode && <span className="text-xs font-bold text-accent">#{l.reelCode}</span>}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{l.label}</p>
                      <p className="truncate text-xs text-muted">{l.detail ?? l.url} · checked {when(l.checkedAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">
                        <ExternalLink className="size-3.5" /> Open
                      </a>
                      <button onClick={() => checkOne(l.targetId)} disabled={checking === l.targetId} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">
                        {checking === l.targetId ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-check
                      </button>
                      <Link
                        to={l.kind === "product" && l.reelCode ? `/admin/reels/${l.reelCode}` : "/admin/deals"}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
                      >
                        <Pencil className="size-3.5" /> Fix
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
      {!data && !error && <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}
    </div>
  );
}
