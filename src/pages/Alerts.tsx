import { usePageMeta } from "@/lib/meta";
import { WhatsAppAlerts } from "@/components/WhatsAppAlerts";

export default function Alerts() {
  usePageMeta("WhatsApp deal alerts", "Get Aarti's loot deals and sale reminders on WhatsApp.");
  return (
    <div className="container-page max-w-5xl pb-10 pt-10 sm:pt-14">
      <WhatsAppAlerts heading="Deal alerts on WhatsApp" />
    </div>
  );
}
