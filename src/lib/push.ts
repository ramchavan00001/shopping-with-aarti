import { useEffect, useState } from "react";
import { isIos, isStandalone } from "./pwa";
import { visitSource } from "./track";

// Push notifications from Aarti (deal alerts). Only asks for permission when
// the follower taps the button. On iPhone, Safari only allows notifications
// for sites added to the home screen, so they're asked to install first.

export type PushState =
  | "loading"
  | "unsupported" // browser can't do push
  | "install-first" // iPhone/iPad in Safari: add to home screen first
  | "off" // not subscribed yet
  | "on" // subscribed
  | "blocked"; // notifications blocked in browser settings

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const ready = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker not ready")), 8000)),
  ]);

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription, lang: string) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), lang, src: visitSource() }),
  });
  if (!res.ok) throw new Error("Couldn't save the subscription");
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export function usePush(lang: string) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!supported()) {
        setState(isIos() && !isStandalone() ? "install-first" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const sub = await currentSubscription().catch(() => null);
      if (sub && Notification.permission === "granted") return alive && setState("on");
      // The read-only Cloudflare preview has no notification server.
      const available = await fetch("/api/push/key").then((r) => r.ok, () => false);
      if (alive) setState(available ? "off" : "unsupported");
    };
    check();
    listeners.add(check);
    return () => {
      alive = false;
      listeners.delete(check);
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return false;
      }
      const reg = await ready();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const res = await fetch("/api/push/key");
        if (!res.ok) throw new Error("Notifications unavailable");
        const { publicKey } = (await res.json()) as { publicKey: string };
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      }
      await save(sub, lang);
      setState("on");
      changed();
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      changed();
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, error, turnOn, turnOff };
}

/** Keep the subscription's language in step with the site language. */
export async function updatePushLanguage(lang: string) {
  try {
    if (!supported() || Notification.permission !== "granted") return;
    const sub = await currentSubscription();
    if (sub) await save(sub, lang);
  } catch {
    // Not important enough to bother the follower.
  }
}

/** The admin's own browser subscription, for "send a test to this device". */
export async function ownEndpoint() {
  try {
    return (await currentSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}
