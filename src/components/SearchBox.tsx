import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/format";

/** Accepts a reel code ("A112", "#a112") or any keyword and opens the reels feed. */
export function SearchBox({ className, size = "md", autoFocus }: { className?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim().replace(/^#/, "");
    if (!v) return;
    navigate(/^[a-z]\d{2,4}$/i.test(v) ? `/reels?start=${v.toUpperCase()}` : `/reels?q=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} role="search" className={cn("relative", className)}>
      <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "size-5" : "size-4")} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        type="search"
        enterKeyHint="search"
        placeholder={size === "lg" ? "Try A112 or “kurti”" : "Search reel code or product"}
        aria-label="Search by reel code or product"
        className={cn(
          "w-full rounded-full border border-line bg-surface text-ink placeholder:text-muted/80 shadow-soft outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15",
          size === "lg" ? "h-14 pl-11 pr-28 text-base" : "h-10 pl-10 pr-4 text-sm",
        )}
      />
      {size === "lg" && (
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 h-11 -translate-y-1/2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110 active:scale-95"
        >
          Find look
        </button>
      )}
    </form>
  );
}
