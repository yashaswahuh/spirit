import React, { createContext, useContext, useState, useEffect } from 'react';
import { enIN, Strings, dictionaries, defaultLocale } from './strings';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: Strings;
}

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  t: enIN,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<string>(() => {
    return localStorage.getItem('spirit_locale') || defaultLocale;
  });

  const setLocale = (newLocale: string) => {
    if (dictionaries[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem('spirit_locale', newLocale);
    }
  };

  useEffect(() => {
    localStorage.setItem('spirit_locale', locale);
  }, [locale]);

  const t = dictionaries[locale] || enIN;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  return useContext(I18nContext);
};

