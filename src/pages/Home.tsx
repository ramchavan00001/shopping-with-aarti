import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Hand,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { HomePayload, PublicReel } from "@shared/types";
import { site } from "@shared/site";
import { stores } from "@shared/stores";
import { categoryPath } from "@shared/paths";
import { useApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ReelCard, ReelCardSkeleton } from "@/components/ReelCard";
import { SearchBox } from "@/components/SearchBox";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreBadge } from "@/components/StoreBadge";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { data, error } = useApi<HomePayload>("/api/home");

  return (
    <>
      <Hero featured={data?.featured} />
      <StoreStrip stores={data?.stores} />
      <LatestReels reels={data?.latest} />
      <Categories categories={data?.categories} />
      <BudgetPicks />
      <Trending products={data?.trending} />
      <HowItWorks />
      <About />
      {error && (
        <p className="container-page mt-8 text-center text-sm text-muted">
          Couldn't load the latest reels right now. Please refresh in a moment.
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Hero -- */

function Hero({ featured }: { featured?: PublicReel }) {
  return (
    <section className="relative overflow-hidden">
      {/* soft background blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-blush opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-40 size-[22rem] rounded-full bg-gold/25 blur-3xl" />

      <div className="container-page relative grid items-center gap-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-16">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-semibold text-ink/80 shadow-soft backdrop-blur">
            <Sparkles className="size-3.5 text-gold" /> New try-on reels every week
          </motion.p>
          <motion.h1 variants={fadeUp} className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl xl:text-7xl">
            Real outfits. <span className="italic text-accent">Real prices.</span>{" "}
            <span className="relative whitespace-nowrap">
              Tried on
              <svg aria-hidden viewBox="0 0 200 12" className="absolute -bottom-1 left-0 h-3 w-full text-gold" preserveAspectRatio="none">
                <path d="M2 9c40-6 120-8 196-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>{" "}
            by me.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Hi, I'm Aarti. I buy affordable fashion from Amazon, Flipkart, Meesho and Myntra, try it on honestly, and
            link every piece here, so you can shop the look in one tap.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 max-w-lg">
            <SearchBox size="lg" suggest />
            <p className="mt-2.5 pl-4 text-xs text-muted">
              Saw a reel on Instagram? Type the code from the caption, e.g. <b className="text-ink">#{featured?.code ?? "A112"}</b>
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/reels"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink shadow-lift transition hover:brightness-110 active:scale-[0.98]"
            >
              <Clapperboard className="size-4" /> Watch & shop reels
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              <InstagramIcon className="size-4" /> {site.handle}
            </a>
          </motion.div>

          <motion.dl variants={fadeUp} className="mt-10 flex gap-8 sm:gap-12">
            {site.stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-semibold">{s.value}</dd>
                <dd className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <HeroVisual featured={featured} />
      </div>
    </section>
  );
}

function HeroVisual({ featured }: { featured?: PublicReel }) {
  const [muted, setMuted] = useState(true);
  const chips = featured?.products.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto h-[540px] w-full max-w-[460px] sm:h-[600px]"
    >
      {/* arch portrait */}
      <div className="absolute left-0 top-6 h-[78%] w-[62%] overflow-hidden rounded-t-full rounded-b-[2rem] border-4 border-surface shadow-lift">
        <img src={site.heroPortrait} alt="Aarti holding shopping bags" className="size-full object-cover" fetchPriority="high" />
      </div>

      {/* phone with the featured reel */}
      <div className="absolute bottom-0 right-0 w-[56%] rotate-3 rounded-[2.4rem] bg-neutral-900 p-2 shadow-lift transition-transform duration-500 hover:rotate-0">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] bg-neutral-800">
          {featured && (
            <>
              <video
                key={featured.code}
                src={featured.video}
                poster={featured.poster}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-neutral-900">#{featured.code}</span>
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <Link
                to={`/reels?start=${featured.code}`}
                className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-xs font-bold text-neutral-900 transition hover:bg-accent hover:text-white"
              >
                <ShoppingBag className="size-3.5" /> Shop this look
              </Link>
            </>
          )}
        </div>
      </div>

      {/* floating product chips */}
      {chips.map((p, i) => (
        <motion.a
          key={p.id}
          href={p.href}
          target="_blank"
          rel="sponsored noopener"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { delay: 0.6 + i * 0.2 },
            y: { delay: 0.6 + i * 0.2, duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
          }}
          className={`absolute z-10 flex w-52 items-center gap-3 rounded-2xl border border-line bg-surface/95 p-2 pr-3 shadow-lift backdrop-blur ${
            i === 0 ? "-left-2 bottom-24 sm:-left-6" : "right-2 top-0 sm:-right-4"
          }`}
        >
          <img src={p.image} alt="" className="size-12 rounded-xl object-cover" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{p.title}</span>
            <span className="mt-1 flex items-center gap-1.5">
              <StoreBadge store={p.store} size="xs" />
              {p.showPrice && <span className="text-xs font-bold">~{formatPrice(p.approxPrice!)}</span>}
            </span>
          </span>
        </motion.a>
      ))}

      <div className="absolute -bottom-3 left-6 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-bg shadow-lift">
        <BadgeCheck className="size-4 text-gold" /> Tried & tested by Aarti
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------- Store strip -- */

function StoreStrip({ stores: list }: { stores?: HomePayload["stores"] }) {
  const ids = list ?? (["amazon", "flipkart", "meesho", "myntra"] as const).map((id) => ({ id, count: 0 }));
  return (
    <section aria-label="Shop by store" className="border-y border-line bg-surface">
      <div className="container-page flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
        <p className="text-sm font-medium text-muted">Shop the finds from</p>
        <ul className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
          {ids.map(({ id, count }) => (
            <li key={id}>
              <Link
                to={`/reels?store=${id}`}
                className="group flex items-center justify-center gap-2 rounded-2xl border border-line px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-soft sm:px-5"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stores[id].color }} />
                <span className="text-base font-bold tracking-tight">{stores[id].name}</span>
                {count > 0 && <span className="text-xs text-muted">{count}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Latest reels -- */

function LatestReels({ reels }: { reels?: PublicReel[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="pt-16 sm:pt-24">
      <div className="container-page">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading className="flex-1" eyebrow="Fresh drops" title="Latest try-on reels" action={{ to: "/reels", label: "Open reels feed" }} />
          <div className="mb-8 hidden gap-2 lg:flex">
            <button onClick={() => scrollBy(-1)} aria-label="Scroll left" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Scroll right" className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-6 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
      >
        {(reels ?? Array.from({ length: 5 }, () => undefined)).map((r, i) => (
          <div key={r?.code ?? i} className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-[30%] lg:w-[calc((100%-4rem)/5)] lg:min-w-56">
            {r ? <ReelCard reel={r} priority={i < 3} /> : <ReelCardSkeleton />}
          </div>
        ))}
      </div>
      <div className="container-page sm:hidden">
        <Link to="/reels" className="flex items-center justify-center gap-1.5 rounded-full border border-line py-3 text-sm font-semibold">
          Open reels feed <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Categories -- */

function Categories({ categories }: { categories?: HomePayload["categories"] }) {
  return (
    <section id="categories" className="container-page scroll-mt-24 pt-16 sm:pt-24">
      <SectionHeading eyebrow="Browse" title="Shop by category" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {(categories ?? Array.from({ length: 8 }, () => undefined)).map((c, i) =>
          c ? (
            <Reveal key={c.slug} delay={(i % 4) * 0.06}>
              <Link
                to={categoryPath(c.slug)}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-surface-2 shadow-soft"
              >
                <img src={c.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white">
                  <div>
                    <h3 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-white/75">{c.blurb}</p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-neutral-900">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ) : (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-surface-2" />
          ),
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Budget picks -- */

const budgets = [
  { max: 299, label: "Under ₹299", sub: "Jewellery, beauty & accessories", tone: "from-[#F6D5C5] to-[#F3B7AE] text-[#5A2318]" },
  { max: 499, label: "Under ₹499", sub: "Tops, kurtis & everyday wear", tone: "from-[#E9D3F0] to-[#C9A7DD] text-[#3C1B4F]" },
  { max: 999, label: "Under ₹999", sub: "Dresses, co-ords & footwear", tone: "from-[#F4E3B5] to-[#E3C37A] text-[#4A3610]" },
];

function BudgetPicks() {
  return (
    <section id="budget" className="container-page scroll-mt-24 pt-16 sm:pt-24">
      <SectionHeading eyebrow="Pocket-friendly" title="Looks for every budget" />
      <div className="grid gap-4 md:grid-cols-3">
        {budgets.map((b, i) => (
          <Reveal key={b.max} delay={i * 0.08}>
            <Link
              to={`/reels?maxPrice=${b.max}`}
              className={`group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift ${b.tone}`}
            >
              <span aria-hidden className="absolute -right-6 -top-10 font-display text-[9rem] font-bold leading-none opacity-15">₹</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">Budget picks</span>
              <span>
                <span className="block font-display text-4xl font-semibold">{b.label}</span>
                <span className="mt-1 flex items-center gap-1.5 text-sm font-medium opacity-80">
                  {b.sub} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Trending -- */

function Trending({ products }: { products?: HomePayload["trending"] }) {
  return (
    <section className="container-page pt-16 sm:pt-24">
      <SectionHeading eyebrow="Most clicked" title="Trending finds this week" action={{ to: "/reels", label: "See all reels" }} />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {(products ?? Array.from({ length: 8 }, () => undefined)).map((p, i) =>
          p ? (
            <Reveal key={p.id} delay={(i % 4) * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ) : (
            <ProductCardSkeleton key={i} />
          ),
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- How it works -- */

function HowItWorks() {
  const steps = [
    { icon: Clapperboard, title: "Watch the reel", text: "See how it really fits, moves and looks on a real person, not a studio model." },
    { icon: Hand, title: "Tap “Shop this look”", text: "Every item from the reel, with my honest notes and size tips." },
    { icon: ShoppingBag, title: "Buy on the store", text: "You check out on Amazon, Flipkart, Meesho or Myntra at the same price. No extra cost." },
  ];
  return (
    <section className="container-page pt-16 sm:pt-24">
      <div className="overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-bg sm:px-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">How it works</p>
        <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">From reel to doorstep in three taps</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <motion.li
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-ink">
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-5xl font-semibold text-bg/15">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-bg/65">{text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- About -- */

function About() {
  return (
    <section id="about" className="container-page scroll-mt-24 pt-16 sm:pt-24">
      <div className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal className="relative mx-auto w-full max-w-sm">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
            <img src={site.aboutPortrait} alt="Aarti" loading="lazy" className="size-full object-cover" />
          </div>
          <div className="absolute -bottom-5 -right-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift sm:-right-8">
            <p className="font-display text-2xl font-semibold">{site.stats[0].value}</p>
            <p className="text-xs text-muted">{site.stats[0].label} trust my picks</p>
          </div>
        </Reveal>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Meet Aarti</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            I spend my money first, so you don't waste yours.
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted">
            <p>
              Every product here is something I ordered with my own money, unboxed and tried on camera. If the fabric is
              thin or the fit is off, I'll tell you.
            </p>
            <p>
              Links are affiliate links: you pay exactly the same, and a small commission helps me keep buying and
              reviewing more for you.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:brightness-110"
            >
              <InstagramIcon className="size-4" /> Follow on Instagram
            </a>
            <a
              href={site.whatsappChannelUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-[#073B1D] shadow-soft transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-4" /> Get loot deals on WhatsApp
            </a>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              More about me <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
