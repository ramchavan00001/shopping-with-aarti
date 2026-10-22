import { Download, MessageCircle, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { SubscriberRow } from "@shared/admin";
import { alertInterests } from "@shared/subscribe";
import { cn } from "@/lib/format";
import { adminApi, useAdminQuery } from "../api";
import { Button, Card, Empty, ErrorBanner, PageHeader, useToast } from "../ui";

const pretty = (p: string) => (p.startsWith("91") && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);

export default function SubscribersAdmin() {
  const { data, error, reload } = useAdminQuery<{ subscribers: SubscriberRow[] }>("/subscribers");
  const toast = useToast();
  const [filter, setFilter] = useState<string>("");
  const list = useMemo(() => (data?.subscribers ?? []).filter((s) => !filter || s.interests.includes(filter)), [data, filter]);

  function exportCsv() {
    const rows = [["Name", "WhatsApp", "Interests", "Signed up", "Source"], ...list.map((s) => [s.name, `+${s.phone}`, s.interests.join("; "), s.createdAt.slice(0, 10), s.source])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `whatsapp-subscribers${filter ? `-${filter.toLowerCase().replace(/\W+/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function remove(s: SubscriberRow) {
    if (!confirm(`Remove ${s.name} (${pretty(s.phone)})?`)) return;
    await adminApi(`/subscribers/${s.id}`, { method: "DELETE", body: {} });
    toast("success", "Removed");
    reload();
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp subscribers"
        description="People who asked for deal alerts. Add them to a WhatsApp Business broadcast list, or message them one by one."
        actions={<Button onClick={exportCsv} disabled={!list.length}><Download className="size-4" /> Export CSV</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["", ...alertInterests].map((i) => (
          <button
            key={i || "all"}
            onClick={() => setFilter(i)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", filter === i ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-accent")}
          >
            {i || `All (${data?.subscribers.length ?? 0})`}
          </button>
        ))}
      </div>
      <Card>
        {data && !list.length ? (
          <Empty title="No subscribers yet">They sign up on the Deals page and at /alerts.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name} <span className="font-normal text-muted">· {pretty(s.phone)}</span></p>
                  <p className="text-xs text-muted">
                    {s.interests.length ? s.interests.join(", ") : "All deals"} · from {s.source} · {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <a href={`https://wa.me/${s.phone}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#128C4B] hover:bg-surface-2">
                  <MessageCircle className="size-3.5" /> Message
                </a>
                <button onClick={() => remove(s)} aria-label={`Remove ${s.name}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        WhatsApp only delivers broadcast messages to people who have saved your number. Ask new subscribers to save it, and remove anyone who
        replies STOP.
      </p>
    </div>
  );
}
