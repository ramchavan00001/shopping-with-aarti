import { ArrowUpRight, Quote } from "lucide-react";
import type { PublicProduct } from "@shared/types";
import { stores } from "@shared/stores";
import { discountPct, formatPrice } from "@/lib/format";
import { SaveProductButton } from "./SaveProductButton";
import { StoreBadge } from "./StoreBadge";

export function PriceLine({ product, invert = false }: { product: PublicProduct; invert?: boolean }) {
  if (!product.showPrice) {
    return <span className={`text-sm ${invert ? "text-white/70" : "text-muted"}`}>See today's price on {stores[product.store].name}</span>;
  }
  const off = discountPct(product.approxPrice, product.mrp);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-base font-bold">~{formatPrice(product.approxPrice!)}</span>
      {off > 0 && (
        <>
          <span className={`text-xs line-through ${invert ? "text-white/50" : "text-muted"}`}>{formatPrice(product.mrp!)}</span>
          <span className={`text-xs font-bold ${invert ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}`}>{off}% off</span>
        </>
      )}
    </span>
  );
}

export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <a href={product.href} target="_blank" rel="sponsored noopener" className="relative block aspect-[4/5] overflow-hidden bg-surface-2">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition duration-700 group-hover:scale-105"
        />
        <StoreBadge store={product.store} className="absolute left-3 top-3 shadow-sm" />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          #{product.reelCode}
        </span>
      </a>
      <SaveProductButton id={product.id} title={product.title} className="absolute right-3 top-3 z-10" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
        <PriceLine product={product} />
        {product.note && (
          <p className="flex gap-1.5 text-xs italic leading-relaxed text-muted">
            <Quote className="mt-0.5 size-3 shrink-0 text-accent" />
            {product.note}
          </p>
        )}
        <a
          href={product.href}
          target="_blank"
          rel="sponsored noopener"
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent hover:text-accent-ink active:scale-[0.98]"
        >
          Buy on {stores[product.store].name}
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return <div className="aspect-[4/7] animate-pulse rounded-3xl bg-surface-2" />;
}
