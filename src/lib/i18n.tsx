import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hi } from "./hi";

// English/Hindi for the public site. The English text is the key: t("Deals")
// returns "डील्स" in Hindi and "Deals" otherwise, so untranslated text falls
// back to English. {name} placeholders are filled from `vars`. Aarti's own
// content (reel titles, captions, product names) stays as she writes it.
// The admin panel is English only.

export type Lang = "en" | "hi";
export const languages: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "hi", label: "हिन्दी", short: "हि" },
];

const KEY = "lang";

function initialLang(): Lang {
  try {
    const param = new URLSearchParams(location.search).get("lang");
    if (param === "hi" || param === "en") {
      localStorage.setItem(KEY, param);
      return param;
    }
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export type Translate = (text: string, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>) {
  const out = lang === "hi" ? (hi[text] ?? text) : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translate }>({
  lang: "en",
  setLang: () => {},
  t: (text, vars) => translate("en", text, vars),
});

const listeners = new Set<(l: Lang) => void>();
/** Run something whenever the language changes (e.g. update push subscriptions). */
export const onLanguageChange = (fn: (l: Lang) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi-IN" : "en-IN";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // Private mode: the choice lasts for this visit.
    }
    listeners.forEach((fn) => fn(l));
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: ((text, vars) => translate(lang, text, vars)) as Translate }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
