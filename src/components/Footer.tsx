import { Mail } from "lucide-react";
import { Link } from "react-router";
import { site } from "@shared/site";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-28 pt-14 md:pb-10">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Honest try-ons of affordable fashion from India's favourite stores. Every product here is something I bought,
            wore and filmed myself.
          </p>
          <div className="mt-5 flex gap-2">
            <a href={site.instagramUrl} target="_blank" rel="noopener" aria-label="Instagram" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <InstagramIcon className="size-4" />
            </a>
            <a href={site.whatsappChannelUrl} aria-label="WhatsApp channel" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <WhatsAppIcon className="size-4" />
            </a>
            <a href={`mailto:${site.email}`} aria-label="Email" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <Mail className="size-4" />
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-accent" to="/reels">All reels</Link></li>
            <li><Link className="hover:text-accent" to="/reels?category=ethnic">Kurtis & ethnic</Link></li>
            <li><Link className="hover:text-accent" to="/reels?category=dresses">Dresses</Link></li>
            <li><Link className="hover:text-accent" to="/reels?maxPrice=499">Under ₹499</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Work with me</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a className="hover:text-accent" href={`mailto:${site.email}?subject=Brand%20collaboration`}>Brand collaborations</a></li>
            <li><a className="hover:text-accent" href={site.instagramUrl} target="_blank" rel="noopener">{site.handle}</a></li>
          </ul>
        </div>
      </div>
      <div className="container-page mt-12 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p className="max-w-3xl">{site.disclosure} Prices shown are approximate and may change on the store.</p>
        <p className="mt-3">© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
