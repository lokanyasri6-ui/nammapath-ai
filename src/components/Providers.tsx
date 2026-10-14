"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getSavedLang, saveLang } from "@/lib/client";
import { translate, type DictKey, type Lang } from "@/lib/i18n";

interface SystemStatus {
  ai: { mode: "live" | "demo"; provider: string; model: string };
  database: { mode: "supabase" | "memory" };
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  /** pick between an English and Tamil string */
  L: (en: string, ta?: string) => string;
  status: SystemStatus | null;
}

const AppContext = createContext<Ctx | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const saved = getSavedLang();
    if (saved) setLangState(saved);
    api<SystemStatus>("/api/status").then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (k) => translate(lang, k),
      L: (en, ta) => (lang === "ta" && ta ? ta : en),
      status,
    }),
    [lang, setLang, status],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}
