import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { DemoContent, SettingsInput } from "@shared/admin";
import type { SiteSettings, Stat } from "@shared/settings";
import { adminApi, ApiError, useAdminQuery } from "../api";
import { MediaInput } from "../MediaInput";
import { Button, Card, ErrorBanner, Field, PageHeader, TextArea, TextInput, useToast } from "../ui";

// Form state: cities as one comma-separated string, story as exactly 3 boxes.
type Form = Omit<SiteSettings, "topCities" | "aboutStory"> & { topCities: string; aboutStory: string[] };

const toForm = (s: SiteSettings): Form => ({
  ...s,
  topCities: s.topCities.join(", "),
  aboutStory: [...s.aboutStory, "", "", ""].slice(0, 3),
});

const toPayload = (f: Form): SettingsInput => ({
  ...f,
  topCities: f.topCities.split(",").map((c) => c.trim()).filter(Boolean),
  aboutStory: f.aboutStory.map((p) => p.trim()).filter(Boolean),
});

export default function SettingsAdmin() {
  const { data, error, reload } = useAdminQuery<{ settings: SiteSettings }>("/settings");
  const toast = useToast();
  const [form, setForm] = useState<Form>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(toForm(data.settings));
  }, [data, form]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setDirty(true);
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k && !key.startsWith(`${k}.`))));
    setForm((f) => f && { ...f, [k]: v });
  };
  const setStat = (k: "stats" | "mediaKitStats", i: number, patch: Partial<Stat>) =>
    form && set(k, form[k].map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setErrors({});
    try {
      await adminApi("/settings", { method: "PUT", body: toPayload(form) });
      setDirty(false);
      toast("success", "Settings saved. The site updates within a minute.");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      toast("error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!form) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;
  const err = (k: string) => errors[k];

  return (
    <div>
      <form onSubmit={save} noValidate>
        <PageHeader
          title="Site settings"
          description="Links, numbers, photos and text shown across the website."
          actions={
            <>
              <a href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent">
                <ExternalLink className="size-4" /> View site
              </a>
              <Button type="submit" variant="primary" loading={saving}>Save settings</Button>
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Social links & contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram handle" error={err("instagramHandle")}>
                <TextInput value={form.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} error={err("instagramHandle")} placeholder="@shopping.with.aartii" />
              </Field>
              <Field label="Instagram profile link" error={err("instagramUrl")}>
                <TextInput value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} error={err("instagramUrl")} />
              </Field>
              <Field
                label="WhatsApp channel link"
                optional
                error={err("whatsappChannelUrl")}
                hint="WhatsApp → Updates → your channel → ⋯ → Channel info → Share link. Leave empty to hide WhatsApp buttons."
                className="sm:col-span-2"
              >
                <TextInput value={form.whatsappChannelUrl} onChange={(e) => set("whatsappChannelUrl", e.target.value)} error={err("whatsappChannelUrl")} placeholder="https://whatsapp.com/channel/…" />
              </Field>
              <Field label="Email for brands" optional error={err("email")} hint="Shown on the About page, footer and policy pages. Leave empty to hide." className="sm:col-span-2">
                <TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={err("email")} placeholder="collab@…" />
              </Field>
            </div>
          </Card>

          <Card title="Home page">
            <div className="space-y-4">
              <Field label="Intro text" error={err("heroIntro")} hint="Under the big “Real outfits. Real prices.” headline.">
                <TextArea rows={3} value={form.heroIntro} onChange={(e) => set("heroIntro", e.target.value)} error={err("heroIntro")} />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">Numbers under the intro</p>
                <StatRows stats={form.stats} prefix="stats" errors={errors} onChange={(i, p) => setStat("stats", i, p)} />
              </div>
            </div>
          </Card>

          <Card title="Photos">
            <div className="grid gap-5">
              <Field label="Home hero" error={err("heroPortrait")}>
                <MediaInput kind="image" folder="site" aspect="aspect-[9/14]" value={form.heroPortrait} onChange={(v) => set("heroPortrait", v)} error={err("heroPortrait")} />
              </Field>
              <Field label="Home “Meet Aarti”" error={err("meetPortrait")}>
                <MediaInput kind="image" folder="site" aspect="aspect-[4/5]" value={form.meetPortrait} onChange={(v) => set("meetPortrait", v)} error={err("meetPortrait")} />
              </Field>
              <Field label="About page" error={err("aboutPortrait")}>
                <MediaInput kind="image" folder="site" aspect="aspect-[4/5]" value={form.aboutPortrait} onChange={(v) => set("aboutPortrait", v)} error={err("aboutPortrait")} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted">Upright photos work best. Her face should be near the top: the hero photo is shown in an arch shape.</p>
          </Card>

          <Card title="About page story">
            <div className="space-y-3">
              {form.aboutStory.map((para, i) => (
                <Field key={i} label={`Paragraph ${i + 1}`} optional={i > 0}>
                  <TextArea rows={3} value={para} onChange={(e) => set("aboutStory", form.aboutStory.map((p, j) => (j === i ? e.target.value : p)))} />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Media kit (About page, for brands)" className="xl:col-span-2">
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <div>
                <p className="mb-1.5 text-sm font-medium">Numbers <span className="text-xs font-normal text-muted">(from Instagram Insights)</span></p>
                <StatRows stats={form.mediaKitStats} prefix="mediaKitStats" errors={errors} onChange={(i, p) => setStat("mediaKitStats", i, p)} />
              </div>
              <Field label="Top cities" hint="Comma separated, up to 8." error={err("topCities")}>
                <TextInput value={form.topCities} onChange={(e) => set("topCities", e.target.value)} placeholder="Mumbai, Pune, Delhi NCR" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
          <Button type="submit" variant="primary" loading={saving}>Save settings</Button>
        </div>
      </form>

      <DemoContentCard />
    </div>
  );
}

function StatRows({ stats, prefix, errors, onChange }: { stats: Stat[]; prefix: string; errors: Record<string, string>; onChange: (i: number, patch: Partial<Stat>) => void }) {
  return (
    <div className="space-y-2">
      {stats.map((s, i) => (
        <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-2">
          <TextInput aria-label={`Number ${i + 1}`} value={s.value} onChange={(e) => onChange(i, { value: e.target.value })} error={errors[`${prefix}.${i}.value`]} placeholder="50K+" maxLength={12} />
          <TextInput aria-label={`Label ${i + 1}`} value={s.label} onChange={(e) => onChange(i, { label: e.target.value })} error={errors[`${prefix}.${i}.label`]} placeholder="shoppers" maxLength={40} />
        </div>
      ))}
    </div>
  );
}

function DemoContentCard() {
  const { data, error, reload } = useAdminQuery<DemoContent>("/demo-content");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const total = data ? data.reels.length + data.events.length + data.deals.length : 0;

  async function clear() {
    if (!data || !confirm(`Delete ${data.reels.length} demo reels (with their products), ${data.events.length} demo sales and ${data.deals.length} demo deals? Your own reels are not touched. This can't be undone.`)) return;
    setBusy(true);
    try {
      const { removed } = await adminApi<{ removed: DemoContent }>("/demo-content/clear", { body: {} });
      toast("success", `Removed ${removed.reels.length} reels, ${removed.events.length} sales and ${removed.deals.length} deals`);
      reload();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Demo content" className="mt-8">
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && total === 0 && <p className="text-sm text-muted">No demo content left. Everything on the site is yours.</p>}
      {data && total > 0 && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm">
            <p className="text-muted">
              The starter catalogue (stock videos and plain store links that earn nothing) is still on the site. Remove it once you have a
              few of your own reels. Demo reels you've edited to use your own video are kept.
            </p>
            <ul className="mt-3 space-y-1">
              <li><b>{data.reels.length}</b> demo reels{data.reels.length > 0 && <span className="text-muted">: {data.reels.map((r) => `#${r.code}`).join(", ")}</span>}</li>
              <li><b>{data.events.length}</b> demo sales on the Deals page</li>
              <li><b>{data.deals.length}</b> demo loot deals</li>
            </ul>
          </div>
          <Button type="button" variant="danger" loading={busy} onClick={clear}>
            <Trash2 className="size-4" /> Remove demo content
          </Button>
        </div>
      )}
    </Card>
  );
}
