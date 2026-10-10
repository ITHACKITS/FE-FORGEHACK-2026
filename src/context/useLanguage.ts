import { createContext, useCallback, useContext } from "react";
import type { Language, translations } from "../utils/translations";

export interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: typeof translations["en"];
}

// Kept apart from LanguageContext.tsx so that file exports only a component (fast refresh).
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

/** Returns tr(en, id): the English or Indonesian copy (text or JSX) for the current language. */
export const useTr = () => {
  const { lang } = useLanguage();
  return useCallback(<T,>(en: T, id: T): T => (lang === "id" ? id : en), [lang]);
};
