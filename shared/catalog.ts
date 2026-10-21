import type { Category, Product, Reel } from "./types";

// Demo catalogue. Videos are free Mixkit stock clips and images are from
// Unsplash, standing in for Aarti's own reels until her files are uploaded to
// R2. Real entries can use relative paths ("reels/a101.mp4"), which are
// resolved against MEDIA_BASE_URL. Affiliate URLs here are plain store search
// links; replace them with real affiliate links.

const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;
const mixkitPoster = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`;

const search = {
  amazon: (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  flipkart: (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  meesho: (q: string) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`,
  myntra: (q: string) => `https://www.myntra.com/${encodeURIComponent(q.replace(/\s+/g, "-"))}`,
};

export const categories: Category[] = [
  { slug: "dresses", name: "Dresses", image: unsplash("1595777457583-95e059d581b8"), blurb: "Maxi, midi & mini" },
  { slug: "ethnic", name: "Kurtis & Ethnic", image: unsplash("1583391733956-3750e0ff4e8b"), blurb: "Everyday to festive" },
  { slug: "sarees", name: "Sarees", image: unsplash("1617627143750-d86bc21e42bb"), blurb: "Silk, georgette & more" },
  { slug: "western", name: "Western & Co-ords", image: unsplash("1515886657613-9f3515b0c78f"), blurb: "Sets, tops & bottoms" },
  { slug: "footwear", name: "Footwear", image: unsplash("1543163521-1bf539c55dd2"), blurb: "Heels, flats & sneakers" },
  { slug: "jewellery", name: "Jewellery", image: unsplash("1535632066927-ab7c9ab60908"), blurb: "Earrings to layering" },
  { slug: "bags", name: "Bags", image: unsplash("1584917865442-de89df76afd3"), blurb: "Totes, slings & clutches" },
  { slug: "beauty", name: "Beauty", image: unsplash("1596462502278-27bfdc403348"), blurb: "Makeup under ₹500" },
];

export const reels: Reel[] = [
  {
    code: "A112",
    slug: "white-summer-dress-under-999",
    title: "The white summer dress everyone asked about",
    caption: "Soft cotton, flowy fit, and it doesn't go see-through. Styled two ways with the same sandals.",
    video: mixkit(52278),
    poster: mixkitPoster(52278),
    category: "dresses",
    tags: ["summer", "white dress", "vacation", "under 999"],
    publishedAt: "2026-10-19",
    isFeatured: true,
    views: 182000,
  },
  {
    code: "A111",
    slug: "wedding-season-lehenga-shopping",
    title: "Wedding season: lehengas that look 5× their price",
    caption: "Shortlisted three lehengas for sangeet and haldi. My favourite is the second one, the dupatta is gorgeous.",
    video: mixkit(51228),
    poster: mixkitPoster(51228),
    category: "ethnic",
    tags: ["wedding", "lehenga", "festive"],
    publishedAt: "2026-10-17",
    views: 241000,
  },
  {
    code: "A110",
    slug: "colour-pop-festive-look",
    title: "Colour-pop festive look for Diwali parties",
    caption: "Bright, comfortable and easy to dance in. Earrings are from Meesho and look way more expensive.",
    video: mixkit(51275),
    poster: mixkitPoster(51275),
    category: "ethnic",
    tags: ["diwali", "festive", "party"],
    publishedAt: "2026-10-15",
    views: 156000,
  },
  {
    code: "A109",
    slug: "bridal-guest-gown-try-on",
    title: "Reception guest gown try-on",
    caption: "Gown with a proper can-can, no extra layer needed. Size up if you're between sizes.",
    video: mixkit(51260),
    poster: mixkitPoster(51260),
    category: "dresses",
    tags: ["reception", "gown", "wedding guest"],
    publishedAt: "2026-10-12",
    views: 98000,
  },
  {
    code: "A108",
    slug: "little-black-dress-meesho-vs-myntra",
    title: "Little black dress: ₹449 vs ₹1,299",
    caption: "Same silhouette, very different prices. Honest review of fabric, fit and stitching for both.",
    video: mixkit(805),
    poster: mixkitPoster(805),
    category: "dresses",
    tags: ["black dress", "comparison", "party"],
    publishedAt: "2026-10-09",
    views: 312000,
  },
  {
    code: "A107",
    slug: "party-ready-in-5-minutes",
    title: "Party-ready in 5 minutes",
    caption: "One co-ord set, three accessories, zero effort. Everything here is under ₹999.",
    video: mixkit(51287),
    poster: mixkitPoster(51287),
    category: "western",
    tags: ["co-ord", "party", "quick look"],
    publishedAt: "2026-10-06",
    views: 134000,
  },
  {
    code: "A106",
    slug: "getting-ready-makeup-under-500",
    title: "Full face of makeup under ₹500",
    caption: "Budget makeup that actually lasts through a long day. Swatches in the second half.",
    video: mixkit(42733),
    poster: mixkitPoster(42733),
    category: "beauty",
    tags: ["makeup", "budget", "under 500"],
    publishedAt: "2026-10-02",
    views: 205000,
  },
  {
    code: "A105",
    slug: "weekend-brunch-outfit",
    title: "Weekend brunch outfit, head to toe",
    caption: "Sunglasses, sling bag and block heels: a full look for less than one designer top.",
    video: mixkit(44560),
    poster: mixkitPoster(44560),
    category: "western",
    tags: ["brunch", "weekend", "accessories"],
    publishedAt: "2026-09-28",
    views: 87000,
  },
  {
    code: "A104",
    slug: "floral-dresses-for-summer",
    title: "3 floral dresses that twirl beautifully",
    caption: "Twirl test passed. All three have pockets!",
    video: mixkit(4702),
    poster: mixkitPoster(4702),
    category: "dresses",
    tags: ["floral", "summer", "twirl"],
    publishedAt: "2026-09-24",
    views: 119000,
  },
  {
    code: "A103",
    slug: "statement-sunglasses-and-accessories",
    title: "Statement sunglasses & accessories haul",
    caption: "Accessories that upgrade a basic outfit instantly. The pearl necklace is my new favourite.",
    video: mixkit(43178),
    poster: mixkitPoster(43178),
    category: "jewellery",
    tags: ["accessories", "sunglasses", "jewellery"],
    publishedAt: "2026-09-20",
    views: 76000,
  },
  {
    code: "A102",
    slug: "stage-ready-co-ord-sets",
    title: "Co-ord sets for college fest",
    caption: "Comfortable enough to dance in all evening. Fabric is breathable and doesn't crush.",
    video: mixkit(47492),
    poster: mixkitPoster(47492),
    category: "western",
    tags: ["co-ord", "college", "fest"],
    publishedAt: "2026-09-16",
    views: 64000,
  },
  {
    code: "A101",
    slug: "comfy-fits-for-dance-class",
    title: "Comfy fits for dance class & errands",
    caption: "Joggers, tees and sneakers I live in. Sneakers are the comfiest I've tried under ₹1,500.",
    video: mixkit(4856),
    poster: mixkitPoster(4856),
    category: "western",
    tags: ["comfy", "athleisure", "sneakers"],
    publishedAt: "2026-09-12",
    views: 58000,
  },
];

let n = 0;
const p = (reelCode: string, x: Omit<Product, "id" | "reelCode" | "isActive">): Product => ({
  id: `p${String(++n).padStart(3, "0")}`,
  reelCode,
  isActive: true,
  ...x,
});

export const products: Product[] = [
  p("A112", { title: "Tiered cotton maxi dress, white", store: "myntra", affiliateUrl: search.myntra("white maxi dress"), image: unsplash("1496747611176-843222e1e57c"), approxPrice: 899, mrp: 2499, category: "dresses", note: "Fully lined, so no slip needed.", sizeTip: "True to size" }),
  p("A112", { title: "Braided flat sandals", store: "amazon", affiliateUrl: search.amazon("braided flat sandals women"), image: unsplash("1525507119028-ed4c629a60a3"), approxPrice: 549, category: "footwear", note: "Cushioned sole, walked a whole day in them." }),
  p("A112", { title: "Pearl layered necklace", store: "meesho", affiliateUrl: search.meesho("pearl layered necklace"), image: unsplash("1515562141207-7a88fb7ce338"), approxPrice: 199, mrp: 599, category: "jewellery" }),

  p("A111", { title: "Silk lehenga with zari dupatta", store: "flipkart", affiliateUrl: search.flipkart("silk lehenga choli"), image: unsplash("1617627143750-d86bc21e42bb"), approxPrice: 1899, mrp: 5999, category: "ethnic", note: "The dupatta alone is worth it.", sizeTip: "Semi-stitched, fits up to 42" }),
  p("A111", { title: "Kundan bangle set", store: "meesho", affiliateUrl: search.meesho("kundan bangles"), image: unsplash("1611591437281-460bfbe1220a"), approxPrice: 249, category: "jewellery" }),
  p("A111", { title: "Banarasi silk saree, plum", store: "myntra", affiliateUrl: search.myntra("banarasi silk saree"), image: unsplash("1610030469983-98e550d6193c"), approxPrice: 1499, mrp: 4299, category: "sarees" }),

  p("A110", { title: "Anarkali kurta set with dupatta", store: "myntra", affiliateUrl: search.myntra("anarkali kurta set"), image: unsplash("1583391733956-3750e0ff4e8b"), approxPrice: 1199, mrp: 3499, category: "ethnic", note: "Flare is huge, perfect for garba.", sizeTip: "Size down if petite" }),
  p("A110", { title: "Statement drop earrings", store: "meesho", affiliateUrl: search.meesho("statement earrings"), image: unsplash("1535632066927-ab7c9ab60908"), approxPrice: 179, mrp: 499, category: "jewellery", note: "Lightweight, wore them for 6 hours." }),

  p("A109", { title: "Red flared evening gown", store: "flipkart", affiliateUrl: search.flipkart("red evening gown"), image: unsplash("1595777457583-95e059d581b8"), approxPrice: 1599, mrp: 3999, category: "dresses", sizeTip: "Size up if between sizes" }),
  p("A109", { title: "Sequin clutch", store: "amazon", affiliateUrl: search.amazon("sequin clutch women"), image: unsplash("1548036328-c9fa89d128fa"), approxPrice: 699, category: "bags" }),

  p("A108", { title: "Bodycon little black dress", store: "meesho", affiliateUrl: search.meesho("black bodycon dress"), image: unsplash("1612336307429-8a898d10e223"), approxPrice: 449, mrp: 999, category: "dresses", note: "Winner on price. Stitching is decent." }),
  p("A108", { title: "Premium black midi dress", store: "myntra", affiliateUrl: search.myntra("black midi dress"), image: unsplash("1509631179647-0177331693ae"), approxPrice: 1299, mrp: 2999, category: "dresses", note: "Better fabric, worth it for repeat wear." }),
  p("A108", { title: "Printed stiletto heels", store: "amazon", affiliateUrl: search.amazon("printed stiletto heels"), image: unsplash("1543163521-1bf539c55dd2"), approxPrice: 999, category: "footwear" }),

  p("A107", { title: "Mustard sweatshirt co-ord set", store: "flipkart", affiliateUrl: search.flipkart("women co ord set"), image: unsplash("1515886657613-9f3515b0c78f"), approxPrice: 799, mrp: 1999, category: "western", note: "Super soft fleece inside." }),
  p("A107", { title: "Pendant chain necklace", store: "meesho", affiliateUrl: search.meesho("pendant necklace women"), image: unsplash("1599643478518-a784e5dc4c8f"), approxPrice: 149, category: "jewellery" }),
  p("A107", { title: "Chunky white sneakers", store: "myntra", affiliateUrl: search.myntra("chunky sneakers women"), image: unsplash("1560769629-975ec94e6a86"), approxPrice: 999, mrp: 2499, category: "footwear" }),

  p("A106", { title: "Compact powder & blush duo", store: "amazon", affiliateUrl: search.amazon("compact powder blush"), image: unsplash("1522335789203-aabd1fc54bc9"), approxPrice: 299, category: "beauty", note: "Blends easily, doesn't look cakey." }),
  p("A106", { title: "Makeup brush set (8 pcs)", store: "flipkart", affiliateUrl: search.flipkart("makeup brush set"), image: unsplash("1596462502278-27bfdc403348"), approxPrice: 249, mrp: 699, category: "beauty" }),
  p("A106", { title: "Matte lipstick + nail paint combo", store: "meesho", affiliateUrl: search.meesho("lipstick nail paint combo"), image: unsplash("1586495777744-4413f21062fa"), approxPrice: 199, category: "beauty" }),
  p("A106", { title: "Waterproof mascara", store: "myntra", affiliateUrl: search.myntra("waterproof mascara"), image: unsplash("1631214540553-ff044a3ff1d4"), approxPrice: 349, mrp: 499, category: "beauty" }),

  p("A105", { title: "Quilted sling bag", store: "myntra", affiliateUrl: search.myntra("quilted sling bag"), image: unsplash("1548036328-c9fa89d128fa"), approxPrice: 899, mrp: 2199, category: "bags", note: "Fits a phone, keys and a power bank." }),
  p("A105", { title: "Wide-leg striped trousers", store: "amazon", affiliateUrl: search.amazon("striped wide leg trousers women"), image: unsplash("1509631179647-0177331693ae"), approxPrice: 699, category: "western" }),
  p("A105", { title: "Structured top-handle bag", store: "flipkart", affiliateUrl: search.flipkart("top handle bag women"), image: unsplash("1584917865442-de89df76afd3"), approxPrice: 1099, mrp: 2999, category: "bags" }),

  p("A104", { title: "Floral wrap midi dress", store: "flipkart", affiliateUrl: search.flipkart("floral wrap dress"), image: unsplash("1496747611176-843222e1e57c"), approxPrice: 649, mrp: 1799, category: "dresses", note: "Has pockets!", sizeTip: "True to size" }),
  p("A104", { title: "Puff-sleeve ruffle dress", store: "myntra", affiliateUrl: search.myntra("puff sleeve dress"), image: unsplash("1581044777550-4cfa60707c03"), approxPrice: 1149, mrp: 2599, category: "dresses" }),

  p("A103", { title: "Pearl strand necklace", store: "amazon", affiliateUrl: search.amazon("pearl necklace women"), image: unsplash("1515562141207-7a88fb7ce338"), approxPrice: 399, category: "jewellery", note: "Looks like real pearls up close." }),
  p("A103", { title: "Crystal statement earrings", store: "meesho", affiliateUrl: search.meesho("crystal earrings"), image: unsplash("1535632066927-ab7c9ab60908"), approxPrice: 229, category: "jewellery" }),
  p("A103", { title: "Red top-handle mini bag", store: "flipkart", affiliateUrl: search.flipkart("red handbag women"), image: unsplash("1584917865442-de89df76afd3"), approxPrice: 899, category: "bags" }),

  p("A102", { title: "Graphic crop tee", store: "myntra", affiliateUrl: search.myntra("graphic crop tee"), image: unsplash("1519722417352-7d6959729417"), approxPrice: 399, mrp: 999, category: "western" }),
  p("A102", { title: "Satin bomber jacket", store: "amazon", affiliateUrl: search.amazon("women bomber jacket"), image: unsplash("1591047139829-d91aecb6caea"), approxPrice: 1299, category: "western" }),

  p("A101", { title: "Blush pink joggers", store: "flipkart", affiliateUrl: search.flipkart("women joggers pink"), image: unsplash("1594633312681-425c7b97ccd1"), approxPrice: 499, mrp: 1299, category: "western", sizeTip: "Size down for a snug fit" }),
  p("A101", { title: "Knit pullover sweater", store: "meesho", affiliateUrl: search.meesho("knit sweater women"), image: unsplash("1556905055-8f358a7a47b2"), approxPrice: 449, category: "western" }),
  p("A101", { title: "Running sneakers, red", store: "amazon", affiliateUrl: search.amazon("women running shoes red"), image: unsplash("1542291026-7eec264c27ff"), approxPrice: 1399, category: "footwear", note: "Comfiest pair under ₹1,500." }),
];
