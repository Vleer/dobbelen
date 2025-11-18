import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TurnNotificationProps {
  show: boolean;
  onHide: () => void;
}

const TurnNotification: React.FC<TurnNotificationProps> = ({ show, onHide }) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide();
      }, 1000); // Hide after 1 second

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Animated notification */}
      <div 
        className="bg-yellow-500 text-gray-900 px-12 py-8 rounded-3xl shadow-2xl border-4 border-yellow-600 transform transition-all duration-300 ease-out animate-pulse"
        style={{
          animation: 'scaleIn 0.3s ease-out'
        }}
      >
        <div className="text-5xl font-bold text-center">
          {t('game.yourTurn')}
        </div>
      </div>
      
      <style>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default TurnNotification;
