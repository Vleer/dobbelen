import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'nl';

export interface LanguageConfig {
  code: Language;
  name: string;
  flag: string;
  nativeName: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    nativeName: 'English'
  },
  {
    code: 'nl',
    name: 'Dutch',
    flag: '🇳🇱',
    nativeName: 'Nederlands'
  }
];

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLanguages: LanguageConfig[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    // Try to get language from localStorage, fallback to browser language, then default to English
    const saved = localStorage.getItem('selectedLanguage') as Language;
    if (saved && LANGUAGES.some(lang => lang.code === saved)) {
      return saved;
    }
    
    // Check browser language and locale
    const browserLang = navigator.language.split('-')[0] as Language;
    const fullLocale = navigator.language.toLowerCase();
    
    // Check if user is in Netherlands or Flanders (Belgium)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const allLanguages = navigator.languages.map(lang => lang.toLowerCase());
    
    const isDutchRegion = fullLocale.includes('nl') || 
                         fullLocale.includes('be') || 
                         fullLocale.includes('netherlands') ||
                         fullLocale.includes('flanders') ||
                         fullLocale.includes('vlaanderen') ||
                         // Check timezone for Netherlands/Belgium
                         timezone.includes('Amsterdam') ||
                         timezone.includes('Brussels') ||
                         // Check if any of the browser's languages include Dutch
                         allLanguages.some(lang => lang.includes('nl'));
    
    // Debug logging
    console.log('Language detection:', {
      saved: saved,
      browserLang: browserLang,
      fullLocale: fullLocale,
      timezone: timezone,
      allLanguages: allLanguages,
      isDutchRegion: isDutchRegion
    });
    
    // If user is in Dutch region, default to Dutch
    if (isDutchRegion) {
      console.log('Setting Dutch as default language for Dutch region');
      return 'nl';
    }
    
    // Otherwise check if browser language is supported
    if (LANGUAGES.some(lang => lang.code === browserLang)) {
      return browserLang;
    }
    
    return 'en';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationModule = await import(`../locales/${currentLanguage}.json`);
        setTranslations(translationModule.default);
      } catch (error) {
        console.error(`Failed to load translations for ${currentLanguage}:`, error);
        // Fallback to English if current language fails
        if (currentLanguage !== 'en') {
          try {
            const englishModule = await import('../locales/en.json');
            setTranslations(englishModule.default);
          } catch (fallbackError) {
            console.error('Failed to load fallback English translations:', fallbackError);
          }
        }
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('selectedLanguage', language);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key] || key;
    
    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }
    
    return translation;
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    availableLanguages: LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
