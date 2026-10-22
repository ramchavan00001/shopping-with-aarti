import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { slugify, type AdminCategory, type CategoryInput } from "@shared/admin";
import { adminApi, ApiError, resolveMedia, useAdminQuery } from "../api";
import { useAdminConfig } from "../context";
import { MediaInput } from "../MediaInput";
import { Button, Card, ErrorBanner, Field, Modal, PageHeader, TextInput, useToast } from "../ui";

export default function CategoriesAdmin() {
  const { data, error, reload } = useAdminQuery<{ categories: AdminCategory[] }>("/categories");
  const { mediaBaseUrl } = useAdminConfig();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<AdminCategory> | null>(null);

  async function remove(c: AdminCategory) {
    if (!confirm(`Delete the “${c.name}” category?`)) return;
    try {
      await adminApi(`/categories/${c.slug}`, { method: "DELETE", body: {} });
      toast("success", "Category deleted");
      reload();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Shown as tiles on the home page and in the Categories menu, in this order."
        actions={<Button variant="primary" onClick={() => setEditing({ sortOrder: (data?.categories.length ?? 0) })}><Plus className="size-4" /> Add category</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {data?.categories.map((c) => (
            <li key={c.slug} className="flex items-center gap-4 p-3 sm:px-5">
              <img src={resolveMedia(c.image, mediaBaseUrl)} alt="" className="size-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name} <span className="text-xs font-normal text-muted">/category/{c.slug}</span></p>
                <p className="truncate text-sm text-muted">{c.blurb}</p>
                <p className="text-xs text-muted">{c.reelCount} reels · {c.productCount} products · order {c.sortOrder}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 className="size-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {editing && (
        <CategoryModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            toast("success", "Category saved");
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({ initial, onClose, onSaved }: { initial: Partial<AdminCategory>; onClose: () => void; onSaved: () => void }) {
  const isNew = !initial.slug;
  const [f, setF] = useState({ name: initial.name ?? "", slug: initial.slug ?? "", image: initial.image ?? "", blurb: initial.blurb ?? "", sortOrder: String(initial.sortOrder ?? 0) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setErrors({});
    setMessage(undefined);
    try {
      const body: CategoryInput = { ...f, sortOrder: Number(f.sortOrder) || 0 };
      await adminApi(isNew ? "/categories" : `/categories/${initial.slug}`, { method: isNew ? "POST" : "PUT", body });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Add category" : `Edit ${initial.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}>
      <div className="grid gap-4">
        {message && <ErrorBanner message={message} />}
        <Field label="Name" error={errors.name}>
          <TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) }))} error={errors.name} placeholder="Home finds" />
        </Field>
        <Field label="Link name (slug)" error={errors.slug} hint={!isNew ? "Changing this breaks old links to the category page." : undefined}>
          <TextInput value={f.slug} onChange={(e) => setF((x) => ({ ...x, slug: e.target.value }))} error={errors.slug} />
        </Field>
        <Field label="Short description" error={errors.blurb}><TextInput value={f.blurb} onChange={(e) => setF((x) => ({ ...x, blurb: e.target.value }))} placeholder="Decor & kitchen under ₹999" maxLength={120} /></Field>
        <Field label="Order" hint="Lower numbers show first."><TextInput inputMode="numeric" value={f.sortOrder} onChange={(e) => setF((x) => ({ ...x, sortOrder: e.target.value.replace(/[^\d-]/g, "") }))} /></Field>
        <Field label="Tile image" error={errors.image}><MediaInput kind="image" folder="categories" aspect="aspect-[4/5]" value={f.image} onChange={(v) => setF((x) => ({ ...x, image: v }))} error={errors.image} /></Field>
      </div>
    </Modal>
  );
}
