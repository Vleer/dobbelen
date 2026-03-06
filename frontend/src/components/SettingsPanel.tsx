import React, { useRef, useEffect } from 'react';
import { useSettings, ColorScheme, FontSize } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { colorScheme, setColorScheme, fontSize, setFontSize } = useSettings();
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colorOptions: { value: ColorScheme; label: string }[] = [
    { value: 'default', label: t('settings.colorDefault') },
    { value: 'dark', label: t('settings.colorDark') },
    { value: 'white', label: t('settings.colorWhite') },
  ];

  const fontOptions: { value: FontSize; label: string; sizeClass: string }[] = [
    { value: 'small', label: 'Aa', sizeClass: 'text-xs' },
    { value: 'medium', label: 'Aa', sizeClass: 'text-base' },
    { value: 'large', label: 'Aa', sizeClass: 'text-xl' },
  ];

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-[9999] p-4 text-white"
    >
      {/* Color Scheme */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {t('settings.colorScheme')}
        </p>
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          {colorOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setColorScheme(option.value)}
              className={[
                'flex-1 py-1.5 text-xs font-medium transition-all duration-150',
                idx === 0 ? '' : 'border-l border-gray-600',
                colorScheme === option.value
                  ? 'bg-white text-gray-900 font-bold'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {t('settings.fontSize')}
        </p>
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          {fontOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={[
                'flex-1 py-1.5 font-medium transition-all duration-150 flex items-center justify-center',
                idx === 0 ? '' : 'border-l border-gray-600',
                fontSize === option.value
                  ? 'bg-white text-gray-900 font-bold'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
              ].join(' ')}
            >
              <span className={option.sizeClass}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
