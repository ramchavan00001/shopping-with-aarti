// Phone/chat alerts for problems on the site. Configure either or both:
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  → message from your Telegram bot
//   ALERT_WEBHOOK_URL                      → Discord / Slack / Google Chat webhook
// Node-only (reads process.env).

export const alertChannels = () => ({
  telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  webhook: !!process.env.ALERT_WEBHOOK_URL,
});

const recent = new Map<string, number>();

/**
 * Send an alert. `key` throttles repeats: the same key alerts at most once
 * per `everyMs` (default 1 hour). Never throws.
 */
export async function sendAlert(title: string, body: string, key = title, everyMs = 3_600_000) {
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - everyMs) return false;
  recent.set(key, now);
  if (recent.size > 500) for (const [k, t] of recent) if (t < now - everyMs) recent.delete(k);

  const text = `⚠️ ${title}\n${body}`.slice(0, 3500);
  const jobs: Promise<unknown>[] = [];
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat, ALERT_WEBHOOK_URL: hook } = process.env;
  if (token && chat) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      }),
    );
  }
  if (hook) {
    // Discord reads `content`, Slack and Google Chat read `text`.
    jobs.push(
      fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, text }),
        signal: AbortSignal.timeout(8000),
      }),
    );
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error(JSON.stringify({ event: "alert_failed", error: String(r.reason) }));
  }
  return jobs.length > 0;
}
