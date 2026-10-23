import { imageWidths, isResizableHost, isSiteImage } from "@shared/images";

// Builds /img URLs so phones download a WebP sized for their screen instead of
// the full upload. Anything the server can't resize is used as is.

let mediaHost: string | undefined;
try {
  mediaHost = document.querySelector<HTMLMetaElement>('meta[name="media-host"]')?.content || undefined;
} catch {
  // Not in a browser.
}

function resizable(src: string) {
  if (isSiteImage(src)) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && isResizableHost(url.hostname, mediaHost);
  } catch {
    return false;
  }
}

export const imgUrl = (src: string, width: number) =>
  src && resizable(src) ? `/img?w=${width}&src=${encodeURIComponent(src)}` : src;

/**
 * src/srcSet/sizes for an <img>. `sizes` is how wide the image shows, e.g.
 * "(min-width: 1024px) 25vw, 50vw"; `max` caps the widths offered.
 */
export function responsive(src: string, sizes: string, max = 1280) {
  if (!src || !resizable(src)) return { src };
  const widths = imageWidths.filter((w) => w <= max);
  return {
    src: imgUrl(src, widths[widths.length - 1]),
    srcSet: widths.map((w) => `${imgUrl(src, w)} ${w}w`).join(", "),
    sizes,
  };
}
