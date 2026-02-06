'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar')
  
  useEffect(() => {
    // Get saved language from localStorage or default to Arabic
    const saved = localStorage.getItem('dzdoc-language') as Language
    if (saved && ['ar', 'fr', 'en'].includes(saved)) {
      setLanguageState(saved)
    }
  }, [])
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('dzdoc-language', lang)
    // Update document direction for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }
  
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key
  }
  
  const dir = language === 'ar' ? 'rtl' : 'ltr'
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Return default values for SSR/prerendering
    return {
      language: 'ar' as Language,
      setLanguage: () => {},
      t: (key: TranslationKey) => {
        try {
          return translations?.ar?.[key] || translations?.en?.[key] || key
        } catch {
          return key
        }
      },
      dir: 'rtl' as const
    }
  }
  return context
}
