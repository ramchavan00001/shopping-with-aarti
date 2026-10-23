const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export const formatPrice = (n: number) => inr.format(n);
export const formatCount = (n: number) => compact.format(n);
export const discountPct = (price?: number, mrp?: number) =>
  price && mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

type T = (text: string, vars?: Record<string, string | number>) => string;
const plain: T = (text, vars) => text.replace(/\{(\w+)\}/g, (m: string, k: string) => String(vars?.[k] ?? m));

/** "Today", "3 days ago"… Pass the page's `t` (and "hi") for Hindi. */
export function timeAgo(isoDate: string, t: T = plain, lang = "en") {
  const days = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 86_400_000));
  if (days === 0) return t("Today");
  if (days === 1) return t("Yesterday");
  if (days < 7) return t("{n} days ago", { n: days });
  if (days < 30) return t("{n}w ago", { n: Math.round(days / 7) });
  return new Date(isoDate).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });
}

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
