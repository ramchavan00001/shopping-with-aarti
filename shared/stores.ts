import type { StoreId } from "./types";

export const stores: Record<StoreId, { name: string; color: string; ink: string; domains: string[] }> = {
  amazon: { name: "Amazon", color: "#FF9900", ink: "#131A22", domains: ["amazon.in", "amzn.to", "amzn.in"] },
  flipkart: { name: "Flipkart", color: "#2874F0", ink: "#FFFFFF", domains: ["flipkart.com", "fkrt.it", "fkrt.co"] },
  meesho: { name: "Meesho", color: "#9F2089", ink: "#FFFFFF", domains: ["meesho.com", "msho.in"] },
  myntra: { name: "Myntra", color: "#FF3F6C", ink: "#FFFFFF", domains: ["myntra.com", "myntr.it"] },
  ajio: { name: "AJIO", color: "#2C4152", ink: "#FFFFFF", domains: ["ajio.com"] },
  other: { name: "Store", color: "#6B5E57", ink: "#FFFFFF", domains: [] },
};

export const mainStores: StoreId[] = ["amazon", "flipkart", "meesho", "myntra"];

/** Work out which store a pasted affiliate link points to. */
export function detectStore(url: string): StoreId {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "other";
  }
  for (const [id, s] of Object.entries(stores)) {
    if (s.domains.some((d) => host === d || host.endsWith(`.${d}`))) return id as StoreId;
  }
  return "other";
}
