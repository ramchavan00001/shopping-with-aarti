import { Clapperboard, Flame, Heart, Home, Search } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/format";
import { useSavedCount } from "@/lib/saved";

// App-style bottom bar for phones, where most Instagram traffic lands.
export function MobileNav() {
  const savedCount = useSavedCount();
  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/reels", label: "Reels", icon: Clapperboard },
    { to: "/search", label: "Search", icon: Search },
    { to: "/deals", label: "Deals", icon: Flame },
    { to: "/saved", label: "Saved", icon: Heart, badge: savedCount },
  ];
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-line/80 bg-surface/90 shadow-lift backdrop-blur-xl md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  isActive && !to.includes("?") ? "text-accent" : "text-muted",
                )
              }
            >
              <Icon className="size-5" />
              {label}
              {!!badge && (
                <span className="absolute right-[calc(50%-18px)] top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-ink">
                  {badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
