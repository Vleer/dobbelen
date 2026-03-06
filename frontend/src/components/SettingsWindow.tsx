import React, { useRef, useEffect } from 'react';
import { useSettings, ColorScheme, FontSize } from '../contexts/SettingsContext';

interface SettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsWindow: React.FC<SettingsWindowProps> = ({ isOpen, onClose }) => {
  const { colorScheme, setColorScheme, fontSize, setFontSize } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colorOptions: { value: ColorScheme; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'dark', label: 'Dark' },
    { value: 'white', label: 'White' },
  ];

  const fontOptions: { value: FontSize; label: string; size: string }[] = [
    { value: 'small', label: 'Aa', size: 'text-xs' },
    { value: 'medium', label: 'Aa', size: 'text-base' },
    { value: 'large', label: 'Aa', size: 'text-xl' },
  ];

  return (
    <div
      ref={panelRef}
      className="settings-panel absolute right-0 mt-1 w-64 rounded-xl shadow-2xl border z-[9999] p-4 select-none"
    >
      {/* Color Scheme */}
      <div className="mb-4">
        <p className="settings-label text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
          Color Scheme
        </p>
        <div className="flex rounded-lg overflow-hidden border settings-segment-border">
          {colorOptions.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => setColorScheme(opt.value)}
              className={[
                'flex-1 py-2 text-xs font-medium transition-all duration-200 settings-segment-btn',
                colorScheme === opt.value ? 'settings-segment-active' : 'settings-segment-inactive',
                i > 0 ? 'settings-segment-divider' : '',
              ].join(' ')}
              aria-pressed={colorScheme === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <p className="settings-label text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
          Font Size
        </p>
        <div className="flex rounded-lg overflow-hidden border settings-segment-border">
          {fontOptions.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => setFontSize(opt.value)}
              className={[
                'flex-1 py-2 font-bold transition-all duration-200 settings-segment-btn',
                opt.size,
                fontSize === opt.value ? 'settings-segment-active' : 'settings-segment-inactive',
                i > 0 ? 'settings-segment-divider' : '',
              ].join(' ')}
              aria-pressed={fontSize === opt.value}
              aria-label={`Font size ${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsWindow;
