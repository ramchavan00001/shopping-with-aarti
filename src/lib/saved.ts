import { useSyncExternalStore } from "react";

// Saved looks and products, kept in this browser only (no login needed).
// Newest first. Other open tabs stay in sync through the `storage` event.

function createSavedList(key: string, max = 200) {
  const listeners = new Set<() => void>();

  const read = (): string[] => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  let snapshot = read();
  const emit = () => listeners.forEach((l) => l());

  function write(ids: string[]) {
    snapshot = ids.slice(0, max);
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // Storage unavailable (private mode); keep in memory for this visit.
    }
    emit();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        snapshot = read();
        emit();
      }
    });
  }

  return {
    toggle(id: string) {
      write(snapshot.includes(id) ? snapshot.filter((x) => x !== id) : [id, ...snapshot]);
      return snapshot.includes(id);
    },
    remove(ids: string[]) {
      if (ids.some((id) => snapshot.includes(id))) write(snapshot.filter((x) => !ids.includes(x)));
    },
    clear: () => write([]),
    useList: () =>
      useSyncExternalStore(
        (l) => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        () => snapshot,
      ),
  };
}

export const savedLooks = createSavedList("saved-reels");
export const savedProducts = createSavedList("saved-products");

// Shorthands for saved looks (reels), used across the site.
export const toggleSaved = (code: string) => savedLooks.toggle(code);
export const useSaved = () => savedLooks.useList();

/** Total saved items, for nav badges. */
export function useSavedCount() {
  return savedLooks.useList().length + savedProducts.useList().length;
}
