import { useEffect, useState } from "react";

const cache = new Map<string, unknown>();

/** Minimal fetch hook with an in-memory cache so back-navigation is instant. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>(() =>
    url && cache.has(url) ? { data: cache.get(url) as T, loading: false } : { loading: !!url },
  );

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) {
      setState({ data: cache.get(url) as T, loading: false });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json() as Promise<T>;
      })
      .then((data) => {
        cache.set(url, data);
        setState({ data, loading: false });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ error: e.message, loading: false });
      });
    return () => ctrl.abort();
  }, [url]);

  return state;
}
