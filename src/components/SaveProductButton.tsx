import { Heart } from "lucide-react";
import { cn } from "@/lib/format";
import { savedProducts } from "@/lib/saved";
import { useT } from "@/lib/i18n";

/** Heart toggle for saving a single product to this browser. */
export function SaveProductButton({ id, title, className, variant = "overlay" }: { id: string; title: string; className?: string; variant?: "overlay" | "inline" | "dark" }) {
  const t = useT();
  const saved = savedProducts.useList().includes(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        savedProducts.toggle(id);
      }}
      aria-pressed={saved}
      aria-label={saved ? t("Remove {title} from saved", { title }) : t("Save {title}", { title })}
      title={saved ? t("Saved") : t("Save for later")}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition active:scale-90",
        variant === "overlay" && "size-9 bg-white/90 text-neutral-900 shadow-sm backdrop-blur hover:bg-white",
        variant === "inline" && "size-9 border border-line bg-surface hover:border-accent",
        variant === "dark" && "size-9 bg-white/10 text-white hover:bg-white/20",
        className,
      )}
    >
      <Heart className={cn("size-4 transition", saved && "scale-110 fill-accent text-accent")} />
    </button>
  );
}
