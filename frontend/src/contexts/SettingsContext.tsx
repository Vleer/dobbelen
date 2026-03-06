import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ColorScheme = 'default' | 'dark' | 'white';
export type FontSize = 'small' | 'medium' | 'large';

interface SettingsContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    return (localStorage.getItem('colorScheme') as ColorScheme) || 'default';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('fontSize') as FontSize) || 'medium';
  });

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('colorScheme', scheme);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('scheme-default', 'scheme-dark', 'scheme-white');
    root.classList.add(`scheme-${colorScheme}`);
  }, [colorScheme]);

  useEffect(() => {
    const zoomMap: Record<FontSize, string> = {
      small: '0.75',
      medium: '1',
      large: '1.25',
    };
    document.documentElement.style.setProperty('--app-zoom', zoomMap[fontSize]);
  }, [fontSize]);

  return (
    <SettingsContext.Provider value={{ colorScheme, setColorScheme, fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};
