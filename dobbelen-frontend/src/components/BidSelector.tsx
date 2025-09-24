import React, { useState, useRef } from 'react';
import { Bid } from '../types/game';
import DiceHand from './DiceHand';

interface BidSelectorProps {
  currentBid: Bid | null;
  onBidSelect: (quantity: number, faceValue: number) => void;
  onDoubt?: () => void;
  onSpotOn?: () => void;
  disabled: boolean;
}

const BidSelector: React.FC<BidSelectorProps> = ({ currentBid, onBidSelect, onDoubt, onSpotOn, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('bidSelectorExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('bidSelectorPosition');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 400, y: 100 };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const faceValues = [1, 2, 3, 4, 5, 6];
  
  // Calculate valid bidding options based on current bid
  const getValidBids = () => {
    if (!currentBid) {
      // First bid - show 1-4 of any face value
      return Array.from({ length: 4 }, (_, i) => i + 1).map(quantity => 
        faceValues.map(faceValue => ({ quantity, faceValue }))
      ).flat();
    }
    
    const currentQuantity = currentBid.quantity;
    const currentFaceValue = currentBid.faceValue;
    const validBids = [];
    
    // Can increase quantity with same face value
    for (let q = currentQuantity + 1; q <= Math.min(currentQuantity + 3, 20); q++) {
      validBids.push({ quantity: q, faceValue: currentFaceValue });
    }
    
    // Can increase face value with same or higher quantity
    for (let f = currentFaceValue + 1; f <= 6; f++) {
      for (let q = currentQuantity; q <= Math.min(currentQuantity + 3, 20); q++) {
        validBids.push({ quantity: q, faceValue: f });
      }
    }
    
    // Can go back to lower face values with higher quantities
    for (let f = 1; f < currentFaceValue; f++) {
      for (let q = currentQuantity + 1; q <= Math.min(currentQuantity + 3, 20); q++) {
        validBids.push({ quantity: q, faceValue: f });
      }
    }
    
    return validBids;
  };

  const validBids = getValidBids();
  
  // Group by quantity and get the range to display
  const uniqueQuantities = Array.from(new Set(validBids.map(bid => bid.quantity)));
  const quantities = uniqueQuantities.sort((a, b) => b - a);
  // When collapsed, show the lowest 2 values (highest indices)
  // When expanded, show the lowest 4 values
  const displayQuantities = isExpanded ? quantities.slice(-4) : quantities.slice(-2);

  const handleBidClick = (quantity: number, faceValue: number) => {
    if (disabled) return;
    
    // Check if this is a valid bid
    const isValid = validBids.some(bid => bid.quantity === quantity && bid.faceValue === faceValue);
    if (!isValid) return;
    
    onBidSelect(quantity, faceValue);
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem('bidSelectorExpanded', JSON.stringify(newExpanded));
  };

  const isBidValid = (quantity: number, faceValue: number): boolean => {
    return validBids.some(bid => bid.quantity === quantity && bid.faceValue === faceValue);
  };

  const getBidButtonClass = (quantity: number, faceValue: number): string => {
    const baseClass = "w-12 h-12 flex items-center justify-center text-sm font-bold rounded-lg border-2 transition-all duration-200";
    
    if (disabled) {
      return `${baseClass} bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed`;
    }
    
    if (isBidValid(quantity, faceValue)) {
      return `${baseClass} bg-blue-500 border-blue-600 text-white hover:bg-blue-600 hover:scale-105 cursor-pointer shadow-md`;
    }
    
    return `${baseClass} bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed`;
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(newPosition);
      localStorage.setItem('bidSelectorPosition', JSON.stringify(newPosition));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={containerRef}
      className="bg-green-800 p-4 rounded-3xl shadow-lg border-4 border-green-300 max-w-md select-none"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle and expand/collapse */}
      <div className="flex justify-between items-center mb-4 drag-handle">
        <h3 className="text-lg font-bold text-white">Make Your Bid</h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleExpanded}
            className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-sm text-white"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      
      <div className="space-y-2">
        {/* Quantity Rows - Show 2 or 4 rows based on expansion */}
        {displayQuantities.map(quantity => (
          <div key={quantity} className="flex items-center">
            <div className="w-12"></div>
            {faceValues.map(faceValue => (
              <button
                key={`${quantity}-${faceValue}`}
                onClick={() => handleBidClick(quantity, faceValue)}
                disabled={disabled || !isBidValid(quantity, faceValue)}
                className={getBidButtonClass(quantity, faceValue)}
                title={isBidValid(quantity, faceValue) ? `${quantity} of ${faceValue}s` : 'Invalid bid'}
              >
                {quantity}
              </button>
            ))}
          </div>
        ))}
        
        {/* Face Value Headers with Dice - FOOTER */}
        <div className="flex items-end pt-2">
          <div className="w-12"></div>
          {faceValues.map(faceValue => (
            <div key={faceValue} className="w-12 flex justify-center">
              <DiceHand diceValues={[faceValue]} size="md" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      {currentBid && (
        <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={onDoubt}
            disabled={disabled}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            Doubt
          </button>
          <button
            onClick={onSpotOn}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            Spot On
          </button>
        </div>
      )}

    </div>
  );
};

export default BidSelector;