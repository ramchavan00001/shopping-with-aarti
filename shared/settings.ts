// Site settings Aarti can edit in Admin → Site settings. These defaults are
// used until she saves her own values (stored in the database).

export interface Stat {
  value: string;
  label: string;
}

export interface SiteSettings {
  instagramHandle: string;
  instagramUrl: string;
  /** WhatsApp channel or group invite link. Empty hides the WhatsApp buttons. */
  whatsappChannelUrl: string;
  email: string;
  /** Home page intro under the big headline. */
  heroIntro: string;
  /** Three numbers under the home page hero. */
  stats: Stat[];
  heroPortrait: string;
  aboutPortrait: string;
  /** Photo for the home page "Meet Aarti" section. */
  meetPortrait: string;
  /** About page story, one entry per paragraph. */
  aboutStory: string[];
  /** Numbers shown to brands on the About page. */
  mediaKitStats: Stat[];
  topCities: string[];
}

export const defaultSettings: SiteSettings = {
  instagramHandle: "@shopping.with.aartii",
  instagramUrl: "https://www.instagram.com/shopping.with.aartii/",
  whatsappChannelUrl: "",
  email: "",
  heroIntro:
    "Hi, I'm Aarti. I buy affordable fashion from Amazon, Flipkart, Meesho and Myntra, try it on honestly, and link every piece here, so you can shop the look in one tap.",
  stats: [
    { value: "50K+", label: "shoppers" },
    { value: "300+", label: "try-on reels" },
    { value: "4", label: "stores" },
  ],
  heroPortrait: "/images/aarti/hero.webp",
  aboutPortrait: "/images/aarti/about.webp",
  meetPortrait: "/images/aarti/meet.webp",
  aboutStory: [
    "It started with one too many disappointing online orders: dresses that looked nothing like the photos, \"free size\" that fit nobody. So I started filming honest try-ons for my friends.",
    "Today a community of shoppers watches my reels before they hit \"Buy\". I test fabric, fit and stitching on a real body and a real budget, so you can shop with confidence.",
  ],
  mediaKitStats: [
    { value: "50K+", label: "Instagram followers" },
    { value: "1.2L", label: "Avg. reel views" },
    { value: "6.8%", label: "Engagement rate" },
    { value: "78%", label: "Women, 18–34" },
  ],
  topCities: ["Mumbai", "Delhi NCR", "Pune", "Bengaluru", "Jaipur"],
};

export const photoFields = ["heroPortrait", "aboutPortrait", "meetPortrait"] as const;

/** Saved overrides on top of the defaults; unknown or missing keys fall back. */
export function mergeSettings(saved: Partial<SiteSettings> | null | undefined): SiteSettings {
  const out = { ...defaultSettings };
  if (!saved || typeof saved !== "object") return out;
  for (const key of Object.keys(defaultSettings) as (keyof SiteSettings)[]) {
    if (saved[key] !== undefined && saved[key] !== null) (out as Record<string, unknown>)[key] = saved[key];
  }
  return out;
}
