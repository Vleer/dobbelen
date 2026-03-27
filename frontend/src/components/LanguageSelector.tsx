import React, { useState } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import Flag from './Flags';

interface LanguageSelectorProps {
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  closeSignal?: number;
  onOpenChange?: (isOpen: boolean) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  buttonClassName = '',
  compact = false,
  closeSignal = 0,
  onOpenChange,
}) => {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLangConfig = availableLanguages.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (language: Language) => {
    setLanguage(language);
    setIsOpen(false);
    onOpenChange?.(false);
  };

  React.useEffect(() => {
    setIsOpen(false);
    onOpenChange?.(false);
    // closeSignal is used as an external imperative close trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSignal]);

  return (
    <div className={`relative ${className}`}>
      {/* Language Selector Button */}
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-all ${buttonClassName}`}
        aria-label="Select language"
      >
        <div className="w-6 h-4"><Flag code={currentLangConfig!.code} /></div>
        <span className="font-semibold text-sm">{currentLangConfig?.code.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              onOpenChange?.(false);
            }}
          />
          
          {/* Dropdown */}
          <div className={`absolute right-0 top-full mt-2 ${compact ? 'w-44' : 'w-48'} bg-[#0f2a1b] rounded-xl shadow-2xl border border-[#8a6a1d] z-20`}>
            <div className="py-1.5">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left transition-colors ${
                    currentLanguage === language.code ? 'bg-[#1f3f2b] text-[#f5d98f]' : 'text-[#f9f3e5] hover:bg-[#1a3424]'
                  }`}
                >
                  <div className="w-8 h-5"><Flag code={language.code} /></div>
                  <div className="flex flex-col">
                    <span className="font-medium">{language.nativeName}</span>
                  </div>
                  {currentLanguage === language.code && (
                    <svg className="w-5 h-5 text-[#e7be5c] ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
