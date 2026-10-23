import { Mail } from "lucide-react";
import { Link } from "react-router";
import { site } from "@shared/site";
import { useSettings } from "@/lib/settings";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { Logo } from "./Logo";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();
  const s = useSettings();
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-28 pt-14 md:pb-10">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {t("Honest try-ons of affordable fashion from India's favourite stores. Every product here is something I bought, wore and filmed myself.")}
          </p>
          <div className="mt-5 flex gap-2">
            <a href={s.instagramUrl} target="_blank" rel="noopener" aria-label="Instagram" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <InstagramIcon className="size-4" />
            </a>
            {s.whatsappChannelUrl ? (
              <a href={s.whatsappChannelUrl} target="_blank" rel="noopener" aria-label={t("WhatsApp channel")} className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
                <WhatsAppIcon className="size-4" />
              </a>
            ) : (
              <Link to="/alerts" aria-label={t("WhatsApp deal alerts")} className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
                <WhatsAppIcon className="size-4" />
              </Link>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} aria-label={t("Email")} className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
                <Mail className="size-4" />
              </a>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t("Shop")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-accent" to="/reels">{t("All reels")}</Link></li>
            <li><Link className="hover:text-accent" to="/category/ethnic">{t("Kurtis & ethnic")}</Link></li>
            <li><Link className="hover:text-accent" to="/category/dresses">{t("Dresses")}</Link></li>
            <li><Link className="hover:text-accent" to="/category/sarees">{t("Sarees")}</Link></li>
            <li><Link className="hover:text-accent" to="/deals">{t("Deals & sale calendar")}</Link></li>
            <li><Link className="hover:text-accent" to="/alerts">{t("Deal alerts & app")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t("Work with me")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-accent" to="/about">{t("About Aarti")}</Link></li>
            <li><Link className="hover:text-accent" to="/about#collab">{t("Brand collaborations")}</Link></li>
            <li><a className="hover:text-accent" href={s.instagramUrl} target="_blank" rel="noopener">{s.instagramHandle}</a></li>
          </ul>
        </div>
      </div>
      <div className="container-page mt-12 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p className="max-w-3xl">{t(site.disclosure)} {t("Prices shown are approximate and may change on the store.")}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} {site.name}. {t("All rights reserved.")}</span>
          <Link to="/privacy" className="hover:text-accent">{t("Privacy policy")}</Link>
          <Link to="/terms" className="hover:text-accent">{t("Terms of use")}</Link>
        </p>
      </div>
    </footer>
  );
}
