import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useStatistics } from '../contexts/StatisticsContext';

interface StatisticsDisplayProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { statistics, resetStatistics } = useStatistics();
  const [activeTab, setActiveTab] = useState<'overview' | 'bidding' | 'patterns' | 'history'>('overview');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      
      if (isHeader) {
        setIsDragging(true);
        const rect = containerRef.current!.getBoundingClientRect();
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
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toFixed(1);
  };

  const getDiceDistribution = () => {
    const total = statistics.totalDiceRolled;
    if (total === 0) return {};
    
    return Object.entries(statistics.diceFrequency).reduce((acc, [face, count]) => {
      acc[face] = {
        count,
        percentage: (count / total) * 100,
        expected: 16.67 // Expected 1/6 distribution
      };
      return acc;
    }, {} as Record<string, { count: number; percentage: number; expected: number }>);
  };

  const getRecentBidPattern = () => {
    const recentBids = statistics.bidHistory.slice(-10);
    if (recentBids.length < 2) return 'Insufficient data';

    let highLowPattern = '';
    for (let i = 1; i < recentBids.length; i++) {
      const current = recentBids[i];
      const previous = recentBids[i - 1];
      
      if (current.quantity > previous.quantity || current.faceValue > previous.faceValue) {
        highLowPattern += 'H';
      } else {
        highLowPattern += 'L';
      }
    }

    return highLowPattern || 'No pattern';
  };

  const renderOverviewTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{statistics.totalWins}</div>
          <div className="text-sm text-amber-300">{t('statistics.totalWins')}</div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{statistics.timesReachedLastRound}</div>
          <div className="text-sm text-amber-300">{t('statistics.timesReachedLastRound')}</div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{formatNumber(statistics.averageBidQuantity)}</div>
          <div className="text-sm text-amber-300">{t('statistics.averageBidQuantity')}</div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{formatNumber(statistics.averageBidFaceValue)}</div>
          <div className="text-sm text-amber-300">{t('statistics.averageBidFaceValue')}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">
            {statistics.totalDoubts > 0 ? formatPercentage(statistics.doubtSuccessRate) : '0%'}
          </div>
          <div className="text-sm text-amber-300">{t('statistics.doubtSuccessRate')}</div>
          <div className="text-xs text-amber-400">
            {statistics.successfulDoubts}/{statistics.totalDoubts} {t('statistics.doubts')}
          </div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">
            {statistics.totalBids > 0 ? formatPercentage(statistics.probabilityExceedingRate) : '0%'}
          </div>
          <div className="text-sm text-amber-300">{t('statistics.bidsExceedingProbability')}</div>
        </div>
      </div>
    </div>
  );

  const renderBiddingTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">
            {statistics.totalBids > 0 ? formatPercentage(statistics.aggressivenessRate) : '0%'}
          </div>
          <div className="text-sm text-amber-300">{t('statistics.aggressiveness')}</div>
          <div className="text-xs text-amber-400">
            {statistics.aggressiveBids}/{statistics.totalBids} {t('statistics.bids')}
          </div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">
            {statistics.totalBidsToCheck > 0 ? formatPercentage(statistics.overUnderAccuracy) : '0%'}
          </div>
          <div className="text-sm text-amber-300">{t('statistics.overUnderAccuracy')}</div>
          <div className="text-xs text-amber-400">
            {statistics.correctBids}/{statistics.totalBidsToCheck} {t('statistics.checked')}
          </div>
        </div>
      </div>

      <div className="bg-amber-800 p-4 rounded-lg">
        <h4 className="text-lg font-bold text-amber-200 mb-3">{t('statistics.diceFrequency')}</h4>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(getDiceDistribution()).map(([face, data]) => (
            <div key={face} className="text-center">
              <div className="text-2xl mb-1">{face}️⃣</div>
              <div className="text-sm text-amber-300">{data.count}</div>
              <div className="text-xs text-amber-400">{data.percentage.toFixed(1)}%</div>
              <div className="w-full bg-amber-900 rounded">
                <div 
                  className="bg-amber-600 h-2 rounded"
                  style={{ width: `${Math.min(data.percentage * 6, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPatternsTab = () => (
    <div className="space-y-4">
      <div className="bg-amber-800 p-4 rounded-lg">
        <h4 className="text-lg font-bold text-amber-200 mb-2">{t('statistics.recentBidPattern')}</h4>
        <div className="font-mono text-amber-300 text-lg">{getRecentBidPattern()}</div>
        <div className="text-xs text-amber-400 mt-1">H = Higher, L = Lower</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{statistics.consecutiveHighBids}</div>
          <div className="text-sm text-amber-300">{t('statistics.consecutiveHighBids')}</div>
        </div>
        <div className="bg-amber-800 p-4 rounded-lg">
          <div className="text-lg font-bold text-amber-200">{statistics.consecutiveLowBids}</div>
          <div className="text-sm text-amber-300">{t('statistics.consecutiveLowBids')}</div>
        </div>
      </div>

      <div className="bg-amber-800 p-4 rounded-lg">
        <div className="text-lg font-bold text-amber-200">
          {statistics.totalBids > 0 ? formatNumber(statistics.bluffDetectionScore) : '0'}
        </div>
        <div className="text-sm text-amber-300">{t('statistics.bluffDetectionScore')}</div>
        <div className="text-xs text-amber-400">{t('statistics.bluffDetectionDescription')}</div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <h4 className="text-lg font-bold text-amber-200">{t('statistics.recentBids')}</h4>
      <div className="space-y-2">
        {statistics.bidHistory.slice(-10).reverse().map((bid, index) => (
          <div key={index} className="bg-amber-800 p-3 rounded flex justify-between items-center">
            <div>
              <span className="text-amber-200 font-semibold">{bid.playerName}</span>
              <span className="text-amber-300 ml-2">
                {bid.quantity} × {bid.faceValue}s
              </span>
            </div>
            <div className="text-xs text-amber-400">
              R{bid.roundNumber}
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-lg font-bold text-amber-200 mt-6">{t('statistics.recentDoubts')}</h4>
      <div className="space-y-2">
        {statistics.doubtsHistory.slice(-5).reverse().map((doubt, index) => (
          <div key={index} className="bg-amber-800 p-3 rounded">
            <div className="flex justify-between items-center">
              <span className="text-amber-200 font-semibold">{doubt.doubterName}</span>
              <span className={`text-sm px-2 py-1 rounded ${
                doubt.success ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
              }`}>
                {doubt.success ? t('statistics.success') : t('statistics.failed')}
              </span>
            </div>
            <div className="text-sm text-amber-300 mt-1">
              {t('statistics.doubtedBid')}: {doubt.targetBid.quantity} × {doubt.targetBid.faceValue}s
            </div>
            <div className="text-sm text-amber-400">
              {t('statistics.actualCount')}: {doubt.actualCount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="bg-amber-900 border-4 border-amber-700 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden select-none"
        style={{
          position: 'absolute',
          left: position.x || '50%',
          top: position.y || '50%',
          transform: position.x ? 'none' : 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header - Draggable Area */}
        <div className="flex justify-between items-center mb-6 drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing">
          <div className="flex items-center space-x-3 pointer-events-none">
            <div className="text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 8h16v2H4V8zm0 5h16v2H4v-2z"/>
                <path d="M4 3h16v2H4V3zm0 15h16v2H4v-2z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-amber-200">{t('statistics.title')}</h2>
          </div>
          <div className="flex space-x-2 pointer-events-auto">
            <button
              onClick={resetStatistics}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-red-100 rounded-lg transition-colors duration-200"
              title={t('statistics.reset')}
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-200 rounded-lg transition-colors duration-200"
              title={t('statistics.pressEscToClose')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-amber-800 rounded-lg p-1 pointer-events-auto">
          {[
            { key: 'overview', label: t('statistics.overview') },
            { key: 'bidding', label: t('statistics.bidding') },
            { key: 'patterns', label: t('statistics.patterns') },
            { key: 'history', label: t('statistics.history') }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'bg-amber-600 text-amber-100'
                  : 'text-amber-300 hover:bg-amber-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96 pointer-events-auto">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'bidding' && renderBiddingTab()}
          {activeTab === 'patterns' && renderPatternsTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDisplay;
