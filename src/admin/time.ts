// Admin date-times are entered and shown in IST, whatever the browser's zone.

/** ISO → "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local">. */
export function toIstInput(iso: string) {
  if (!iso) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "YYYY-MM-DDTHH:mm" (IST) → ISO string with offset. */
export const fromIstInput = (v: string) => (v ? `${v}:00+05:30` : "");

export const formatIst = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
