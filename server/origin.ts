// The site's public address. Render terminates HTTPS in front of the app, so
// the request URL says http://; use SITE_URL or the forwarded headers instead.
export function publicOrigin(req: Request, siteUrl?: string) {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}
