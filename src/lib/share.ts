import { lookPath } from "@shared/paths";

export const lookUrl = (reel: { code: string; slug: string }) => `${location.origin}${lookPath(reel)}`;

export async function shareReel(reel: { code: string; slug: string; title: string }) {
  const url = lookUrl(reel);
  if (navigator.share) {
    try {
      await navigator.share({ title: reel.title, text: `${reel.title} · Shop the look`, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  await navigator.clipboard?.writeText(url);
  return "copied";
}

export const whatsappShareUrl = (reel: { code: string; slug: string; title: string }) =>
  `https://wa.me/?text=${encodeURIComponent(`${reel.title} 😍 Shop the look: ${lookUrl(reel)}`)}`;
