import { ArrowUpRight, Quote, Ruler } from "lucide-react";
import type { PublicProduct } from "@shared/types";
import { stores } from "@shared/stores";
import { cn } from "@/lib/format";
import { PriceLine } from "./ProductCard";
import { SaveProductButton } from "./SaveProductButton";
import { StoreBadge } from "./StoreBadge";

/** Compact product line used in the shop drawer, the desktop panel and look pages. */
export function ProductRow({ product, dark = false }: { product: PublicProduct; dark?: boolean }) {
  return (
    <li className={cn("flex gap-3 rounded-2xl p-2.5", dark ? "bg-white/5" : "bg-surface-2/60")}>
      <a href={product.href} target="_blank" rel="sponsored noopener" className="relative shrink-0">
        <img src={product.image} alt={product.title} loading="lazy" className="size-24 rounded-xl object-cover" />
      </a>
      <div className="flex min-w-0 flex-1 flex-col">
        <StoreBadge store={product.store} size="xs" className="self-start" />
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
        <div className="mt-1"><PriceLine product={product} invert={dark} /></div>
        {product.note && (
          <p className={cn("mt-1 flex gap-1 text-xs italic", dark ? "text-white/65" : "text-muted")}>
            <Quote className="mt-0.5 size-3 shrink-0 text-accent" /> {product.note}
          </p>
        )}
        {product.sizeTip && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs", dark ? "text-white/65" : "text-muted")}>
            <Ruler className="size-3 shrink-0" /> {product.sizeTip}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-2">
        <a
            href={product.href}
            target="_blank"
            rel="sponsored noopener"
            className={cn(
              "inline-flex items-center justify-center gap-1 self-start rounded-full px-4 py-2 text-xs font-bold transition active:scale-95",
              dark ? "bg-white text-neutral-900 hover:bg-accent hover:text-white" : "bg-ink text-bg hover:bg-accent hover:text-accent-ink",
            )}
          >
            Buy on {stores[product.store].name} <ArrowUpRight className="size-3.5" />
          </a>
          <SaveProductButton id={product.id} title={product.title} variant={dark ? "dark" : "inline"} className="size-8" />
        </div>
      </div>
    </li>
  );
}
