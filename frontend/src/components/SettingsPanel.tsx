import React, { useRef, useEffect } from 'react';
import { useSettings, ColorScheme, FontSize } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  leaveGameLabel?: string;
  mobileCentered?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onLeaveGame,
  leaveGameLabel,
  mobileCentered = false,
}) => {
  const { colorScheme, setColorScheme, fontSize, setFontSize, animationsEnabled, setAnimationsEnabled } = useSettings();
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
    { value: 'x-small', label: 'Aa', sizeClass: 'text-xs' },
    { value: 'small', label: 'Aa', sizeClass: 'text-sm' },
    { value: 'medium', label: 'Aa', sizeClass: 'text-base' },
    { value: 'large', label: 'Aa', sizeClass: 'text-lg' },
    { value: 'x-large', label: 'Aa', sizeClass: 'text-xl' },
  ];

  const panelNode = (
    <div
      ref={panelRef}
      className={[
        "rounded-2xl border border-[#365844] bg-[#0f2a1b]/95 shadow-2xl z-[9999] p-4 text-[#f7f3e8]",
        mobileCentered
          ? "fixed left-1/2 top-1/2 w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2"
          : "absolute right-0 mt-1 w-64",
      ].join(" ")}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-[#a7b9ac] hover:text-[#f7f3e8] transition-colors duration-150 leading-none"
        aria-label="Close settings"
      >
        ✕
      </button>

      {/* Color Scheme */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[#d9b45a] uppercase tracking-wide mb-2">
          {t('settings.colorScheme')}
        </p>
        <div className="flex rounded-lg overflow-hidden border border-[#365844]">
          {colorOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setColorScheme(option.value)}
              className={[
                'flex-1 py-1.5 text-xs font-medium transition-all duration-150',
                idx === 0 ? '' : 'border-l border-[#365844]',
                colorScheme === option.value
                  ? 'bg-[#2e2417] text-[#f5d98f] font-bold'
                  : 'bg-[#12352b] text-[#d2dfd6] hover:bg-[#1b452f]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[#d9b45a] uppercase tracking-wide mb-2">
          {t('settings.fontSize')}
        </p>
        <div className="flex rounded-lg overflow-hidden border border-[#365844]">
          {fontOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={[
                'flex-1 py-1.5 font-medium transition-all duration-150 flex items-center justify-center',
                idx === 0 ? '' : 'border-l border-[#365844]',
                fontSize === option.value
                  ? 'bg-[#2e2417] text-[#f5d98f] font-bold'
                  : 'bg-[#12352b] text-[#d2dfd6] hover:bg-[#1b452f]',
              ].join(' ')}
            >
              <span className={option.sizeClass}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animations Toggle */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-[#d9b45a] uppercase tracking-wide mb-2">
          {t('settings.animations')}
        </p>
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: animationsEnabled ? '#8a6a1d' : '#365844' }}
          role="switch"
          aria-checked={animationsEnabled}
          aria-label={t('settings.animations')}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-[#f7f3e8] shadow-md transition-transform duration-200"
            style={{ transform: animationsEnabled ? 'translateX(28px)' : 'translateX(4px)' }}
          />
        </button>
      </div>

      {onLeaveGame && (
        <button
          onClick={() => {
            onClose();
            onLeaveGame();
          }}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-[#2e2417] hover:bg-[#3c2f1f] text-[#f5d98f] border border-[#8a6a1d] text-sm font-semibold transition-colors"
        >
          {leaveGameLabel || t('game.leaveGame')}
        </button>
      )}
    </div>
  );

  if (mobileCentered) {
    return (
      <>
        <button
          type="button"
          aria-label="Close settings overlay"
          className="fixed inset-0 z-[9998] bg-black/45"
          onClick={onClose}
        />
        {panelNode}
      </>
    );
  }

  return panelNode;
};

export default SettingsPanel;
