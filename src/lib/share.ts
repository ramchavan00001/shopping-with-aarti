export async function shareReel(code: string, title: string) {
  const url = `${location.origin}/reels?start=${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `${title} · Shop the look`, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  await navigator.clipboard?.writeText(url);
  return "copied";
}
