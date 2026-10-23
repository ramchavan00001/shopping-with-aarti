import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { alertInterests, validateSubscribe } from "@shared/subscribe";
import { cn } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { visitSource } from "@/lib/track";
import { WhatsAppIcon } from "./icons";
import { useT } from "@/lib/i18n";

/**
 * WhatsApp deal alerts: join the channel (if Aarti has one) or leave a number
 * so she can add you to her broadcast list. Dark green card, used on the
 * Deals page and /alerts.
 */
export function WhatsAppAlerts({ className, heading }: { className?: string; heading?: string }) {
  const t = useT();
  const s = useSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [hp, setHp] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { name, phone, interests, consent, website: hp };
    const { errors: errs } = validateSubscribe(payload);
    setErrors(errs as Record<string, string>);
    if (Object.keys(errs).length) return;
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, src: visitSource() }) });
      const json = (await res.json().catch(() => ({}))) as { errors?: Record<string, string> };
      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        throw new Error();
      }
      setState("done");
    } catch {
      setState("failed");
    }
  }

  const input = (err?: string) =>
    cn("h-11 w-full rounded-xl border bg-white/10 px-3.5 text-sm text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-[#25D366]", err ? "border-red-400" : "border-white/20");

  return (
    <section className={cn("overflow-hidden rounded-[2rem] bg-[#0B3D22] px-6 py-8 text-white sm:px-10 sm:py-10", className)} aria-labelledby="wa-alerts">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <span className="grid size-12 place-items-center rounded-2xl bg-[#25D366] text-[#073B1D]">
            <WhatsAppIcon className="size-6" />
          </span>
          <h2 id="wa-alerts" className="mt-4 font-display text-3xl font-semibold">{heading ?? t("Never miss a loot deal")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {t("Price drops and big sale reminders on WhatsApp, the minute I find them. Only deals, never spam. Reply STOP any time.")}
          </p>
          {s.whatsappChannelUrl && (
            <a
              href={s.whatsappChannelUrl}
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#073B1D] transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-4" /> {t("Join the WhatsApp channel")}
            </a>
          )}
        </div>

        {state === "done" ? (
          <div className="rounded-2xl bg-white/10 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-[#25D366]" />
            <p className="mt-3 font-display text-xl font-semibold">{t("You're on the list!")}</p>
            <p className="mt-1 text-sm text-white/75">{t("Save my number so WhatsApp delivers the alerts.")}</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
            <p className="mb-3 text-sm font-semibold">{s.whatsappChannelUrl ? t("Or get alerts on your number") : t("Get alerts on your number")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="sr-only">{t("Your name")}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} autoComplete="given-name" className={input(errors.name)} />
                {errors.name && <span className="mt-1 block text-xs text-red-300">{t(errors.name)}</span>}
              </label>
              <label className="block">
                <span className="sr-only">{t("WhatsApp number")}</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("WhatsApp number")} type="tel" inputMode="tel" autoComplete="tel" className={input(errors.phone)} />
                {errors.phone && <span className="mt-1 block text-xs text-red-300">{t(errors.phone)}</span>}
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-medium text-white/70">{t("What should I send you? (optional)")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {alertInterests.map((i) => {
                  const on = interests.includes(i);
                  return (
                    <button
                      type="button"
                      key={i}
                      aria-pressed={on}
                      onClick={() => setInterests((x) => (on ? x.filter((y) => y !== i) : [...x, i]))}
                      className={cn("rounded-full px-3 py-1 text-xs font-medium transition", on ? "bg-[#25D366] text-[#073B1D]" : "bg-white/10 text-white/85 hover:bg-white/20")}
                    >
                      {t(i)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/80">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[#25D366]" />
              <span>
                {t("I agree to receive deal messages on WhatsApp. I can stop any time. See the")}{" "}
                <Link to="/privacy" className="underline">{t("privacy policy")}</Link>{t(".")}
              </span>
            </label>
            {errors.consent && <span className="mt-1 block text-xs text-red-300">{t(errors.consent)}</span>}
            <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
            {state === "failed" && <p className="mt-3 text-xs text-red-300">{t("Couldn't sign you up right now. Please try again.")}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#073B1D] transition hover:bg-white/90 disabled:opacity-70"
            >
              {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <WhatsAppIcon className="size-4" />}
              {t("Send me deal alerts")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
