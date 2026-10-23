import type { ReactNode } from "react";
import { usePageMeta } from "@/lib/meta";
import { useLang } from "@/lib/i18n";

/** Simple readable layout for policy pages. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  const { lang, t } = useLang();
  usePageMeta(title, `${title} for Shopping with Aarti.`);
  return (
    <article className="container-page max-w-3xl pb-10 pt-10 sm:pt-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{t("Last updated {date}", { date: updated })}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {lang === "hi" && (
        <p lang="hi" className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">{t("This page is only available in English.")}</p>
      )}
      <div className="mt-4 text-lg leading-relaxed text-muted" lang="en">{intro}</div>
      <div lang="en" className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-accent hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
