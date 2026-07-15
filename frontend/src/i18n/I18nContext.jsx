import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import en from './en.json';
import pt from './pt.json';
import zh from './zh.json';

const DICTS = { en, pt, zh };
export const LANGUAGES = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

const I18nCtx = createContext(null);

function detectDefaultLang() {
  if (typeof window === 'undefined') return 'pt'; // <- ESSA LINHA SALVA TUDO
  const nav = (navigator.language || 'pt').slice(0, 2);
  return DICTS[nav]? nav : 'pt';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('pt'); // <- começa em pt pra não quebrar

  useEffect(() => {
    setLang(detectDefaultLang()); // <- só detecta depois que carregar no navegador
  }, []);

  const value = useMemo(() => {
    const dict = DICTS[lang] || DICTS['pt']; // <- fallback se não achar
    const t = (key) => dict[key]?? key;
    return { lang, setLang, t };
  }, [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
