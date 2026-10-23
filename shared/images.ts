// Resized images: the browser asks /img?w=480&src=… and gets a WebP sized for
// the screen. Shared by the site (to build srcsets) and the server (to decide
// which sources it may fetch).

/** Widths the server will produce; requests snap up to the nearest one. */
export const imageWidths = [160, 320, 480, 640, 960, 1280] as const;

/** Product-image CDNs of the supported stores, plus the demo photo host. */
const knownHosts = [
  "images.unsplash.com",
  "m.media-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "images.meesho.com",
  "assets.myntassets.com",
];

export function isResizableHost(host: string, mediaHost?: string) {
  host = host.toLowerCase();
  return host === mediaHost || knownHosts.includes(host) || /^rukmini[a-z0-9]*\.flixcart\.com$/.test(host) || host.endsWith(".r2.dev");
}

/** Site images that live in /public. */
export const isSiteImage = (src: string) => /^\/images\/[\w./-]+\.(webp|jpe?g|png|avif)$/i.test(src) && !src.includes("..");

export function snapWidth(w: number) {
  return imageWidths.find((x) => x >= w) ?? imageWidths[imageWidths.length - 1];
}
