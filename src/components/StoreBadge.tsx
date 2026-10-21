import { stores } from "@shared/stores";
import type { StoreId } from "@shared/types";
import { cn } from "@/lib/format";

export function StoreBadge({ store, size = "sm", className }: { store: StoreId; size?: "xs" | "sm" | "md"; className?: string }) {
  const s = stores[store];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold leading-none whitespace-nowrap",
        size === "xs" && "px-1.5 py-1 text-[10px]",
        size === "sm" && "px-2 py-1 text-[11px]",
        size === "md" && "px-3 py-1.5 text-xs",
        className,
      )}
      style={{ backgroundColor: s.color, color: s.ink }}
    >
      {s.name}
    </span>
  );
}

export function StoreDots({ ids }: { ids: StoreId[] }) {
  const unique = [...new Set(ids)];
  return (
    <span className="flex -space-x-1">
      {unique.map((id) => (
        <span
          key={id}
          title={stores[id].name}
          className="grid size-5 place-items-center rounded-full text-[9px] font-bold ring-2 ring-black/20"
          style={{ backgroundColor: stores[id].color, color: stores[id].ink }}
        >
          {stores[id].name[0]}
        </span>
      ))}
    </span>
  );
}
