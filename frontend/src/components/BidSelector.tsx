import React, { useState, useRef } from 'react';
import { Bid } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import DiceHandSVG from './DiceHandSVG';

interface BidSelectorProps {
  currentBid: Bid | null;
  previousBid?: Bid | null;
  onBidSelect: (quantity: number, faceValue: number) => void;
  onDoubt?: () => void;
  onSpotOn?: () => void;
  disabled: boolean;
  isMobile?: boolean; // Mobile layout flag
}

const BidSelector: React.FC<BidSelectorProps> = ({
  currentBid,
  previousBid,
  onBidSelect,
  onDoubt,
  onSpotOn,
  disabled,
  isMobile = false,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  // Disable doubt/spot on if there's no current bid to challenge
  // You can only doubt/spot-on a bid that exists
  const noBidToChallenge = currentBid === null;
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem("bidSelectorExpanded");
    return saved ? JSON.parse(saved) : false;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("bidSelectorPosition");
    if (saved) return JSON.parse(saved);
    // Default: just to the right of local player, with space from bottom
    const x = 372;
    const y = typeof window !== 'undefined' ? window.innerHeight - 280 : 400;
    return { x, y };
  });
  const [clickedBidKey, setClickedBidKey] = useState<string | null>(null);
  const [doubtClicked, setDoubtClicked] = useState(false);
  const [spotOnClicked, setSpotOnClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const faceValues = [1, 2, 3, 4, 5, 6];

  // Calculate valid bidding options based on current bid
  const getValidBids = () => {
    if (!currentBid) {
      // First bid - show 1-4 of any face value
      return Array.from({ length: 4 }, (_, i) => i + 1)
        .map((quantity) =>
          faceValues.map((faceValue) => ({ quantity, faceValue }))
        )
        .flat();
    }

    const currentQuantity = currentBid.quantity;
    const currentFaceValue = currentBid.faceValue;
    const validBids = [];

    // Can increase quantity with same face value
    for (
      let q = currentQuantity + 1;
      q <= Math.min(currentQuantity + 3, 20);
      q++
    ) {
      validBids.push({ quantity: q, faceValue: currentFaceValue });
    }

    // Can increase face value with same or higher quantity
    for (let f = currentFaceValue + 1; f <= 6; f++) {
      for (
        let q = currentQuantity;
        q <= Math.min(currentQuantity + 3, 20);
        q++
      ) {
        validBids.push({ quantity: q, faceValue: f });
      }
    }

    // Can go back to lower face values with higher quantities
    for (let f = 1; f < currentFaceValue; f++) {
      for (
        let q = currentQuantity + 1;
        q <= Math.min(currentQuantity + 3, 20);
        q++
      ) {
        validBids.push({ quantity: q, faceValue: f });
      }
    }

    return validBids;
  };

  const validBids = getValidBids();

  // Group by quantity and get the range to display
  const uniqueQuantities = Array.from(
    new Set(validBids.map((bid) => bid.quantity))
  );
  const quantities = uniqueQuantities.sort((a, b) => b - a);
  // When collapsed, show the lowest 2 values (highest indices)
  // When expanded, show the lowest 4 values
  const displayQuantities = isExpanded
    ? quantities.slice(-4)
    : quantities.slice(-2);

  const handleBidClick = (quantity: number, faceValue: number) => {
    if (disabled) return;

    // Check if this is a valid bid
    const isValid = validBids.some(
      (bid) => bid.quantity === quantity && bid.faceValue === faceValue
    );
    if (!isValid) return;

    if (animationsEnabled) {
      const key = `${quantity}-${faceValue}`;
      setClickedBidKey(key);
      setTimeout(() => setClickedBidKey(null), 320);
    }

    onBidSelect(quantity, faceValue);
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem("bidSelectorExpanded", JSON.stringify(newExpanded));
  };

  const isBidValid = (quantity: number, faceValue: number): boolean => {
    return validBids.some(
      (bid) => bid.quantity === quantity && bid.faceValue === faceValue
    );
  };

  const getBidButtonClass = (quantity: number, faceValue: number): string => {
    const baseClass =
      "w-12 h-12 flex items-center justify-center text-sm font-bold rounded-xl border-2 transition-all duration-200";

    if (disabled) {
      return `${baseClass} bg-[#1c3224] border-[#365844] text-[#7f9788] cursor-not-allowed`;
    }

    if (isBidValid(quantity, faceValue)) {
      return `${baseClass} bg-[#0f3a2a] border-[#8a6a1d] text-[#f7f3e8] hover:bg-[#154732] hover:scale-105 cursor-pointer shadow-md`;
    }

    return `${baseClass} bg-[#173026] border-[#365844] text-[#78907f] cursor-not-allowed`;
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left mouse button
      setDragStart({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      };
      setPosition(newPosition);
      localStorage.setItem("bidSelectorPosition", JSON.stringify(newPosition));
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging) {
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragStart.x, 2) +
          Math.pow(e.clientY - dragStart.y, 2)
      );

      // If dragged more than 5 pixels, it's a drag, not a click
      if (dragDistance > 5) {
        // This was a drag, prevent any click events
        e.preventDefault();
        e.stopPropagation();
      }
    }
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset]);

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="bg-[#082012] p-3 rounded-2xl shadow-lg border-2 border-[#365844] max-w-sm w-full select-none relative z-10"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div className="space-y-0.5">
          {/* Quantity Rows - Show 2 or 4 rows based on expansion */}
          {displayQuantities.map((quantity) => (
            <div
              key={quantity}
              className="flex items-center justify-center gap-0.5"
            >
              {faceValues.map((faceValue) => {
                const bidKey = `${quantity}-${faceValue}`;
                const isClicked = animationsEnabled && clickedBidKey === bidKey;
                return (
                  <button
                    key={bidKey}
                    onClick={(e) => {
                      if (!isDragging) handleBidClick(quantity, faceValue);
                    }}
                    disabled={disabled || !isBidValid(quantity, faceValue)}
                    className={`${getBidButtonClass(quantity, faceValue)} ${isClicked ? 'animate-button-press' : ''}`}
                    title={
                      isBidValid(quantity, faceValue)
                        ? `${quantity} of ${faceValue}s`
                        : "Invalid bid"
                    }
                  >
                    {quantity}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Face Value Headers with Dice - smaller so they line up with buttons */}
          <div className="flex items-center justify-center gap-0.5 pt-0.5">
            {faceValues.map((faceValue) => (
              <div
                key={faceValue}
                className="w-12 h-12 flex justify-center items-center"
              >
                <DiceHandSVG diceValues={[faceValue]} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
          <div className="mt-2 flex gap-2 w-[18.625rem] mx-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (animationsEnabled) {
                setDoubtClicked(true);
                setTimeout(() => setDoubtClicked(false), 480);
              }
              onDoubt?.();
            }}
            disabled={disabled || noBidToChallenge}
            className={`flex-1 py-2 h-10 text-[#f5d98f] rounded-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-xs shadow-lg border-2 transition-all duration-200 ${doubtClicked && animationsEnabled ? 'animate-shake' : ''}`}
            style={{ backgroundColor: '#242d1b', borderColor: '#8a6a1d' }}
          >
            {t("game.doubt")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (animationsEnabled) {
                setSpotOnClicked(true);
                setTimeout(() => setSpotOnClicked(false), 320);
              }
              onSpotOn?.();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={disabled || noBidToChallenge}
            className={`flex-1 py-2 h-10 bg-[#242d1b] text-[#f5d98f] rounded-xl hover:bg-[#2f3a23] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-xs shadow-lg border-2 border-[#8a6a1d] transition-all duration-200 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
          >
            {t("game.spotOn")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-10 h-10 bg-[#12352b] hover:bg-[#1a4a3a] rounded-xl hover:scale-105 font-bold text-base shadow-lg border-2 border-[#365844] transition-all duration-200 flex items-center justify-center text-[#f7f3e8]"
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-[#082012] p-3 rounded-2xl shadow-lg border-2 border-[#365844] max-w-sm select-none relative z-10"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="space-y-1">
        {/* Quantity Rows - Show 2 or 4 rows based on expansion */}
        {displayQuantities.map((quantity) => (
          <div
            key={quantity}
            className="flex items-center justify-center gap-1"
          >
            {faceValues.map((faceValue) => {
              const bidKey = `${quantity}-${faceValue}`;
              const isClicked = animationsEnabled && clickedBidKey === bidKey;
              return (
                <button
                  key={bidKey}
                  onClick={(e) => {
                    // Only handle click if it wasn't a drag
                    if (!isDragging) {
                      handleBidClick(quantity, faceValue);
                    }
                  }}
                  disabled={disabled || !isBidValid(quantity, faceValue)}
                  className={`${getBidButtonClass(quantity, faceValue)} ${isClicked ? 'animate-button-press' : ''}`}
                  title={
                    isBidValid(quantity, faceValue)
                      ? `${quantity} of ${faceValue}s`
                      : "Invalid bid"
                  }
                >
                  {quantity}
                </button>
              );
            })}
          </div>
        ))}

        {/* Face Value Headers with Dice - FOOTER - Perfect grid alignment */}
        <div className="flex items-center justify-center gap-1 pt-1">
          {faceValues.map((faceValue) => (
            <div
              key={faceValue}
              className="w-12 h-12 flex justify-center items-center"
            >
              <DiceHandSVG diceValues={[faceValue]} size="lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex gap-2 w-[19.25rem] mx-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (animationsEnabled) {
              setDoubtClicked(true);
              setTimeout(() => setDoubtClicked(false), 480);
            }
            onDoubt?.();
          }}
          disabled={disabled || noBidToChallenge}
          className={`flex-1 py-2.5 h-11 text-[#f5d98f] rounded-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-sm shadow-lg border-2 transition-all duration-200 ${doubtClicked && animationsEnabled ? 'animate-shake' : ''}`}
          style={{ backgroundColor: '#242d1b', borderColor: '#8a6a1d' }}
        >
          {t("game.doubt")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (animationsEnabled) {
              setSpotOnClicked(true);
              setTimeout(() => setSpotOnClicked(false), 320);
            }
            onSpotOn?.();
          }}
          disabled={disabled || noBidToChallenge}
          className={`flex-1 py-2.5 h-11 bg-[#242d1b] text-[#f5d98f] rounded-2xl hover:bg-[#2f3a23] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-sm shadow-lg border-2 border-[#8a6a1d] transition-all duration-200 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
        >
          {t("game.spotOn")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          className="w-12 h-11 bg-[#12352b] hover:bg-[#1a4a3a] rounded-2xl hover:scale-105 font-bold text-lg shadow-lg border-2 border-[#365844] transition-all duration-200 flex items-center justify-center text-[#f7f3e8]"
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>
    </div>
  );
};

export default BidSelector;