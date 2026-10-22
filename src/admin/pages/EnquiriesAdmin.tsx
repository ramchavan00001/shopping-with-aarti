import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import type { AdminEnquiry, EnquiryStatus } from "@shared/admin";
import { cn } from "@/lib/format";
import { adminApi, useAdminQuery } from "../api";
import { Empty, ErrorBanner, PageHeader, useToast } from "../ui";

const tabs: { id: EnquiryStatus | "all"; label: string }[] = [
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

export default function EnquiriesAdmin() {
  const { data, error, reload } = useAdminQuery<{ enquiries: AdminEnquiry[] }>("/enquiries");
  const [tab, setTab] = useState<EnquiryStatus | "all">("new");
  const toast = useToast();
  const list = (data?.enquiries ?? []).filter((e) => tab === "all" || e.status === tab);

  async function setStatus(e: AdminEnquiry, status: EnquiryStatus) {
    try {
      await adminApi(`/enquiries/${e.id}`, { method: "PATCH", body: { status } });
      reload();
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Brand enquiries" description="Sent from the form on the About page." />
      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1 sm:inline-flex">
        {tabs.map((t) => {
          const n = (data?.enquiries ?? []).filter((e) => t.id === "all" || e.status === t.id).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition", tab === t.id ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
              {t.label} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {data && !list.length && <Empty title="Nothing here">{tab === "new" ? "New brand enquiries will appear here." : null}</Empty>}
      <ul className="space-y-3">
        {list.map((e) => (
          <li key={e.id} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold">{e.brand}</p>
                <p className="text-sm text-muted">{e.name} · {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">{e.type}</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">{e.budget}</span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{e.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Collaboration with ${e.brand}`)}`} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink">
                <Mail className="size-3.5" /> {e.email}
              </a>
              {e.phone && (
                <>
                  <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-semibold"><Phone className="size-3.5" /> {e.phone}</a>
                  <a href={`https://wa.me/${e.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-semibold"><MessageCircle className="size-3.5" /> WhatsApp</a>
                </>
              )}
              <span className="ml-auto flex gap-1">
                {e.status !== "replied" && <button onClick={() => setStatus(e, "replied")} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">Mark replied</button>}
                {e.status !== "archived" && <button onClick={() => setStatus(e, "archived")} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">Archive</button>}
                {e.status !== "new" && <button onClick={() => setStatus(e, "new")} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">Mark new</button>}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
