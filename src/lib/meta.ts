import { useEffect } from "react";
import { site } from "@shared/site";

/** Set the tab title and meta description for client-side navigations. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    if (!title) return;
    const prevTitle = document.title;
    document.title = `${title} | ${site.name}`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content;
    if (meta && description) meta.content = description;
    return () => {
      document.title = prevTitle;
      if (meta && prevDesc != null) meta.content = prevDesc;
    };
  }, [title, description]);
}
