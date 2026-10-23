import { Bell, BellOff, Check, Download, EllipsisVertical, Loader2, MoreHorizontal, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { cn } from "@/lib/format";
import { useLang, useT } from "@/lib/i18n";
import { countPageView, dismissInstall, installDismissedRecently, isIos, promptInstall, useInstallMode, type InstallMode } from "@/lib/pwa";
import { usePush } from "@/lib/push";

/* ------------------------------------------------------- How to install -- */

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{n}</span>
      <span className="pt-0.5 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

const Key = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 align-middle text-xs font-semibold">{children}</span>
);

/** Step-by-step help for browsers without a one-tap install. */
export function InstallHelp({ mode, onClose }: { mode: InstallMode; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-lift"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-2xl" />
            <div>
              <h2 id="install-help-title" className="font-display text-xl font-semibold">{t("Add Aarti to your home screen")}</h2>
              <p className="text-xs text-muted">{t("Opens like an app. Free, no app store needed.")}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t("Close")} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-2">
            <X className="size-4" />
          </button>
        </div>

        <ol className="mt-5 space-y-3">
          {mode === "in-app" ? (
            <>
              <Step n={1}>
                {t("Tap")} <Key>{isIos() ? <MoreHorizontal className="size-3.5" /> : <EllipsisVertical className="size-3.5" />}</Key>{" "}
                {t("at the top right of this screen.")}
              </Step>
              <Step n={2}>
                {t("Choose")} <Key>{isIos() ? t("Open in external browser") : t("Open in Chrome")}</Key>.
              </Step>
              <Step n={3}>{isIos() ? t("In Safari, tap Share, then Add to Home Screen.") : t("In Chrome, tap Install app when it appears.")}</Step>
            </>
          ) : mode === "ios" ? (
            <>
              <Step n={1}>
                {t("Tap the Share button")} <Key><Share className="size-3.5" /></Key> {t("at the bottom of Safari.")}
              </Step>
              <Step n={2}>
                {t("Scroll down and tap")} <Key><PlusSquare className="size-3.5" /> {t("Add to Home Screen")}</Key>.
              </Step>
              <Step n={3}>{t("Tap Add. Aarti's icon appears on your home screen.")}</Step>
            </>
          ) : (
            <>
              <Step n={1}>
                {t("Open the browser menu")} <Key><EllipsisVertical className="size-3.5" /></Key>.
              </Step>
              <Step n={2}>
                {t("Tap")} <Key>{t("Install app")}</Key> {t("or")} <Key>{t("Add to Home screen")}</Key>.
              </Step>
            </>
          )}
        </ol>
        <button onClick={onClose} className="mt-6 w-full rounded-full bg-ink py-3 text-sm font-semibold text-bg">
          {t("Got it")}
        </button>
      </motion.div>
    </motion.div>
  );
}

/** Install button that does the right thing on every browser. */
export function useInstall() {
  const mode = useInstallMode();
  const [help, setHelp] = useState(false);
  const install = async () => {
    if (mode === "prompt") await promptInstall();
    else setHelp(true);
  };
  const helpSheet = <AnimatePresence>{help && <InstallHelp mode={mode} onClose={() => setHelp(false)} />}</AnimatePresence>;
  return { mode, install, helpSheet };
}

/* ---------------------------------------------- App + notifications card -- */

function Row({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-xs leading-relaxed text-muted">{text}</p>
        </div>
      </div>
      {action && <div className="shrink-0 pl-15 sm:pl-0">{action}</div>}
    </div>
  );
}

const pill = "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition";

/** "Get the app" and "Turn on notifications", side by side with the WhatsApp card. */
export function AppAlerts({ className }: { className?: string }) {
  const t = useT();
  const { lang } = useLang();
  const { mode, install, helpSheet } = useInstall();
  const push = usePush(lang);
  const [justOn, setJustOn] = useState(false);

  const showInstall = mode !== "unsupported";
  const showPush = push.state !== "unsupported" && push.state !== "loading";
  if (!showInstall && !showPush && push.state !== "loading") return null;

  return (
    <section className={cn("rounded-[2rem] border border-line bg-surface-2 p-6 sm:p-8", className)} aria-labelledby="app-alerts">
      <h2 id="app-alerts" className="font-display text-2xl font-semibold sm:text-3xl">{t("Deals on your phone")}</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
        {t("Add the site to your home screen and turn on notifications. I'll ping you when a big sale starts or a loot deal drops.")}
      </p>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {showInstall && (
          <Row
            icon={<Smartphone className="size-5" />}
            title={t("Add to home screen")}
            text={t("Opens like an app and loads faster.")}
            action={
              mode === "installed" ? (
                <span className={cn(pill, "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>
                  <Check className="size-4" /> {t("Added")}
                </span>
              ) : (
                <button onClick={install} className={cn(pill, "bg-accent text-accent-ink hover:brightness-110")}>
                  <Download className="size-4" /> {mode === "prompt" ? t("Install") : t("Show me how")}
                </button>
              )
            }
          />
        )}
        {push.state === "loading" ? (
          <div className="h-[4.75rem] animate-pulse rounded-2xl bg-surface ring-1 ring-line" />
        ) : (
          showPush && (
            <Row
              icon={push.state === "on" ? <Bell className="size-5 fill-current" /> : <Bell className="size-5" />}
              title={t("Deal notifications")}
              text={
                push.state === "blocked"
                  ? t("Notifications are blocked. Allow them in your browser's site settings.")
                  : push.state === "install-first"
                    ? t("On iPhone, add the site to your home screen first, then turn them on from the app.")
                    : push.error
                      ? t("Couldn't turn on notifications. Please try again.")
                      : push.state === "on"
                        ? justOn
                          ? t("Done! You'll hear from me when there's a deal worth it.")
                          : t("On. Only big sales and loot deals, a few a week at most.")
                        : t("Only big sales and loot deals, a few a week at most.")
              }
              action={
                push.state === "on" ? (
                  <button onClick={push.turnOff} disabled={push.busy} className={cn(pill, "border border-line bg-surface hover:border-accent hover:text-accent")}>
                    {push.busy ? <Loader2 className="size-4 animate-spin" /> : <BellOff className="size-4" />} {t("Turn off")}
                  </button>
                ) : push.state === "off" ? (
                  <button
                    onClick={async () => setJustOn(await push.turnOn())}
                    disabled={push.busy}
                    className={cn(pill, "bg-ink text-bg hover:bg-accent hover:text-accent-ink")}
                  >
                    {push.busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />} {t("Turn on")}
                  </button>
                ) : push.state === "install-first" ? (
                  <button onClick={install} className={cn(pill, "border border-line bg-surface hover:border-accent hover:text-accent")}>
                    {t("How?")}
                  </button>
                ) : null
              }
            />
          )
        )}
      </div>
      {helpSheet}
    </section>
  );
}

/* ------------------------------------------------------ Install banner -- */

/**
 * Small "add to home screen" card above the phone nav bar. Waits until the
 * follower has looked around (3+ pages), never shows in the app itself, and
 * stays away for two weeks after "Not now".
 */
export function InstallBanner() {
  const t = useT();
  const { pathname } = useLocation();
  const { mode, install, helpSheet } = useInstall();
  const [views, setViews] = useState(0);
  const [hidden, setHidden] = useState(installDismissedRecently);

  useEffect(() => setViews(countPageView()), [pathname]);

  const eligible = (mode === "prompt" || mode === "ios" || mode === "in-app") && views >= 3 && !hidden;
  const close = () => {
    dismissInstall();
    setHidden(true);
  };

  return (
    <>
      <AnimatePresence>
        {eligible && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ delay: 1.5, type: "spring", damping: 24 }}
            className="fixed inset-x-3 bottom-[5.25rem] z-40 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lift md:hidden"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            role="region"
            aria-label={t("Install the app")}
          >
            <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t("Get the Aarti app")}</p>
              <p className="text-xs text-muted">{t("Free · opens from your home screen")}</p>
            </div>
            <button
              onClick={async () => {
                await install();
                if (mode === "prompt") close();
              }}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
            >
              {mode === "prompt" ? t("Install") : t("How?")}
            </button>
            <button onClick={close} aria-label={t("Not now")} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {helpSheet}
    </>
  );
}
