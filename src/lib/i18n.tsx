import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { HI_PREFIX, langPath, splitLangPath, translate, type Lang } from "@shared/i18n";

// English/Hindi for the public site. The English text is the key: t("Deals")
// returns "डील्स" in Hindi and "Deals" otherwise, so untranslated text falls
// back to English. {name} placeholders are filled from `vars`. Aarti's own
// content (reel titles, captions, product names) stays as she writes it.
// The admin panel is English only.
//
// The language is part of the address: Hindi pages live under /hi (so Google
// can index both), and the router runs with basename "/hi" there. The last
// choice is remembered, so a Hindi reader opening an English link is sent to
// the Hindi page.

export type { Lang };
export type Translate = (text: string, vars?: Record<string, string | number>) => string;

const KEY = "lang";

function remembered(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "hi" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

function remember(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // Private mode: the address still carries the language.
  }
}

/**
 * Work out the language before the app renders. Returns null when it
 * redirects to the other language's address instead.
 */
export function startLanguage(): { lang: Lang; basename?: string } | null {
  const { lang, path } = splitLangPath(location.pathname);
  const params = new URLSearchParams(location.search);
  const asked = params.get("lang");
  let wanted: Lang = lang;
  if (asked === "hi" || asked === "en") {
    wanted = asked;
    params.delete("lang");
  } else if (lang === "en" && remembered() === "hi" && !path.startsWith("/admin")) {
    wanted = "hi";
  }
  if (asked === "hi" || asked === "en") remember(wanted);
  else if (lang === "hi") remember("hi");

  if (wanted !== lang || asked) {
    const query = params.toString();
    const target = `${langPath(wanted, path)}${query ? `?${query}` : ""}${location.hash}`;
    if (target !== location.pathname + location.search + location.hash) {
      location.replace(target);
      return null;
    }
  }
  return { lang, basename: lang === "hi" ? HI_PREFIX : undefined };
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translate }>({
  lang: "en",
  setLang: () => {},
  t: (text, vars) => translate("en", text, vars),
});

const listeners = new Set<(l: Lang) => unknown>();
/** Run something when the language changes (e.g. update push subscriptions). */
export const onLanguageChange = (fn: (l: Lang) => unknown) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function LanguageProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi-IN" : "en-IN";
  }, [lang]);

  // Switching language loads the same page at the other language's address.
  const setLang = useCallback(
    async (l: Lang) => {
      if (l === lang) return;
      remember(l);
      // Give listeners (push language update) a moment before the page changes.
      await Promise.race([Promise.allSettled([...listeners].map((fn) => fn(l))), new Promise((r) => setTimeout(r, 1500))]);
      const { path } = splitLangPath(location.pathname);
      location.assign(`${langPath(l, path)}${location.search}${location.hash}`);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t: ((text, vars) => translate(lang, text, vars)) as Translate }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
