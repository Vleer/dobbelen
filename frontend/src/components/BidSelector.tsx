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

    if (disabled) return `${baseClass} cursor-not-allowed`;
    if (isBidValid(quantity, faceValue)) return `${baseClass} hover:scale-105 cursor-pointer shadow-md`;
    return `${baseClass} cursor-not-allowed`;
  };

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="p-3 rounded-2xl shadow-lg border-2 max-w-sm w-full select-none relative z-10"
        style={{ backgroundColor: 'var(--game-surface-strong)', borderColor: 'var(--game-border)' }}
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
                      handleBidClick(quantity, faceValue);
                    }}
                    disabled={disabled || !isBidValid(quantity, faceValue)}
                    className={`${getBidButtonClass(quantity, faceValue)} ${isClicked ? 'animate-button-press' : ''}`}
                    style={{
                      backgroundColor: disabled
                        ? 'var(--game-surface-soft)'
                        : isBidValid(quantity, faceValue)
                          ? 'var(--game-surface)'
                          : 'var(--game-surface-soft)',
                      borderColor: isBidValid(quantity, faceValue) ? 'var(--game-border-strong)' : 'var(--game-border)',
                      color: disabled || !isBidValid(quantity, faceValue) ? 'var(--game-text-muted)' : 'var(--game-text)',
                    }}
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
            style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
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
            className={`flex-1 py-2 h-10 rounded-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-xs shadow-lg border-2 transition-all duration-200 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
            style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
          >
            {t("game.spotOn")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-xl hover:scale-105 font-bold text-base shadow-lg border-2 transition-all duration-200 flex items-center justify-center"
            style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
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
      className="p-3 rounded-2xl shadow-lg border-2 max-w-sm select-none relative z-10"
      style={{
        backgroundColor: 'var(--game-surface-strong)',
        borderColor: 'var(--game-border)',
        position: "fixed",
        left: "50%",
        bottom: "14rem",
        transform: "translateX(-50%)",
        zIndex: 1000,
      }}
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
                    handleBidClick(quantity, faceValue);
                  }}
                  disabled={disabled || !isBidValid(quantity, faceValue)}
                  className={`${getBidButtonClass(quantity, faceValue)} ${isClicked ? 'animate-button-press' : ''}`}
                  style={{
                    backgroundColor: disabled
                      ? 'var(--game-surface-soft)'
                      : isBidValid(quantity, faceValue)
                        ? 'var(--game-surface)'
                        : 'var(--game-surface-soft)',
                    borderColor: isBidValid(quantity, faceValue) ? 'var(--game-border-strong)' : 'var(--game-border)',
                    color: disabled || !isBidValid(quantity, faceValue) ? 'var(--game-text-muted)' : 'var(--game-text)',
                  }}
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
          className={`flex-1 py-2.5 h-11 rounded-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-sm shadow-lg border-2 transition-all duration-200 ${doubtClicked && animationsEnabled ? 'animate-shake' : ''}`}
          style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
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
          className={`flex-1 py-2.5 h-11 rounded-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-bold text-sm shadow-lg border-2 transition-all duration-200 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
          style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
        >
          {t("game.spotOn")}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          className="w-12 h-11 rounded-2xl hover:scale-105 font-bold text-lg shadow-lg border-2 transition-all duration-200 flex items-center justify-center"
          style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>
    </div>
  );
};

export default BidSelector;