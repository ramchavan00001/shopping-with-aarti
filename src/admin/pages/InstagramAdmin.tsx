import { CheckCircle2, ExternalLink, Loader2, Pencil, RefreshCw, Unplug } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { InstagramMedia, InstagramStatus } from "@shared/admin";
import { InstagramIcon } from "@/components/icons";
import { adminApi, ApiError, useAdminQuery } from "../api";
import { useAdminConfig } from "../context";
import { Button, Card, Empty, ErrorBanner, Field, PageHeader, TextInput, Toggle, useToast } from "../ui";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";

export default function InstagramAdmin() {
  const status = useAdminQuery<InstagramStatus>("/instagram");
  const { uploadsEnabled } = useAdminConfig();

  return (
    <div>
      <PageHeader
        title="Instagram auto-sync"
        description="New reels from Instagram arrive here as hidden drafts with the video and cover copied over. Add the products, then publish."
      />
      {status.error && <ErrorBanner message={status.error} onRetry={status.reload} />}
      {!uploadsEnabled && (
        <div className="mb-5">
          <ErrorBanner message="Cloudflare R2 uploads must be set up first: imported videos are stored there." />
        </div>
      )}
      {status.data && (status.data.connected ? <Connected status={status.data} reload={status.reload} /> : <Connect onDone={status.reload} />)}
      {!status.data && !status.error && <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}
    </div>
  );
}

function Connect({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    try {
      await adminApi("/instagram/token", { method: "PUT", body: { token } });
      toast("success", "Instagram connected");
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card title="One-time setup (about 15 minutes)">
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          <li>
            Make sure <b>@shopping.with.aartii</b> is a <b>professional account</b>: Instagram → Settings → Account type and tools → Switch to
            professional (Creator).
          </li>
          <li>
            Go to <a className="font-semibold text-accent underline" href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com/apps</a>,
            log in with Facebook and click <b>Create app</b>. Pick the use case for managing <b>Instagram</b> content/messaging, app type <b>Business</b>.
          </li>
          <li>
            In the app, open <b>Instagram → API setup with Instagram login</b>. Under <b>Generate access tokens</b>, click <b>Add account</b>, log in as
            Aarti's Instagram and allow access.
          </li>
          <li>Click <b>Generate token</b> next to the account and copy the long token.</li>
          <li>Paste it on the right and click <b>Connect</b>. The site renews it automatically every week.</li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          The app can stay in development mode: it only needs to read Aarti's own reels, so no Meta app review is needed. Menu names on Meta's
          site change from time to time; look for the closest match.
        </p>
      </Card>
      <Card title="Connect">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Instagram access token" error={err}>
            <TextInput value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA…" autoComplete="off" error={err} />
          </Field>
          <Button type="submit" variant="primary" loading={busy} disabled={token.trim().length < 20}>
            <InstagramIcon className="size-4" /> Connect
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Connected({ status, reload }: { status: InstagramStatus; reload: () => void }) {
  const media = useAdminQuery<{ media: InstagramMedia[] }>("/instagram/media");
  const toast = useToast();
  const [importing, setImporting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function importOne(id: string) {
    setImporting(id);
    try {
      const { code } = await adminApi<{ code: string }>(`/instagram/import/${id}`, { body: {} });
      toast("success", `Imported as draft #${code}`);
      media.reload();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setImporting(null);
    }
  }
  async function syncNow() {
    setSyncing(true);
    try {
      const { job } = await adminApi<{ job: InstagramStatus["job"] }>("/instagram/sync", { body: {} });
      toast(job?.lastStatus === "failed" ? "error" : "success", job?.lastSummary ?? "Sync finished");
      reload();
      media.reload();
    } finally {
      setSyncing(false);
    }
  }
  async function setAuto(on: boolean) {
    await adminApi("/instagram/auto-import", { method: "PUT", body: { on } });
    reload();
  }
  async function disconnect() {
    if (!confirm("Disconnect Instagram? Already imported reels stay.")) return;
    await adminApi("/instagram", { method: "DELETE", body: {} });
    reload();
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
            <InstagramIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-4 text-emerald-600" /> Connected as @{status.username ?? "instagram"}</p>
            <p className="text-xs text-muted">
              Last sync {when(status.lastSyncAt)}{status.job?.lastSummary ? ` · ${status.job.lastSummary}` : ""} · token renewed {when(status.tokenRefreshedAt)}
            </p>
          </div>
          <Toggle checked={status.autoImport} onChange={setAuto} label="Import new reels automatically" hint="Checks every 6 hours while the site is awake." />
          <div className="flex gap-2">
            <Button onClick={syncNow} loading={syncing}><RefreshCw className="size-4" /> Sync now</Button>
            <Button variant="ghost" onClick={disconnect}><Unplug className="size-4" /> Disconnect</Button>
          </div>
        </div>
      </Card>

      <Card title="Recent reels on Instagram" action={<button onClick={media.reload} className="text-xs font-semibold text-accent">Refresh</button>}>
        {media.error && <ErrorBanner message={media.error} onRetry={media.reload} />}
        {media.data && !media.data.media.length && <Empty title="No reels found">Only videos/reels are listed.</Empty>}
        {media.data && media.data.media.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {media.data.media.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-2xl border border-line bg-bg">
                <div className="relative aspect-[9/16] bg-surface-2">
                  {m.thumbnailUrl && <img src={m.thumbnailUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />}
                  <a href={m.permalink} target="_blank" rel="noopener" aria-label="Open on Instagram" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-xs">{m.caption || "No caption"}</p>
                  <p className="text-[11px] text-muted">{new Date(m.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  {m.importedAs ? (
                    <Link to={`/admin/reels/${m.importedAs}`} className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-accent-soft py-2 text-xs font-semibold text-accent">
                      <Pencil className="size-3.5" /> #{m.importedAs}: add products
                    </Link>
                  ) : (
                    <button onClick={() => importOne(m.id)} disabled={!!importing} className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-ink py-2 text-xs font-semibold text-bg disabled:opacity-60">
                      {importing === m.id ? <Loader2 className="size-3.5 animate-spin" /> : null} Import as draft
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!media.data && !media.error && <div className="h-40 animate-pulse rounded-xl bg-surface-2" />}
      </Card>
    </div>
  );
}
