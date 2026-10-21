const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export const formatPrice = (n: number) => inr.format(n);
export const formatCount = (n: number) => compact.format(n);
export const discountPct = (price?: number, mrp?: number) =>
  price && mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export function timeAgo(isoDate: string) {
  const days = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
