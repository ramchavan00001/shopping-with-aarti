import { Link } from "react-router";
import { site } from "@shared/site";
import { LegalPage } from "@/components/LegalPage";
import { useSettings } from "@/lib/settings";

export default function Terms() {
  const s = useSettings();
  const contact = s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : <a href={s.instagramUrl}>{s.instagramHandle} on Instagram</a>;
  return (
    <LegalPage
      title="Terms of use"
      updated="22 October 2026"
      intro={<p>By using {site.name} you agree to these terms. They're short and in plain language.</p>}
    >
      <section>
        <h2>What this site is</h2>
        <p>
          {site.name} shares honest try-ons and recommendations of products sold by other stores. We don't sell anything
          ourselves: every purchase happens on the store's website, under that store's terms, prices, delivery, return and
          refund policies.
        </p>
      </section>

      <section>
        <h2>Affiliate links</h2>
        <p>{site.disclosure} Recommendations are personal opinions based on our own experience with the product.</p>
      </section>

      <section>
        <h2>Prices and availability</h2>
        <p>
          Prices, discounts, coupon codes and sale dates are shown as a guide and can change at any time on the store. Always
          check the final price, size and details on the store before you buy. Deals marked with a countdown may end early.
        </p>
      </section>

      <section>
        <h2>Our content</h2>
        <p>
          Reels, photos and text on this site belong to {site.name} unless stated otherwise. You're welcome to share links to
          looks; please don't copy or reuse the content itself without permission. Store names and logos belong to their owners.
        </p>
      </section>

      <section>
        <h2>No guarantees</h2>
        <p>
          We do our best to keep information accurate and links working, but we can't guarantee products, sellers or stores. To
          the extent the law allows, we're not responsible for purchases you make on third-party stores.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions? Contact {contact}. See also our <Link to="/privacy">privacy policy</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
