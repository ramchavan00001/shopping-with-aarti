// Site-wide copy and links. Replace the placeholder numbers with Aarti's real
// figures before launch.
export const site = {
  name: "Shopping with Aarti",
  handle: "@shopping.with.aartii",
  instagramUrl: "https://www.instagram.com/shopping.with.aartii/",
  whatsappChannelUrl: "#whatsapp", // TODO: WhatsApp channel invite link
  email: "collab@shopwithaarti.in", // TODO: real enquiry address
  // TODO: replace with Aarti's own photos (upload to R2).
  heroPortrait: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=70",
  aboutPortrait: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=70",
  stats: [
    { value: "50K+", label: "shoppers" }, // TODO: real follower count
    { value: "300+", label: "try-on reels" },
    { value: "4", label: "stores" },
  ],
  disclosure:
    "Some links on this site are affiliate links. As an Amazon Associate and affiliate partner of Flipkart, Meesho and Myntra, I earn from qualifying purchases at no extra cost to you.",
} as const;
