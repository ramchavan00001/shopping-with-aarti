import { useSyncExternalStore } from "react";

// Saved reels, kept in this browser only (no login needed).
const KEY = "saved-reels";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

let snapshot = read();

function write(codes: string[]) {
  snapshot = codes;
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    // Storage unavailable (private mode); keep in memory for this visit.
  }
  listeners.forEach((l) => l());
}

export function toggleSaved(code: string) {
  write(snapshot.includes(code) ? snapshot.filter((c) => c !== code) : [code, ...snapshot]);
}

export function useSaved() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}
