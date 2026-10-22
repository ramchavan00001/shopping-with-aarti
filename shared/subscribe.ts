// WhatsApp deal-alert sign-up, validated the same way in the form and the API.

export const alertInterests = ["Kurtis & ethnic", "Western & co-ords", "Dresses", "Sarees", "Footwear", "Jewellery", "Bags", "Beauty", "Big sales only"] as const;

export interface SubscribeInput {
  name: string;
  phone: string;
  interests: string[];
  consent: boolean;
  /** Honeypot. */
  website?: string;
}

/** Indian 10-digit mobiles get +91; other numbers must include their country code. */
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (/^[6-9]\d{9}$/.test(d)) d = `91${d}`;
  return /^[1-9]\d{10,14}$/.test(d) ? d : null;
}

export function validateSubscribe(input: Partial<Record<keyof SubscribeInput, unknown>>) {
  const errors: Partial<Record<keyof SubscribeInput, string>> = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? normalisePhone(input.phone) : null;
  const interests = Array.isArray(input.interests)
    ? input.interests.filter((i): i is string => typeof i === "string" && (alertInterests as readonly string[]).includes(i))
    : [];
  if (name.length < 2 || name.length > 60) errors.name = "Please enter your name.";
  if (!phone) errors.phone = "Enter a WhatsApp number, e.g. 98765 43210.";
  if (input.consent !== true) errors.consent = "Please tick the box so I can message you.";
  if (Object.keys(errors).length) return { errors };
  return { data: { name, phone: phone!, interests, website: typeof input.website === "string" ? input.website : "" }, errors };
}
