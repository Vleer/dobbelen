import React, { useRef, useEffect } from 'react';
import { useSettings, ColorScheme, FontSize } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  leaveGameLabel?: string;
  mobileCentered?: boolean;
  /** Clicks inside this element (e.g. the settings gear wrapper) do not count as "outside" the panel */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onLeaveGame,
  leaveGameLabel,
  mobileCentered = false,
  anchorRef,
}) => {
  const { colorScheme, setColorScheme, fontSize, setFontSize, animationsEnabled, setAnimationsEnabled } = useSettings();
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click (gear button lives outside the panel DOM — exclude via anchorRef)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef?.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const colorOptions: { value: ColorScheme; label: string }[] = [
    { value: 'dark', label: t('settings.colorDark') },
    { value: 'default', label: t('settings.colorLight') },
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
        "rounded-2xl shadow-2xl z-[9999] p-4",
        "menu-dropdown",
        mobileCentered
          ? "fixed left-1/2 top-1/2 w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2"
          : "absolute right-0 mt-1 w-64",
      ].join(" ")}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 transition-colors duration-150 leading-none"
        style={{ color: 'var(--menu-close-text)' }}
        aria-label="Close settings"
      >
        ✕
      </button>

      {/* Color Scheme */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>
          {t('settings.colorScheme')}
        </p>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--menu-border)' }}>
          {colorOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setColorScheme(option.value)}
              className={[
                'flex-1 py-1.5 text-xs font-medium transition-all duration-150',
                idx === 0 ? '' : 'border-l',
                colorScheme === option.value
                  ? 'font-bold'
                  : '',
              ].join(' ')}
              style={{
                borderColor: idx === 0 ? undefined : 'var(--menu-border)',
                backgroundColor: colorScheme === option.value ? 'var(--menu-dropdown-active-bg)' : 'var(--menu-button-bg)',
                color: colorScheme === option.value ? 'var(--menu-dropdown-active-text)' : 'var(--menu-button-text)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>
          {t('settings.fontSize')}
        </p>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--menu-border)' }}>
          {fontOptions.map((option, idx) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={[
                'flex-1 py-1.5 font-medium transition-all duration-150 flex items-center justify-center',
                idx === 0 ? '' : 'border-l',
                fontSize === option.value
                  ? 'font-bold'
                  : '',
              ].join(' ')}
              style={{
                borderColor: idx === 0 ? undefined : 'var(--menu-border)',
                backgroundColor: fontSize === option.value ? 'var(--menu-dropdown-active-bg)' : 'var(--menu-button-bg)',
                color: fontSize === option.value ? 'var(--menu-dropdown-active-text)' : 'var(--menu-button-text)',
              }}
            >
              <span className={option.sizeClass}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animations Toggle */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>
          {t('settings.animations')}
        </p>
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: animationsEnabled ? 'var(--menu-toggle-on)' : 'var(--menu-toggle-off)' }}
          role="switch"
          aria-checked={animationsEnabled}
          aria-label={t('settings.animations')}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full shadow-md transition-transform duration-200"
            style={{ backgroundColor: 'var(--menu-toggle-thumb)', transform: animationsEnabled ? 'translateX(28px)' : 'translateX(4px)' }}
          />
        </button>
      </div>

      {onLeaveGame && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onLeaveGame();
          }}
          className="settings-leave-game-btn w-full mt-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
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
