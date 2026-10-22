import type { ReactNode } from "react";
import { usePageMeta } from "@/lib/meta";

/** Simple readable layout for policy pages. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  usePageMeta(title, `${title} for Shopping with Aarti.`);
  return (
    <article className="container-page max-w-3xl pb-10 pt-10 sm:pt-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Last updated {updated}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <div className="mt-4 text-lg leading-relaxed text-muted">{intro}</div>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-accent hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
