import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'nl' | 'fr' | 'de' | 'it';

export interface LanguageConfig {
  code: Language;
  nativeName: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    nativeName: 'English'
  },
  {
    code: 'nl',
    nativeName: 'Nederlands'
  },
  {
    code: 'fr',
    nativeName: 'Français'
  },
  {
    code: 'de',
    nativeName: 'Deutsch'
  },
  {
    code: 'it',
    nativeName: 'Italiano'
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

    const isFrenchRegion = fullLocale.includes('fr') || 
                          fullLocale.includes('france') ||
                          fullLocale.includes('french') ||
                          // Check timezone for France and French territories
                          timezone.includes('Paris') ||
                          timezone.includes('France') ||
                          // Check if any of the browser's languages include French
                          allLanguages.some(lang => lang.includes('fr'));

    const isGermanRegion = fullLocale.includes('de') || 
                          fullLocale.includes('germany') ||
                          fullLocale.includes('deutsch') ||
                          fullLocale.includes('at') ||  // Austria
                          fullLocale.includes('ch') ||  // Switzerland
                          // Check timezone for German-speaking regions
                          timezone.includes('Berlin') ||
                          timezone.includes('Vienna') ||
                          timezone.includes('Zurich') ||
                          timezone.includes('Germany') ||
                          timezone.includes('Austria') ||
                          timezone.includes('Switzerland') ||
                          // Check if any of the browser's languages include German
                          allLanguages.some(lang => lang.includes('de'));

                          // Check for Italian region
    const isItalianRegion = fullLocale.includes('it') ||
                          fullLocale.includes('italy') ||
                          timezone.includes('Rome') ||
                          allLanguages.some(lang => lang.includes('it'));
    // Debug logging
    console.log('Language detection:', {
      saved: saved,
      browserLang: browserLang,
      fullLocale: fullLocale,
      timezone: timezone,
      allLanguages: allLanguages,
      isDutchRegion: isDutchRegion,
      isFrenchRegion: isFrenchRegion,
      isGermanRegion: isGermanRegion
    });
    
    // If user is in Dutch region, default to Dutch
    if (isDutchRegion) {
      console.log('Setting Dutch as default language for Dutch region');
      return 'nl';
    }
    
    // If user is in French region, default to French
    if (isFrenchRegion) {
      console.log('Setting French as default language for French region');
      return 'fr';
    }
    
    // If user is in German region, default to German
    if (isGermanRegion) {
      console.log('Setting German as default language for German region');
      return 'de';
    }
    


    if (isItalianRegion) {
      console.log('Setting Italian as default language for Italian region');
      return 'it';
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
