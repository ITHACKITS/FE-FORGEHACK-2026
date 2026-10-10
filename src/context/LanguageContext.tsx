import React, { createContext, useContext, useState, useEffect } from "react";
import { type Language, translations } from "../utils/translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: typeof translations["en"];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("standbai_lang");
    return (saved === "id" || saved === "en") ? saved : "id";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("standbai_lang", newLang);
    window.dispatchEvent(new CustomEvent("standbai_lang_change", { detail: newLang }));
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "id" : "en");
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && (e.detail === "en" || e.detail === "id")) {
        setLangState(e.detail);
      }
    };
    window.addEventListener("standbai_lang_change", handleSync);
    return () => window.removeEventListener("standbai_lang_change", handleSync);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
