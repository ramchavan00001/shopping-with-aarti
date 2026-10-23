import { ChevronDown, Heart, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import type { HomePayload } from "@shared/types";
import { categoryPath } from "@shared/paths";
import { useApi } from "@/lib/api";
import { useSavedCount } from "@/lib/saved";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { useLang, useT } from "@/lib/i18n";
import { InstagramIcon } from "./icons";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { imgUrl } from "@/lib/img";

// Labels are translated where they're shown.
const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/reels", label: "Shop Reels" },
  { to: "/deals", label: "Deals" },
  { to: "/about", label: "About" },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  const t = useT();
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn("rounded-full px-3.5 py-2 text-sm font-medium transition", isActive ? "bg-accent-soft text-accent" : "text-ink/75 hover:text-ink")
      }
    >
      {t(label)}
    </NavLink>
  );
}

/** Hover/click dropdown listing every category with its photo. */
function CategoriesMenu() {
  const t = useT();
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
        {t("Categories")} <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && data && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="grid w-[30rem] grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-lift">
            {data.categories.map((c) => (
              <Link key={c.slug} to={categoryPath(c.slug)} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
                <img src={imgUrl(c.image, 160)} alt="" className="size-11 rounded-lg object-cover" />
                <span>
                  <span className="block text-sm font-semibold">{t(c.name)}</span>
                  <span className="block text-xs text-muted">{t(c.blurb)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SavedLink() {
  const t = useT();
  const count = useSavedCount();
  return (
    <NavLink
      to="/saved"
      aria-label={t("Saved items ({n})", { n: count })}
      className={({ isActive }) =>
        cn(
          "relative hidden size-10 place-items-center rounded-full border transition hover:border-accent hover:text-accent md:grid",
          isActive ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink",
        )
      }
    >
      <Heart className={cn("size-4", count > 0 && "fill-accent text-accent")} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-5 text-accent-ink">
          {count}
        </span>
      )}
    </NavLink>
  );
}

/** Switches between English and Hindi; shows the language you'd switch to. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  const next = lang === "hi" ? "en" : "hi";
  return (
    <button
      onClick={() => setLang(next)}
      aria-label={t("Change language")}
      title={next === "hi" ? "हिन्दी में देखें" : "View in English"}
      lang={next === "hi" ? "hi" : "en"}
      className={cn("grid h-10 min-w-10 place-items-center rounded-full border border-line bg-surface px-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent", className)}
    >
      {next === "hi" ? "हिं" : "EN"}
    </button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={dark ? t("Switch to light mode") : t("Switch to dark mode")}
      className={cn("grid size-10 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent", className)}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function Header() {
  const t = useT();
  const s = useSettings();
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
        <nav aria-label={t("Main")} className="ml-6 hidden items-center gap-1 lg:flex">
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
          <SavedLink />
          <LanguageToggle />
          <ThemeToggle />
          <a
            href={s.instagramUrl}
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 sm:flex"
          >
            <InstagramIcon className="size-4" /> {t("Follow")}
          </a>
        </div>
      </div>
    </header>
  );
}
