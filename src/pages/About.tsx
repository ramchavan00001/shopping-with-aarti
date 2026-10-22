import { motion } from "motion/react";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Gift,
  HeartHandshake,
  Loader2,
  MapPin,
  Package,
  Repeat,
  Send,
  Wallet,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { site } from "@shared/site";
import { budgets, collabTypes, validateEnquiry, type EnquiryErrors } from "@shared/enquiry";
import { cn } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { InstagramIcon } from "@/components/icons";

const promises = [
  { icon: Wallet, title: "I pay for what I review", text: "Everything in my try-on reels is bought with my own money, unless it's clearly marked as a collaboration." },
  { icon: BadgeCheck, title: "Honest, always", text: "If the fabric is thin, the colour is off or the fit runs small, you'll hear it from me, even on paid posts." },
  { icon: HeartHandshake, title: "Budget first", text: "Most finds are under ₹999. I'm here to help you look great without overspending." },
];

const formats = [
  { icon: Clapperboard, title: "Try-on reels", text: "Styled try-on with honest review and shop links." },
  { icon: Repeat, title: "Story series", text: "3–5 stories with swipe-up links over a day." },
  { icon: Package, title: "Unboxing & haul", text: "First impressions in a multi-brand haul." },
  { icon: Gift, title: "Giveaways", text: "Run a contest to grow your followers." },
];

const faqs = [
  { q: "Do you accept products for free (barter)?", a: "Sometimes, for brands that genuinely fit my audience. I'll still review honestly, and barter posts are always marked as collaborations." },
  { q: "How soon can a reel go live?", a: "Usually 7–10 days after I receive the product, which leaves time to wear it properly before reviewing." },
  { q: "Do you share performance reports?", a: "Yes. You'll get reach, views, saves, shares and link clicks from my site within 7 days of posting." },
];

export default function About() {
  usePageMeta("About Aarti & brand collaborations", "Meet Aarti, who tries on affordable fashion so you don't have to. Brands can enquire about collaborations here.");

  return (
    <div className="pb-8">
      {/* intro */}
      <section className="container-page grid items-center gap-10 pt-8 sm:pt-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative mx-auto w-full max-w-md">
          <div className="aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[2rem] border-4 border-surface shadow-lift">
            <img src={site.aboutPortrait} alt="Aarti" className="size-full object-cover" />
          </div>
          <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-lift">
            <InstagramIcon className="size-4" /> {site.handle}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">About me</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            Hi, I'm Aarti. I try it on <span className="italic text-accent">before</span> you buy it.
          </h1>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
            {/* TODO: replace with Aarti's own story in her words. */}
            <p>
              It started with one too many disappointing online orders: dresses that looked nothing like the photos,
              "free size" that fit nobody. So I started filming honest try-ons for my friends.
            </p>
            <p>
              Today a community of shoppers watches my reels before they hit "Buy". I test fabric, fit and stitching on
              a real body and a real budget, so you can shop with confidence.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#collab" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink shadow-lift transition hover:brightness-110">
              <Send className="size-4" /> Work with me
            </a>
            <Link to="/reels" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold transition hover:border-accent hover:text-accent">
              <Clapperboard className="size-4" /> Watch my reels
            </Link>
          </div>
        </motion.div>
      </section>

      {/* promises */}
      <section className="container-page pt-20">
        <div className="grid gap-4 md:grid-cols-3">
          {promises.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl border border-line bg-surface p-6 shadow-soft"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* media kit */}
      <section className="container-page pt-20">
        <div className="overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-bg sm:px-12 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">For brands</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Reach shoppers who are ready to buy
          </h2>
          <dl className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {site.mediaKit.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-bg/5 p-5 ring-1 ring-bg/10">
                <dd className="font-display text-4xl font-semibold">{s.value}</dd>
                <dt className="mt-1 text-sm text-bg/65">{s.label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-bg/70">
            <MapPin className="size-4 text-gold" /> Top cities:
            {site.mediaKit.topCities.map((c) => (
              <span key={c} className="rounded-full bg-bg/10 px-3 py-1 text-xs font-medium text-bg">{c}</span>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {formats.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink"><Icon className="size-4" /></span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-0.5 text-sm text-bg/65">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* enquiry form + faq */}
      <section id="collab" className="container-page scroll-mt-24 pt-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Collaborations</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Let's create something together</h2>
            <p className="mt-3 text-muted">
              Tell me about your brand and what you have in mind. I reply to every enquiry within 2 working days.
            </p>
            <p className="mt-4 text-sm text-muted">
              Prefer email? <a className="font-semibold text-accent hover:underline" href={`mailto:${site.email}`}>{site.email}</a>
            </p>
            <div className="mt-8 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-line bg-surface px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                    {f.q}
                    <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <EnquiryForm />
        </div>
      </section>
    </div>
  );
}

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-xl border bg-bg px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:ring-4",
    err ? "border-red-500 focus:ring-red-500/15" : "border-line focus:border-accent focus:ring-accent/15",
  );

function EnquiryForm() {
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMsg, setFailMsg] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const { errors: errs } = validateEnquiry(body);
    setErrors(errs);
    if (Object.keys(errs).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; errors?: EnquiryErrors };
      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        throw new Error(json.error ?? "Something went wrong.");
      }
      setState("sent");
      form.reset();
    } catch (err) {
      setFailMsg((err as Error).message);
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="grid place-items-center rounded-[2rem] border border-line bg-surface p-10 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-emerald-600" />
        <h3 className="mt-4 font-display text-2xl font-semibold">Thank you!</h3>
        <p className="mt-2 max-w-sm text-muted">Your enquiry is with me. I'll get back to you within 2 working days.</p>
        <button onClick={() => setState("idle")} className="mt-6 rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Send another</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name}>
          <input name="name" autoComplete="name" className={inputCls(errors.name)} placeholder="Priya Sharma" />
        </Field>
        <Field label="Brand / company" error={errors.brand}>
          <input name="brand" autoComplete="organization" className={inputCls(errors.brand)} placeholder="Your brand" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input name="email" type="email" autoComplete="email" className={inputCls(errors.email)} placeholder="you@brand.com" />
        </Field>
        <Field label="Phone / WhatsApp" error={errors.phone} optional>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" className={inputCls(errors.phone)} placeholder="+91 98xxxxxxxx" />
        </Field>
        <Field label="Collaboration type" error={errors.type}>
          <select name="type" defaultValue="" className={inputCls(errors.type)}>
            <option value="" disabled>Choose one</option>
            {collabTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Budget" error={errors.budget}>
          <select name="budget" defaultValue="" className={inputCls(errors.budget)}>
            <option value="" disabled>Choose one</option>
            {budgets.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Tell me about the campaign" error={errors.message}>
            <textarea name="message" rows={5} className={cn(inputCls(errors.message), "resize-y")} placeholder="Products, timeline, deliverables, anything else I should know…" />
          </Field>
        </div>
        {/* honeypot: hidden from people, bots fill it */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      </div>
      {state === "failed" && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {failMsg} You can also email <a className="font-semibold underline" href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink shadow-soft transition hover:brightness-110 disabled:opacity-70 sm:w-auto"
      >
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {state === "sending" ? "Sending…" : "Send enquiry"}
      </button>
      <p className="mt-3 text-xs text-muted">I'll only use your details to reply to this enquiry.</p>
    </form>
  );
}
