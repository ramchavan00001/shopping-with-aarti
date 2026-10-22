// Brand collaboration enquiry: shared by the About page form and the API so
// both validate the same way.

export const collabTypes = ["Instagram reel", "Story series", "Unboxing / haul", "Giveaway", "Long-term ambassador", "Other"] as const;
export const budgets = ["Under ₹10,000", "₹10,000 – ₹25,000", "₹25,000 – ₹50,000", "₹50,000+", "Barter / product only", "Not sure yet"] as const;

export interface Enquiry {
  name: string;
  brand: string;
  email: string;
  phone?: string;
  type: (typeof collabTypes)[number];
  budget: (typeof budgets)[number];
  message: string;
  /** Honeypot. Real people never see or fill it. */
  website?: string;
}

export type EnquiryErrors = Partial<Record<keyof Enquiry, string>>;

export function validateEnquiry(input: Partial<Record<keyof Enquiry, unknown>>): { data?: Enquiry; errors: EnquiryErrors } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const data = {
    name: str(input.name),
    brand: str(input.brand),
    email: str(input.email),
    phone: str(input.phone).replace(/[\s-]/g, ""),
    type: str(input.type),
    budget: str(input.budget),
    message: str(input.message),
    website: str(input.website),
  };
  const errors: EnquiryErrors = {};
  if (data.name.length < 2 || data.name.length > 80) errors.name = "Please enter your name.";
  if (data.brand.length < 2 || data.brand.length > 120) errors.brand = "Please enter your brand or company.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) || data.email.length > 200) errors.email = "Please enter a valid email.";
  if (data.phone && !/^\+?\d{10,15}$/.test(data.phone)) errors.phone = "Please enter a valid phone number.";
  if (!(collabTypes as readonly string[]).includes(data.type)) errors.type = "Please choose a collaboration type.";
  if (!(budgets as readonly string[]).includes(data.budget)) errors.budget = "Please choose a budget.";
  if (data.message.length < 20 || data.message.length > 2000) errors.message = "Tell me a little more (at least 20 characters).";

  if (Object.keys(errors).length) return { errors };
  return { data: { ...data, phone: data.phone || undefined } as Enquiry, errors };
}
