import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ColorScheme = 'default' | 'dark' | 'white';
export type FontSize = 'small' | 'medium' | 'large';

const VALID_COLOR_SCHEMES: ColorScheme[] = ['default', 'dark', 'white'];
const VALID_FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

function isColorScheme(value: string | null): value is ColorScheme {
  return VALID_COLOR_SCHEMES.includes(value as ColorScheme);
}

function isFontSize(value: string | null): value is FontSize {
  return VALID_FONT_SIZES.includes(value as FontSize);
}

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
    const saved = localStorage.getItem('colorScheme');
    return isColorScheme(saved) ? saved : 'default';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('fontSize');
    return isFontSize(saved) ? saved : 'medium';
  });

  // Apply color scheme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-default', 'theme-dark', 'theme-white');
    html.classList.add(`theme-${colorScheme}`);
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  // Apply font size class to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('scale-small', 'scale-medium', 'scale-large');
    html.classList.add(`scale-${fontSize}`);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <SettingsContext.Provider value={{ colorScheme, setColorScheme, fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
