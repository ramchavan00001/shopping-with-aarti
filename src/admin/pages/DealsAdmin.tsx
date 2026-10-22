import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AdminCategory, AdminDeal, AdminEvent, LootDealInput, SaleEventInput } from "@shared/admin";
import { detectStore, stores } from "@shared/stores";
import type { StoreId } from "@shared/types";
import { cn, formatPrice } from "@/lib/format";
import { StoreBadge } from "@/components/StoreBadge";
import { adminApi, ApiError, resolveMedia, useAdminQuery } from "../api";
import { useAdminConfig } from "../context";
import { MediaInput } from "../MediaInput";
import { formatIst, fromIstInput, toIstInput } from "../time";
import { Button, Card, Empty, ErrorBanner, Field, Modal, PageHeader, Select, TextInput, useToast } from "../ui";

const storeOptions = (Object.keys(stores) as StoreId[]).map((s) => <option key={s} value={s}>{s === "other" ? "Other store" : stores[s].name}</option>);

function status(start: string | null, end: string) {
  const now = Date.now();
  if (start && now < Date.parse(start)) return { label: "Upcoming", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" };
  if (now > Date.parse(end)) return { label: "Ended", cls: "bg-surface-2 text-muted" };
  return { label: "Live", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" };
}

export default function DealsAdmin() {
  const events = useAdminQuery<{ events: AdminEvent[] }>("/events");
  const deals = useAdminQuery<{ deals: AdminDeal[] }>("/deals");
  const cats = useAdminQuery<{ categories: AdminCategory[] }>("/categories");
  const { mediaBaseUrl } = useAdminConfig();
  const toast = useToast();
  const [editEvent, setEditEvent] = useState<Partial<AdminEvent> | null>(null);
  const [editDeal, setEditDeal] = useState<Partial<AdminDeal> | null>(null);

  async function remove(kind: "events" | "deals", id: string, name: string) {
    if (!confirm(`Delete “${name}”?`)) return;
    try {
      await adminApi(`/${kind}/${id}`, { method: "DELETE", body: {} });
      toast("success", "Deleted");
      (kind === "events" ? events : deals).reload();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Deals & sales" description="Store-wide sales show with countdowns on the Deals page. Loot deals disappear automatically when they expire." />

      <Card
        title="Sale calendar"
        action={<Button size="sm" variant="primary" onClick={() => setEditEvent({})}><Plus className="size-3.5" /> Add sale</Button>}
        className="mb-6"
      >
        {events.error && <ErrorBanner message={events.error} onRetry={events.reload} />}
        {events.data && !events.data.events.length && <Empty title="No sales yet" />}
        {!!events.data?.events.length && (
          <ul className="divide-y divide-line">
            {events.data.events.map((e) => {
              const s = status(e.startsAt, e.endsAt);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StoreBadge store={e.store} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-xs text-muted">{formatIst(e.startsAt)} → {formatIst(e.endsAt)}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}>{s.label}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditEvent(e)} aria-label={`Edit ${e.name}`}><Pencil className="size-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove("events", e.id, e.name)} aria-label={`Delete ${e.name}`}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Loot deals" action={<Button size="sm" variant="primary" onClick={() => setEditDeal({})}><Plus className="size-3.5" /> Add deal</Button>}>
        {deals.error && <ErrorBanner message={deals.error} onRetry={deals.reload} />}
        {deals.data && !deals.data.deals.length && <Empty title="No loot deals yet" />}
        {!!deals.data?.deals.length && (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {deals.data.deals.map((d) => {
              const s = status(null, d.expiresAt);
              return (
                <li key={d.id} className={cn("flex gap-3 rounded-xl border border-line p-3", s.label === "Ended" && "opacity-60")}>
                  <img src={resolveMedia(d.image, mediaBaseUrl)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-muted">{stores[d.store].name} · {formatPrice(d.dealPrice)} <s>{formatPrice(d.mrp)}</s></p>
                    <p className="mt-1 flex items-center gap-2 text-xs">
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", s.cls)}>{s.label === "Live" ? "Live" : s.label}</span>
                      <span className="text-muted">ends {formatIst(d.expiresAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <Button size="sm" variant="ghost" onClick={() => setEditDeal(d)} aria-label={`Edit ${d.title}`}><Pencil className="size-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove("deals", d.id, d.title)} aria-label={`Delete ${d.title}`}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {editEvent && <EventModal initial={editEvent} onClose={() => setEditEvent(null)} onSaved={() => { setEditEvent(null); events.reload(); toast("success", "Sale saved"); }} />}
      {editDeal && (
        <DealModal
          initial={editDeal}
          categories={cats.data?.categories ?? []}
          onClose={() => setEditDeal(null)}
          onSaved={() => { setEditDeal(null); deals.reload(); toast("success", "Deal saved"); }}
        />
      )}
    </div>
  );
}

function useSave<T>(path: string, onSaved: () => void) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  async function save(body: T) {
    setSaving(true);
    setErrors({});
    setMessage(undefined);
    try {
      await adminApi(path, { body });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return { errors, message, saving, save };
}

function EventModal({ initial, onClose, onSaved }: { initial: Partial<AdminEvent>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial.name ?? "",
    store: initial.store ?? ("flipkart" as StoreId),
    startsAt: initial.startsAt ? toIstInput(initial.startsAt) : "",
    endsAt: initial.endsAt ? toIstInput(initial.endsAt) : "",
    headline: initial.headline ?? "",
    highlights: (initial.highlights ?? []).join("\n"),
    affiliateUrl: initial.affiliateUrl ?? "",
  });
  const { errors, message, saving, save } = useSave<SaleEventInput>("/events", onSaved);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      title={initial.id ? "Edit sale" : "Add sale"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() =>
              save({
                id: initial.id,
                ...f,
                startsAt: fromIstInput(f.startsAt),
                endsAt: fromIstInput(f.endsAt),
                highlights: f.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          >
            Save sale
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {message && <div className="sm:col-span-2"><ErrorBanner message={message} /></div>}
        <Field label="Sale name" error={errors.name} className="sm:col-span-2"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Big Billion Days" /></Field>
        <Field label="Store" error={errors.store}><Select value={f.store} onChange={(e) => set("store", e.target.value)}>{storeOptions}</Select></Field>
        <Field label="Headline" error={errors.headline}><TextInput value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Fashion at 50–90% off" /></Field>
        <Field label="Starts (IST)" error={errors.startsAt}><TextInput type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} /></Field>
        <Field label="Ends (IST)" error={errors.endsAt}><TextInput type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} /></Field>
        <Field label="Affiliate link to the sale page" error={errors.affiliateUrl} className="sm:col-span-2">
          <TextInput value={f.affiliateUrl} onChange={(e) => { const v = e.target.value; const s = detectStore(v.trim()); setF((x) => ({ ...x, affiliateUrl: v, ...(s !== "other" ? { store: s } : {}) })); }} error={errors.affiliateUrl} placeholder="https://…" />
        </Field>
        <Field label="Highlights" hint="One per line, up to 6." error={errors.highlights} className="sm:col-span-2">
          <textarea value={f.highlights} onChange={(e) => set("highlights", e.target.value)} rows={3} className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
        </Field>
      </div>
    </Modal>
  );
}

function DealModal({ initial, categories, onClose, onSaved }: { initial: Partial<AdminDeal>; categories: AdminCategory[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "",
    store: initial.store ?? ("meesho" as StoreId),
    image: initial.image ?? "",
    dealPrice: initial.dealPrice != null ? String(initial.dealPrice) : "",
    mrp: initial.mrp != null ? String(initial.mrp) : "",
    coupon: initial.coupon ?? "",
    category: initial.category ?? categories[0]?.slug ?? "",
    note: initial.note ?? "",
    expiresAt: initial.expiresAt ? toIstInput(initial.expiresAt) : "",
    affiliateUrl: initial.affiliateUrl ?? "",
  });
  const { errors, message, saving, save } = useSave<LootDealInput>("/deals", onSaved);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      wide
      title={initial.id ? "Edit loot deal" : "Add loot deal"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() =>
              save({
                id: initial.id,
                ...f,
                dealPrice: Number(f.dealPrice) || 0,
                mrp: Number(f.mrp) || 0,
                coupon: f.coupon || null,
                note: f.note || null,
                expiresAt: fromIstInput(f.expiresAt),
              })
            }
          >
            Save deal
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {message && <div className="sm:col-span-2"><ErrorBanner message={message} /></div>}
        <Field label="Affiliate link" error={errors.affiliateUrl} className="sm:col-span-2">
          <TextInput value={f.affiliateUrl} onChange={(e) => { const v = e.target.value; const s = detectStore(v.trim()); setF((x) => ({ ...x, affiliateUrl: v, ...(s !== "other" ? { store: s } : {}) })); }} error={errors.affiliateUrl} placeholder="https://…" />
        </Field>
        <Field label="Product name" error={errors.title} className="sm:col-span-2"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} error={errors.title} /></Field>
        <Field label="Store" error={errors.store}><Select value={f.store} onChange={(e) => set("store", e.target.value)}>{storeOptions}</Select></Field>
        <Field label="Category" error={errors.category}><Select value={f.category} onChange={(e) => set("category", e.target.value)}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        <Field label="Deal price (₹)" error={errors.dealPrice}><TextInput inputMode="numeric" value={f.dealPrice} onChange={(e) => set("dealPrice", e.target.value.replace(/\D/g, ""))} error={errors.dealPrice} /></Field>
        <Field label="MRP (₹)" error={errors.mrp}><TextInput inputMode="numeric" value={f.mrp} onChange={(e) => set("mrp", e.target.value.replace(/\D/g, ""))} error={errors.mrp} /></Field>
        <Field label="Ends (IST)" error={errors.expiresAt}><TextInput type="datetime-local" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} error={errors.expiresAt} /></Field>
        <Field label="Coupon code" optional><TextInput value={f.coupon} onChange={(e) => set("coupon", e.target.value.toUpperCase())} /></Field>
        <Field label="Your note" optional className="sm:col-span-2"><TextInput value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={200} placeholder="Lowest price I've seen" /></Field>
        <Field label="Photo" error={errors.image} className="sm:col-span-2"><MediaInput kind="image" folder="deals" value={f.image} onChange={(v) => set("image", v)} error={errors.image} /></Field>
      </div>
    </Modal>
  );
}
