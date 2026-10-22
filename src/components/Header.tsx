import { ChevronDown, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import type { HomePayload } from "@shared/types";
import { categoryPath } from "@shared/paths";
import { useApi } from "@/lib/api";
import { site } from "@shared/site";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { InstagramIcon } from "./icons";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/reels", label: "Shop Reels" },
  { to: "/deals", label: "Deals" },
  { to: "/about", label: "About" },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn("rounded-full px-3.5 py-2 text-sm font-medium transition", isActive ? "bg-accent-soft text-accent" : "text-ink/75 hover:text-ink")
      }
    >
      {label}
    </NavLink>
  );
}

/** Hover/click dropdown listing every category with its photo. */
function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data } = useApi<HomePayload>("/api/home");
  const active = pathname.startsWith("/category/");
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition",
          active ? "bg-accent-soft text-accent" : "text-ink/75 hover:text-ink",
        )}
      >
        Categories <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && data && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="grid w-[30rem] grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-lift">
            {data.categories.map((c) => (
              <Link key={c.slug} to={categoryPath(c.slug)} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
                <img src={c.image} alt="" className="size-11 rounded-lg object-cover" />
                <span>
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">{c.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("grid size-10 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent", className)}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition duration-300",
        scrolled ? "border-b border-line/70 bg-bg/80 backdrop-blur-xl" : "border-b border-transparent bg-bg",
      )}
    >
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {nav.slice(0, 2).map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
          <CategoriesMenu />
          {nav.slice(2).map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox suggest className="hidden w-64 md:block xl:w-72" />
          <ThemeToggle />
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 sm:flex"
          >
            <InstagramIcon className="size-4" /> Follow
          </a>
        </div>
      </div>
    </header>
  );
}
