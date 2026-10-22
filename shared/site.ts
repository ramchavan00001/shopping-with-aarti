// Site-wide copy and links. Replace the placeholder numbers with Aarti's real
// figures before launch.
export const site = {
  name: "Shopping with Aarti",
  handle: "@shopping.with.aartii",
  instagramUrl: "https://www.instagram.com/shopping.with.aartii/",
  whatsappChannelUrl: "#whatsapp", // TODO: WhatsApp channel invite link
  email: "collab@shopwithaarti.in", // TODO: real enquiry address
  // Aarti's photos, served from public/images/aarti.
  heroPortrait: "/images/aarti/hero.webp",
  aboutPortrait: "/images/aarti/about.webp",
  meetPortrait: "/images/aarti/meet.webp", // home page "Meet Aarti"
  stats: [
    { value: "50K+", label: "shoppers" }, // TODO: real follower count
    { value: "300+", label: "try-on reels" },
    { value: "4", label: "stores" },
  ],
  // Numbers shown to brands on the About page. TODO: replace with real
  // figures from Instagram Insights before sharing the page with brands.
  mediaKit: {
    stats: [
      { value: "50K+", label: "Instagram followers" },
      { value: "1.2L", label: "Avg. reel views" },
      { value: "6.8%", label: "Engagement rate" },
      { value: "78%", label: "Women, 18–34" },
    ],
    topCities: ["Mumbai", "Delhi NCR", "Pune", "Bengaluru", "Jaipur"],
  },
  disclosure:
    "Some links on this site are affiliate links. As an Amazon Associate and affiliate partner of Flipkart, Meesho and Myntra, I earn from qualifying purchases at no extra cost to you.",
} as const;
