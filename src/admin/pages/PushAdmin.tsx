import { Bell, Clapperboard, Flame, Loader2, Send, Smartphone, Tag } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { PushMessageInput, PushStatus } from "@shared/admin";
import type { DealsPayload, HomePayload } from "@shared/types";
import { lookPath } from "@shared/paths";
import { stores } from "@shared/stores";
import { useApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { ownEndpoint, usePush } from "@/lib/push";
import { adminApi, ApiError, useAdminQuery } from "../api";
import { Button, Card, Empty, ErrorBanner, Field, PageHeader, TextArea, TextInput, useToast } from "../ui";

type Form = Required<Omit<PushMessageInput, "testEndpoint">>;
const blank: Form = { title: "", body: "", titleHi: "", bodyHi: "", url: "/deals", image: "" };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Ready-made messages (English and Hindi) from the newest reel, live sales and loot deals. */
function useTemplates() {
  const { data: home } = useApi<HomePayload>("/api/home");
  const { data: deals } = useApi<DealsPayload>("/api/deals");
  const out: { key: string; icon: typeof Bell; label: string; form: Form }[] = [];
  const reel = home?.latest[0];
  if (reel) {
    out.push({
      key: `reel-${reel.code}`,
      icon: Clapperboard,
      label: `New reel #${reel.code}`,
      form: {
        title: `New try-on: ${reel.title}`.slice(0, 60),
        body: `Shop all ${reel.products.length} items from look #${reel.code}. Tap to watch.`,
        titleHi: `नया ट्राय-ऑन: ${reel.title}`.slice(0, 60),
        bodyHi: `लुक #${reel.code} के सभी ${reel.products.length} आइटम खरीदें। देखने के लिए टैप करें।`,
        url: lookPath(reel),
        image: reel.poster,
      },
    });
  }
  for (const e of deals?.events.filter((e) => e.status === "live").slice(0, 2) ?? []) {
    out.push({
      key: `sale-${e.id}`,
      icon: Flame,
      label: `${e.name} is live`,
      form: {
        title: `${e.name} is live!`.slice(0, 60),
        body: (e.headline || `My picks from the ${stores[e.store].name} sale are up. Tap to shop.`).slice(0, 160),
        titleHi: `${e.name} शुरू हो गई!`.slice(0, 60),
        bodyHi: `${stores[e.store].name} सेल से मेरी पसंद की चीज़ें तैयार हैं। खरीदने के लिए टैप करें।`,
        url: "/deals",
        image: "",
      },
    });
  }
  for (const d of deals?.loot.slice(0, 2) ?? []) {
    // Amazon's rules don't allow copied prices, so Amazon deals go out without one.
    const price = d.showPrice ? `Now ${formatPrice(d.dealPrice)} (was ${formatPrice(d.mrp)}). ` : "";
    const priceHi = d.showPrice ? `अब सिर्फ़ ${formatPrice(d.dealPrice)} (पहले ${formatPrice(d.mrp)})। ` : "";
    out.push({
      key: `loot-${d.id}`,
      icon: Tag,
      label: `Loot: ${d.title}`,
      form: {
        title: `Loot deal: ${d.title}`.slice(0, 60),
        body: `${price}Grab it on ${stores[d.store].name} before it's gone.`.slice(0, 160),
        titleHi: `लूट डील: ${d.title}`.slice(0, 60),
        bodyHi: `${priceHi}ख़त्म होने से पहले ${stores[d.store].name} पर ले लें।`.slice(0, 160),
        url: "/deals",
        image: d.image,
      },
    });
  }
  return out;
}

function Preview({ title, body, image }: { title: string; body: string; image: string }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-900">
      <div className="flex gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-neutral-800">
        <img src="/icons/icon-192.png" alt="" className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-neutral-500">Shopping with Aarti · now</p>
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{title || "Title"}</p>
          <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{body || "Message"}</p>
          {image && <img src={image} alt="" className="mt-2 aspect-[2/1] w-full rounded-lg object-cover" />}
        </div>
      </div>
    </div>
  );
}

export default function PushAdmin() {
  const { data, error, reload } = useAdminQuery<PushStatus>("/push");
  const templates = useTemplates();
  const toast = useToast();
  const device = usePush("en");
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<"" | "test" | "all">("");

  // Refresh while a send is still going out.
  const busy = data?.messages.some((m) => m.status === "sending");
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(reload, 3000);
    return () => clearInterval(id);
  }, [busy, reload]);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function send(test: boolean) {
    setErrors({});
    let testEndpoint: string | undefined;
    if (test) {
      testEndpoint = (await ownEndpoint()) ?? undefined;
      if (!testEndpoint) return toast("error", "Turn on notifications on this device first (button on the right).");
    } else if (!confirm(`Send this notification to ${data?.subscribers ?? 0} people now? This can't be undone.`)) {
      return;
    }
    setSending(test ? "test" : "all");
    try {
      const res = await adminApi<{ test: boolean; delivered?: boolean }>("/push/send", { body: { ...form, testEndpoint } });
      if (res.test) toast(res.delivered ? "success" : "error", res.delivered ? "Test sent. Check this device." : "Couldn't deliver to this device. Turn notifications off and on again.");
      else {
        toast("success", "Sending now…");
        setForm(blank);
        reload();
      }
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      toast("error", (err as Error).message);
    } finally {
      setSending("");
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(false);
  };

  return (
    <div>
      <PageHeader title="Push notifications" description="Send a deal alert straight to the phones of people who turned on notifications." />
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Notification subscribers", value: data?.subscribers },
          { label: "…reading in Hindi", value: data?.hindi },
          { label: "App installs (30 days)", value: data?.installs },
          { label: "Visits from the app (30 days)", value: data?.appVisits },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{s.value ?? "–"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="New notification">
          {templates.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-muted">Start from</p>
              <div className="flex flex-wrap gap-2">
                {templates.map(({ key, icon: Icon, label, form: f }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setForm(f);
                      setErrors({});
                    }}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                  >
                    <Icon className="size-3.5 shrink-0" /> <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Title" error={errors.title} hint={`${form.title.length}/60`}>
              <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={60} placeholder="Myntra EORS is live!" />
            </Field>
            <Field label="Message" error={errors.body} hint={`${form.body.length}/160`}>
              <TextArea rows={2} value={form.body} onChange={(e) => set("body", e.target.value)} error={errors.body} maxLength={160} placeholder="My top 10 picks under ₹999 are up. Tap to shop." />
            </Field>
            <div className="grid gap-4 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
              <p className="text-xs text-muted sm:col-span-2">
                Hindi version (optional): people reading the site in Hindi get this instead. Leave empty to send the English one to everyone.
              </p>
              <Field label="Title in Hindi" optional error={errors.titleHi}>
                <TextInput lang="hi" value={form.titleHi} onChange={(e) => set("titleHi", e.target.value)} maxLength={60} placeholder="Myntra सेल शुरू!" />
              </Field>
              <Field label="Message in Hindi" optional error={errors.bodyHi}>
                <TextInput lang="hi" value={form.bodyHi} onChange={(e) => set("bodyHi", e.target.value)} maxLength={160} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opens" error={errors.url} hint="A page of the site, e.g. /deals or /look/a113-…">
                <TextInput value={form.url} onChange={(e) => set("url", e.target.value)} error={errors.url} />
              </Field>
              <Field label="Picture" optional error={errors.image} hint="Big picture on Android and Windows. Paste an image link.">
                <TextInput value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…" />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" onClick={() => send(true)} loading={sending === "test"} disabled={!!sending}>
                <Smartphone className="size-4" /> Test on this device
              </Button>
              <Button type="submit" variant="primary" loading={sending === "all"} disabled={!!sending || !data?.subscribers}>
                <Send className="size-4" /> Send to {data?.subscribers ?? 0}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card title="Preview">
            <Preview title={form.title} body={form.body} image={form.image} />
            <p className="mt-3 text-xs text-muted">Each phone shows it a little differently. iPhones don't show the picture.</p>
          </Card>
          <Card title="This device">
            <p className="text-sm text-muted">Turn on notifications here to receive your own tests.</p>
            <div className="mt-3">
              {device.state === "on" ? (
                <Button onClick={device.turnOff} loading={device.busy}>Turn off on this device</Button>
              ) : device.state === "off" ? (
                <Button onClick={device.turnOn} loading={device.busy}><Bell className="size-4" /> Turn on on this device</Button>
              ) : device.state === "loading" ? (
                <Loader2 className="size-4 animate-spin text-muted" />
              ) : (
                <p className="text-sm text-muted">
                  {device.state === "blocked" ? "Notifications are blocked for this site in the browser settings." : "This browser can't receive notifications (on iPhone, add the site to the home screen and open it from there)."}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Sent" className="mt-5">
        {data && !data.messages.length ? (
          <Empty title="Nothing sent yet">Your notifications and how many people tapped them show up here.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data?.messages.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="truncate text-xs text-muted">{m.body} · {m.url}</p>
                </div>
                <p className="text-xs text-muted">{when(m.createdAt)}</p>
                <p className="w-44 text-right text-xs">
                  {m.status === "sending" ? (
                    <span className="inline-flex items-center gap-1 text-muted"><Loader2 className="size-3 animate-spin" /> Sending…</span>
                  ) : (
                    <>
                      <b>{m.sent}</b> delivered · <b>{m.clicks}</b> taps
                      {m.failed > 0 && <span className="text-muted"> · {m.failed} gone</span>}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Followers turn notifications on from the Deals page or /alerts. Keep it to a few a week: people who get too many turn them off.
        "Gone" means the phone has turned notifications off since; it's removed from the list automatically.
      </p>
    </div>
  );
}
