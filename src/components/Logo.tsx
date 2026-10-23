import { Link } from "react-router";
import { useT } from "@/lib/i18n";

export function Logo({ light = false }: { light?: boolean }) {
  const t = useT();
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label={t("Shopping with Aarti, home")}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-soft transition-transform group-hover:-rotate-6">
        <span className="font-display text-xl italic leading-none">a</span>
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-gold ring-2 ring-bg" />
      </span>
      <span className={`leading-none ${light ? "text-white" : "text-ink"}`}>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">Shopping with</span>
        <span className="font-display text-xl font-semibold italic">Aarti</span>
      </span>
    </Link>
  );
}
