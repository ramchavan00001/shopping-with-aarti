import { Link } from "react-router";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Shopping with Aarti, home">
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
