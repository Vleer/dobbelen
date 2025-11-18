import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface InstructionsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsWindow: React.FC<InstructionsWindowProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Center the window initially
  useEffect(() => {
    if (isOpen && !position && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2
      });
    }
  }, [isOpen, position]);

  // Handle ESC key press to close
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [isOpen, onClose]);

  // Handle mouse drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (containerRef.current && containerRef.current.contains(e.target as Node))) {
      // Only start dragging if clicking on the header area
      const target = e.target as HTMLElement;
      const isHeader = target.closest('.drag-handle') !== null;
      
      if (isHeader && containerRef.current) {
        setIsDragging(true);
        const rect = containerRef.current.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep the modal within viewport bounds
      const maxX = window.innerWidth - containerRef.current.offsetWidth;
      const maxY = window.innerHeight - containerRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-6 w-full max-w-md select-none shadow-2xl"
        style={{
          position: 'absolute',
          left: position?.x || '50%',
          top: position?.y || '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header - Draggable Area */}
        <div className="flex justify-between items-center mb-4 drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing">
          <h2 className="text-2xl font-bold text-amber-200 pointer-events-none">
            {t('instructions.title')}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-amber-200 rounded-lg transition-colors duration-200 pointer-events-auto text-xl font-bold"
            title={t('instructions.close')}
          >
            ✕
          </button>
        </div>

        {/* Instructions Content */}
        <div className="text-amber-200 space-y-3 pointer-events-auto">
          <ul className="list-disc list-inside space-y-2 text-base">
            <li>{t('instructions.rollDice')}</li>
            <li>{t('instructions.makeBid')}</li>
            <li>{t('instructions.doubt')}</li>
            <li>{t('instructions.spotOn')}</li>
            <li>{t('instructions.winRound')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InstructionsWindow;
