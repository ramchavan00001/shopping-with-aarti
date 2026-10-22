import { Link } from "react-router";
import { site } from "@shared/site";
import { LegalPage } from "@/components/LegalPage";
import { useSettings } from "@/lib/settings";

export default function Privacy() {
  const s = useSettings();
  const contact = s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : <a href={s.instagramUrl}>{s.instagramHandle} on Instagram</a>;
  return (
    <LegalPage
      title="Privacy policy"
      updated="22 October 2026"
      intro={<p>{site.name} is a personal shopping-recommendations site. We collect as little as possible: no accounts, no advertising trackers, and we never sell your data.</p>}
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <b>Anonymous usage statistics.</b> When you visit, watch a reel for a few seconds, open a look or tap a buy button, we
            record what happened, which page or product it was, and where the visit came from (for example Instagram or
            WhatsApp). To count unique visitors without identifying anyone, we store a one-way code made from the date, your IP
            address, your browser type and a secret key. It changes every day and can't be turned back into your IP address.
            We do not store IP addresses.
          </li>
          <li>
            <b>Brand enquiries.</b> If you use the collaboration form, we keep the name, brand, email, phone number (optional) and
            message you send, so we can reply.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookies and browser storage</h2>
        <p>
          We don't use advertising or tracking cookies. Your browser stores a few things on your own device to make the site
          work: your saved looks and products, light/dark mode, and (for one browsing session) where your visit came from. You
          can clear these at any time in your browser settings.
        </p>
      </section>

      <section>
        <h2>Links to stores</h2>
        <p>
          Product buttons are affiliate links to stores such as Amazon, Flipkart, Meesho and Myntra. When you click one, you
          leave this site and the store's own privacy policy applies. Stores and affiliate networks may use cookies to record
          that you came from this site, which is how a small commission is paid at no extra cost to you. As an Amazon Associate
          and affiliate partner of Flipkart, Meesho and Myntra, I earn from qualifying purchases.
        </p>
      </section>

      <section>
        <h2>Services we use</h2>
        <ul>
          <li><b>Render</b> hosts the website.</li>
          <li><b>Neon</b> hosts the database (statistics and enquiries).</li>
          <li><b>Cloudflare</b> stores and serves videos and photos.</li>
        </ul>
        <p>These providers process data only to run the site for us.</p>
      </section>

      <section>
        <h2>How long we keep data</h2>
        <p>
          Enquiries are kept until the conversation is finished and then deleted on request or during regular clean-ups.
          Anonymous statistics are kept to understand which content is useful and contain nothing that identifies you.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to see, correct or delete any personal information you've sent us (for example an enquiry), in line with
          India's Digital Personal Data Protection Act, 2023. Contact {contact} and we'll respond within 30 days.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, we'll update the date at the top of this page. See also our <Link to="/terms">terms of use</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
