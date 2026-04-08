'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import cs from './i18n/cs.json';
import en from './i18n/en.json';

export type Translations = typeof cs;
export type Lang = 'cs' | 'en';

const langs: Record<Lang, Translations> = { cs, en };

const LangCtx = createContext<{
  t: Translations;
  lang: Lang;
  setLang: (l: Lang) => void;
}>({ t: cs, lang: 'cs', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('cs');
  return (
    <LangCtx.Provider value={{ t: langs[lang], lang, setLang }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useT() {
  return useContext(LangCtx);
}
