import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { slugify, type AdminCategory, type AdminReel, type ProductInput, type ReelInput } from "@shared/admin";
import { lookPath } from "@shared/paths";
import { detectStore, stores } from "@shared/stores";
import { colours, occasions, type Colour, type Occasion, type StoreId } from "@shared/types";
import { cn } from "@/lib/format";
import { adminApi, ApiError, useAdminQuery } from "../api";
import { useAdminConfig } from "../context";
import { MediaInput } from "../MediaInput";
import { Button, Card, ErrorBanner, Field, PageHeader, Select, TextArea, TextInput, Toggle, useToast } from "../ui";

// Form state keeps numbers as strings so inputs can be empty while typing.
type ProductForm = Omit<ProductInput, "approxPrice" | "mrp" | "note" | "sizeTip" | "colour" | "occasions"> & {
  key: string;
  approxPrice: string;
  mrp: string;
  note: string;
  sizeTip: string;
  colour: Colour | "";
  occasions: Occasion[];
};
type ReelForm = Omit<ReelInput, "products" | "views" | "tags" | "instagramUrl"> & {
  views: string;
  tags: string;
  instagramUrl: string;
  products: ProductForm[];
};

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const key = () => Math.random().toString(36).slice(2);

const blankProduct = (category: string): ProductForm => ({
  key: key(),
  title: "",
  store: "amazon",
  affiliateUrl: "",
  image: "",
  approxPrice: "",
  mrp: "",
  category,
  note: "",
  sizeTip: "",
  colour: "",
  occasions: [],
  isActive: true,
});

function toForm(r: AdminReel): ReelForm {
  return {
    code: r.code,
    slug: r.slug,
    title: r.title,
    caption: r.caption,
    video: r.video,
    poster: r.poster,
    instagramUrl: r.instagramUrl ?? "",
    category: r.category,
    tags: r.tags.join(", "),
    publishedAt: r.publishedAt,
    isFeatured: !!r.isFeatured,
    isPublished: r.isPublished !== false,
    views: String(r.views ?? 0),
    products: r.products.map((p) => ({
      key: p.id,
      id: p.id,
      title: p.title,
      store: p.store,
      affiliateUrl: p.affiliateUrl,
      image: p.image,
      approxPrice: p.approxPrice != null ? String(p.approxPrice) : "",
      mrp: p.mrp != null ? String(p.mrp) : "",
      category: p.category,
      note: p.note ?? "",
      sizeTip: p.sizeTip ?? "",
      colour: p.colour ?? "",
      occasions: p.occasions ?? [],
      isActive: p.isActive,
    })),
  };
}

function toPayload(f: ReelForm): ReelInput {
  const num = (s: string) => (s.trim() === "" ? null : Math.round(Number(s.replace(/[₹,\s]/g, ""))));
  return {
    ...f,
    views: Number(f.views) || 0,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    instagramUrl: f.instagramUrl.trim() || null,
    products: f.products.map(({ key: _k, ...p }) => ({
      ...p,
      approxPrice: num(p.approxPrice),
      mrp: num(p.mrp),
      note: p.note || null,
      sizeTip: p.sizeTip || null,
      colour: p.colour || null,
    })),
  };
}

export default function ReelEditor() {
  const { code } = useParams();
  const isNew = !code;
  const navigate = useNavigate();
  const toast = useToast();
  const { nextReelCode } = useAdminConfig();
  const existing = useAdminQuery<{ reel: AdminReel }>(isNew ? null : `/reels/${code}`);
  const cats = useAdminQuery<{ categories: AdminCategory[] }>("/categories");

  const [form, setForm] = useState<ReelForm>();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Initialise once data is in.
  useEffect(() => {
    if (form) return;
    if (!isNew && existing.data) setForm(toForm(existing.data.reel));
    if (isNew && cats.data) {
      const first = cats.data.categories[0]?.slug ?? "";
      setForm({
        code: nextReelCode,
        slug: "",
        title: "",
        caption: "",
        video: "",
        poster: "",
        instagramUrl: "",
        category: first,
        tags: "",
        publishedAt: today(),
        isFeatured: false,
        isPublished: true,
        views: "0",
        products: [blankProduct(first)],
      });
    }
  }, [existing.data, cats.data, isNew, form, nextReelCode]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const categories = cats.data?.categories ?? [];
  const clearError = (...keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  const set = <K extends keyof ReelForm>(k: K, v: ReelForm[K]) => {
    setDirty(true);
    clearError(k, ...(k === "title" ? ["slug"] : []));
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [k]: v };
      if (k === "title" && !slugTouched) next.slug = slugify(String(v));
      return next;
    });
  };
  const setProduct = (i: number, patch: Partial<ProductForm>) => {
    setDirty(true);
    clearError(...Object.keys(patch).map((k) => `products.${i}.${k}`));
    setForm((f) => f && { ...f, products: f.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  };
  const moveProduct = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      if (!f) return f;
      const list = [...f.products];
      const j = i + dir;
      if (j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      setDirty(true);
      return { ...f, products: list };
    });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setErrors({});
    setFormError(undefined);
    try {
      const payload = toPayload(form);
      const { reel } = await adminApi<{ reel: AdminReel }>(isNew ? "/reels" : `/reels/${code}`, { method: isNew ? "POST" : "PUT", body: payload });
      setDirty(false);
      setForm(toForm(reel));
      toast("success", isNew ? `Reel #${reel.code} created` : "Changes saved");
      if (isNew || reel.code !== code) navigate(`/admin/reels/${reel.code}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        setFormError(err.message);
      } else setFormError("Couldn't save. Check your connection.");
      requestAnimationFrame(() => document.querySelector("[data-has-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!code || !confirm(`Delete reel #${code} and all its products? This can't be undone.`)) return;
    try {
      await adminApi(`/reels/${code}`, { method: "DELETE", body: {} });
      setDirty(false);
      toast("success", `Reel #${code} deleted`);
      navigate("/admin/reels");
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  const productErrorCount = useMemo(() => Object.keys(errors).filter((k) => k.startsWith("products.")).length, [errors]);

  if (existing.error) return <ErrorBanner message={existing.error} onRetry={existing.reload} />;
  if (!form) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={save} noValidate>
      <Link to="/admin/reels" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All reels
      </Link>
      <PageHeader
        title={isNew ? "Add a reel" : `Edit #${code}`}
        description={isNew ? "Upload the reel, then add every product shown in it." : form.title}
        actions={
          <>
            {!isNew && form.isPublished && (
              <a href={lookPath({ code: form.code, slug: form.slug })} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent">
                <ExternalLink className="size-4" /> View on site
              </a>
            )}
            <Button type="submit" variant="primary" loading={saving}>{isNew ? "Create reel" : "Save changes"}</Button>
          </>
        }
      />

      {formError && (
        <div className="mb-5">
          <ErrorBanner message={productErrorCount ? `${formError} (${productErrorCount} in products)` : formError} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-5">
          <Card title="Reel video">
            <div className="space-y-4">
              <Field label="Video" error={err("video")} hint="MP4, 9:16, ideally 720×1280." >
                <div data-has-error={!!err("video")}>
                  <MediaInput kind="video" folder="reels" value={form.video} onChange={(v) => set("video", v)} />
                </div>
              </Field>
              <Field label="Cover image" error={err("poster")} hint="Shown before the video plays.">
                <div data-has-error={!!err("poster")}>
                  <MediaInput kind="image" folder="posters" aspect="aspect-[9/16]" value={form.poster} onChange={(v) => set("poster", v)} />
                </div>
              </Field>
            </div>
          </Card>
          <Card title="Visibility">
            <div className="space-y-4">
              <Toggle checked={form.isPublished ?? true} onChange={(v) => set("isPublished", v)} label="Show on site" hint="Turn off to hide this reel without deleting it." />
              <Toggle checked={form.isFeatured ?? false} onChange={(v) => set("isFeatured", v)} label="Feature on home page" hint="Plays in the phone frame at the top of the home page." />
            </div>
          </Card>
        </div>

        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reel code" error={err("code")} hint="Put this in the Instagram caption, e.g. “Shop: code A113”.">
              <TextInput data-has-error={!!err("code")} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} error={err("code")} maxLength={5} />
            </Field>
            <Field label="Published on" error={err("publishedAt")}>
              <TextInput type="date" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} error={err("publishedAt")} />
            </Field>
            <Field label="Title" error={err("title")} className="sm:col-span-2">
              <TextInput data-has-error={!!err("title")} value={form.title} onChange={(e) => set("title", e.target.value)} error={err("title")} placeholder="Kurti haul under ₹500" />
            </Field>
            <Field label="Link name (slug)" error={err("slug")} hint={`Page address: /look/${form.code.toLowerCase()}-${form.slug || "…"}`} className="sm:col-span-2">
              <TextInput
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                error={err("slug")}
              />
            </Field>
            <Field label="Caption" error={err("caption")} className="sm:col-span-2">
              <TextArea rows={3} value={form.caption} onChange={(e) => set("caption", e.target.value)} placeholder="What you thought of the look: fabric, fit, value…" />
            </Field>
            <Field label="Category" error={err("category")}>
              <Select value={form.category} onChange={(e) => set("category", e.target.value)} error={err("category")}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tags" hint="Comma separated: wedding, under 999" optional>
              <TextInput value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
            <Field label="Instagram reel link" error={err("instagramUrl")} optional>
              <TextInput value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} error={err("instagramUrl")} placeholder="https://www.instagram.com/reel/…" />
            </Field>
            <Field label="Instagram views" hint="Used to rank trending until click data builds up." optional>
              <TextInput inputMode="numeric" value={form.views} onChange={(e) => set("views", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Products in this reel</h2>
          <p className="text-sm text-muted">Paste the affiliate link first: the store is detected automatically.</p>
        </div>
        <Button type="button" onClick={() => set("products", [...form.products, blankProduct(form.category)])}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {form.products.map((p, i) => (
          <ProductCardEditor
            key={p.key}
            index={i}
            count={form.products.length}
            product={p}
            categories={categories}
            errors={errors}
            onChange={(patch) => setProduct(i, patch)}
            onMove={(dir) => moveProduct(i, dir)}
            onRemove={() => set("products", form.products.filter((_, j) => j !== i))}
          />
        ))}
        {!form.products.length && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No products yet. A reel without products shows no buy buttons.</p>}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {!isNew ? (
          <Button type="button" variant="danger" onClick={remove}>
            <Trash2 className="size-4" /> Delete reel
          </Button>
        ) : <span />}
        <div className="flex items-center gap-3">
          {dirty && <span className="hidden text-xs text-muted sm:inline">Unsaved changes</span>}
          <Button type="submit" variant="primary" loading={saving}>{isNew ? "Create reel" : "Save changes"}</Button>
        </div>
      </div>
    </form>
  );
}

function ProductCardEditor({
  index,
  count,
  product: p,
  categories,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  product: ProductForm;
  categories: AdminCategory[];
  errors: Record<string, string>;
  onChange: (patch: Partial<ProductForm>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const err = (k: string) => errors[`products.${index}.${k}`];
  const hasError = Object.keys(errors).some((k) => k.startsWith(`products.${index}.`));

  return (
    <div data-has-error={hasError} className={cn("rounded-2xl border bg-surface p-5 shadow-soft", hasError ? "border-red-400" : "border-line", !p.isActive && "opacity-70")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          Product {index + 1}
          {p.title && <span className="font-normal text-muted"> · {p.title}</span>}
        </h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button type="button" onClick={() => confirm("Remove this product?") && onRemove()} aria-label="Remove product" className="grid size-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Affiliate link" error={err("affiliateUrl")} className="sm:col-span-2">
            <TextInput
              value={p.affiliateUrl}
              onChange={(e) => {
                const url = e.target.value;
                const detected = detectStore(url.trim());
                onChange({ affiliateUrl: url, ...(detected !== "other" ? { store: detected } : {}) });
              }}
              error={err("affiliateUrl")}
              placeholder="https://amzn.to/… or https://www.myntra.com/…"
            />
          </Field>
          <Field label="Store" error={err("store")}>
            <Select value={p.store} onChange={(e) => onChange({ store: e.target.value as StoreId })}>
              {(Object.keys(stores) as StoreId[]).map((s) => <option key={s} value={s}>{stores[s].name === "Store" ? "Other store" : stores[s].name}</option>)}
            </Select>
          </Field>
          <Field label="Category" error={err("category")}>
            <Select value={p.category} onChange={(e) => onChange({ category: e.target.value })}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Product name" error={err("title")} className="sm:col-span-2">
            <TextInput value={p.title} onChange={(e) => onChange({ title: e.target.value })} error={err("title")} placeholder="Cotton anarkali kurta, white" />
          </Field>
          <Field label="Price (approx. ₹)" error={err("approxPrice")} hint={p.store === "amazon" ? "Not shown for Amazon (their rules), used for budget filters only." : undefined} optional>
            <TextInput inputMode="numeric" value={p.approxPrice} onChange={(e) => onChange({ approxPrice: e.target.value.replace(/[^\d]/g, "") })} placeholder="799" />
          </Field>
          <Field label="MRP (₹)" error={err("mrp")} hint="Shows the % off." optional>
            <TextInput inputMode="numeric" value={p.mrp} onChange={(e) => onChange({ mrp: e.target.value.replace(/[^\d]/g, "") })} placeholder="1999" />
          </Field>
          <Field label="Your note" hint="One honest line shoppers will see." optional className="sm:col-span-2">
            <TextInput value={p.note} onChange={(e) => onChange({ note: e.target.value })} maxLength={300} placeholder="Fabric is soft and doesn't go see-through." />
          </Field>
          <Field label="Size tip" optional>
            <TextInput value={p.sizeTip} onChange={(e) => onChange({ sizeTip: e.target.value })} maxLength={120} placeholder="True to size" />
          </Field>
          <div className="flex items-end pb-1">
            <Toggle checked={p.isActive ?? true} onChange={(v) => onChange({ isActive: v })} label="Show this product" />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Colour <span className="text-xs font-normal text-muted">(for filters)</span></p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(colours) as Colour[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={c}
                  aria-pressed={p.colour === c}
                  onClick={() => onChange({ colour: p.colour === c ? "" : c })}
                  className={cn("size-7 rounded-full ring-1 ring-black/10 transition hover:scale-110", p.colour === c && "ring-2 ring-accent ring-offset-2 ring-offset-surface")}
                  style={{ background: colours[c] }}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Occasions <span className="text-xs font-normal text-muted">(for filters)</span></p>
            <div className="flex flex-wrap gap-2">
              {occasions.map((o) => {
                const on = p.occasions.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ occasions: on ? p.occasions.filter((x) => x !== o) : [...p.occasions, o] })}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition", on ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-accent")}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <Field label="Product photo" error={err("image")}>
          <MediaInput kind="image" folder="products" aspect="aspect-[4/5]" value={p.image} onChange={(v) => onChange({ image: v })} />
        </Field>
      </div>
    </div>
  );
}
