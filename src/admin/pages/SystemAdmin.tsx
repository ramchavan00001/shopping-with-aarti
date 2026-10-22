import { BellRing, ChevronDown, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SystemStatus } from "@shared/admin";
import { cn } from "@/lib/format";
import { adminApi, useAdminQuery } from "../api";
import { Button, Card, Empty, ErrorBanner, PageHeader, useToast } from "../ui";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";

const jobLabels: Record<string, { label: string; run: string }> = {
  "link-check": { label: "Broken-link check (daily)", run: "/links/check" },
  "instagram-sync": { label: "Instagram sync (every 6 hours)", run: "/instagram/sync" },
};

export default function SystemAdmin() {
  const { data, error, reload } = useAdminQuery<SystemStatus>("/system");
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(null);
  const site = typeof location !== "undefined" ? location.origin : "";

  async function testAlert() {
    try {
      await adminApi("/system/test-alert", { body: {} });
      toast("success", "Test alert sent. Check your phone.");
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }
  async function runJob(path: string) {
    await adminApi(path, { body: {} }).catch((e) => toast("error", (e as Error).message));
    toast("success", "Started");
    setTimeout(reload, 2000);
  }
  async function clearErrors(id?: number) {
    if (!id && !confirm("Clear the whole error log?")) return;
    await adminApi(id ? `/system/errors/${id}` : "/system/errors", { method: "DELETE", body: {} });
    reload();
  }

  return (
    <div>
      <PageHeader title="System" description="Alerts, uptime monitoring, background jobs and errors." />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <Card
              title="Alerts to your phone"
              action={<Button size="sm" onClick={testAlert} disabled={!data.alerts.telegram && !data.alerts.webhook}><BellRing className="size-3.5" /> Send test alert</Button>}
            >
              <p className="text-sm">
                Status:{" "}
                {data.alerts.telegram || data.alerts.webhook ? (
                  <b className="text-emerald-700 dark:text-emerald-400">On ({[data.alerts.telegram && "Telegram", data.alerts.webhook && "webhook"].filter(Boolean).join(" + ")})</b>
                ) : (
                  <b className="text-amber-700 dark:text-amber-400">Not set up</b>
                )}
              </p>
              <p className="mt-2 text-sm text-muted">You'll get a message when the site errors, a job fails, or affiliate links break.</p>
              {!data.alerts.telegram && (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
                  <li>In Telegram, open <b>@BotFather</b>, send <code className="rounded bg-surface-2 px-1">/newbot</code>, pick a name. Copy the <b>bot token</b>.</li>
                  <li>Open your new bot and send it any message (e.g. “hi”).</li>
                  <li>
                    Open <code className="break-all rounded bg-surface-2 px-1">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> in a browser and copy
                    the number after <code className="rounded bg-surface-2 px-1">"chat":{"{"}"id":</code>
                  </li>
                  <li>In Render → Environment, add <b>TELEGRAM_BOT_TOKEN</b> and <b>TELEGRAM_CHAT_ID</b>, save and redeploy.</li>
                </ol>
              )}
            </Card>

            <Card title="Uptime monitoring">
              <p className="text-sm text-muted">A free outside service checks the site every 5 minutes and tells you if it's down.</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
                <li>Sign up free at <a className="font-semibold text-accent underline" href="https://uptimerobot.com" target="_blank" rel="noopener">uptimerobot.com</a>.</li>
                <li>
                  <b>New monitor</b> → type <b>HTTP(s)</b> → URL <code className="break-all rounded bg-surface-2 px-1">{site}/api/health</code> → interval 5 minutes.
                </li>
                <li>Choose how to be alerted (email, the mobile app, or Telegram) and save.</li>
              </ol>
              <p className="mt-3 text-xs text-muted">
                On Render's free plan this also keeps the site awake, so visitors don't wait for it to start and the daily jobs run on time.
              </p>
            </Card>
          </div>

          <Card title="Background jobs">
            <ul className="divide-y divide-line">
              {data.jobs.map((j) => (
                <li key={j.name} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{jobLabels[j.name]?.label ?? j.name}</p>
                    <p className="text-xs text-muted">
                      Last run {when(j.lastFinishedAt ?? j.lastStartedAt)} ·{" "}
                      <span className={cn(j.lastStatus === "failed" && "font-semibold text-red-600 dark:text-red-400")}>{j.lastStatus ?? "not run yet"}</span>
                      {j.lastSummary ? ` · ${j.lastSummary}` : ""}
                    </p>
                  </div>
                  {jobLabels[j.name] && (
                    <Button size="sm" onClick={() => runJob(jobLabels[j.name].run)} disabled={j.lastStatus === "running"}>
                      <Play className="size-3.5" /> Run now
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Errors (${data.errors.length})`} action={data.errors.length > 0 && <Button size="sm" variant="ghost" onClick={() => clearErrors()}><Trash2 className="size-3.5" /> Clear all</Button>}>
            {!data.errors.length ? (
              <Empty title="No errors 🎉">Problems on the site or in shoppers' browsers will show up here.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {data.errors.map((e) => (
                  <li key={e.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", e.origin === "client" ? "bg-surface-2 text-muted" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200")}>
                        {e.origin === "client" ? "browser" : e.origin}
                      </span>
                      <button onClick={() => setOpen(open === e.id ? null : e.id)} className="min-w-0 flex-1 text-left">
                        <p className="break-words text-sm font-medium">{e.message}</p>
                        <p className="text-xs text-muted">
                          {e.count}× · last {when(e.lastSeen)}{e.path ? ` · ${e.path}` : ""}
                        </p>
                      </button>
                      <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted transition", open === e.id && "rotate-180")} />
                      <button onClick={() => clearErrors(e.id)} aria-label="Dismiss" className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"><Trash2 className="size-3.5" /></button>
                    </div>
                    {open === e.id && e.detail && <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-surface-2 p-3 text-[11px] leading-relaxed">{e.detail}</pre>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      {!data && !error && <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}
    </div>
  );
}
