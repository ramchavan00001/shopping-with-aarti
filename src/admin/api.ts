import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string> = {},
    public field?: string,
  ) {
    super(message);
  }
}

/** JSON request to the admin API; throws ApiError with field errors on failure. */
export async function adminApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string>; field?: string };
  if (res.status === 401 && path !== "/login") window.dispatchEvent(new Event("admin:logged-out"));
  if (!res.ok) {
    const errors = json.errors ?? (json.field ? { [json.field]: json.error ?? "" } : {});
    throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status, errors, json.field);
  }
  return json as T;
}

/** Fetch on mount, with a `reload` for after edits. */
export function useAdminQuery<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path });
  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      setState({ data: await adminApi<T>(path), loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

export const resolveMedia = (path: string, base?: string | null) =>
  !path || /^https?:\/\//.test(path) || !base ? path : `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
