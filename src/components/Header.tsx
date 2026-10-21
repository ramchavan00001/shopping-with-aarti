import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { site } from "@shared/site";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { InstagramIcon } from "./icons";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/reels", label: "Shop Reels" },
  { to: "/#categories", label: "Categories" },
  { to: "/#budget", label: "Budget Picks" },
  { to: "/#about", label: "About" },
];

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
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  isActive && !item.to.includes("#") ? "bg-accent-soft text-accent" : "text-ink/75 hover:text-ink",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-64 md:block xl:w-72" />
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
