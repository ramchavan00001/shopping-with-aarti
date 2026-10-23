import { usePageMeta } from "@/lib/meta";
import { useT } from "@/lib/i18n";
import { AppAlerts } from "@/components/AppAlerts";
import { WhatsAppAlerts } from "@/components/WhatsAppAlerts";

export default function Alerts() {
  const t = useT();
  usePageMeta(t("Deal alerts"), t("Get Aarti's loot deals and sale reminders as phone notifications or on WhatsApp."));
  return (
    <div className="container-page max-w-5xl space-y-6 pb-10 pt-10 sm:pt-14">
      <AppAlerts />
      <WhatsAppAlerts heading={t("Deal alerts on WhatsApp")} />
    </div>
  );
}
