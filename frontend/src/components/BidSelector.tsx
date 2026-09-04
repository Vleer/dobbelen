import React, { useState, useRef, type CSSProperties } from 'react';
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
  /** When true, no fixed positioning — parent column stacks this under BidDisplay */
  stacked?: boolean;
  /** Desktop: match LocalPlayer width in landscape */
  compactDesktopLandscape?: boolean;
  /**
   * When false, hide raise grid / Spot On and only show Doubt
   * (Doubt is allowed off-turn for any active player).
   */
  canBid?: boolean;
  /** Local player id — used to block doubting your own bid */
  localPlayerId?: string;
}

const BidSelector: React.FC<BidSelectorProps> = ({
  currentBid,
  previousBid,
  onBidSelect,
  onDoubt,
  onSpotOn,
  disabled,
  isMobile = false,
  stacked = false,
  compactDesktopLandscape = false,
  canBid = true,
  localPlayerId,
}) => {
  const { t } = useLanguage();
  const { animationsEnabled } = useSettings();
  // You can only doubt a bid that exists, and not your own
  const noBidToChallenge = currentBid === null;
  const isOwnBid =
    !!currentBid && !!localPlayerId && currentBid.playerId === localPlayerId;
  const doubtDisabled = disabled || noBidToChallenge || isOwnBid;
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
    if (disabled || !canBid) return;

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
      "w-12 h-12 flex items-center justify-center text-sm font-bold rounded-xl border-2";

    if (disabled) return `${baseClass} cursor-not-allowed`;
    if (isBidValid(quantity, faceValue)) return `${baseClass} interactive-press cursor-pointer shadow-md`;
    return `${baseClass} cursor-not-allowed`;
  };

  const fireDoubt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (doubtDisabled) return;
    if (animationsEnabled) {
      setDoubtClicked(true);
      setTimeout(() => setDoubtClicked(false), 480);
    }
    onDoubt?.();
  };

  const doubtButtonClass = (compact: boolean) =>
    `${compact ? 'flex-1 py-2 h-10 text-xs rounded-xl' : 'flex-1 py-2.5 h-11 text-sm rounded-2xl'} interactive-press font-bold shadow-lg border-2 ${
      doubtClicked && animationsEnabled ? 'animate-shake' : ''
    }`;

  const doubtButtonStyle: CSSProperties = {
    backgroundColor: 'var(--game-surface-soft)',
    borderColor: 'var(--game-border-strong)',
    color: 'var(--game-accent-text)',
  };

  // Off-turn: always show Doubt alone so it's available on every viewport
  if (!canBid) {
    const doubtOnlyShell: CSSProperties = {
      backgroundColor: 'var(--game-surface-strong)',
      borderColor: 'var(--game-border)',
      ...(isMobile
        ? {}
        : stacked
          ? {
              width: compactDesktopLandscape
                ? 'min(360px, 80vw)'
                : 'min(420px, 80vw)',
              maxWidth: '80vw',
            }
          : {
              position: 'fixed',
              left: '50%',
              bottom: '12rem',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              width: compactDesktopLandscape
                ? 'min(360px, 80vw)'
                : 'min(420px, 80vw)',
              maxWidth: '80vw',
            }),
    };

    return (
      <div
        ref={containerRef}
        className={
          isMobile
            ? 'p-2 rounded-2xl shadow-lg border-2 w-full max-w-sm select-none relative z-10 mx-auto'
            : stacked
              ? 'p-2 rounded-2xl shadow-lg border-2 flex flex-col select-none relative z-10 pointer-events-auto mx-auto'
              : 'p-2 rounded-2xl shadow-lg border-2 flex flex-col select-none relative z-10'
        }
        style={doubtOnlyShell}
      >
        <button
          type="button"
          onClick={fireDoubt}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={doubtDisabled}
          className={`${doubtButtonClass(isMobile)} w-full`}
          style={doubtButtonStyle}
          title={
            isOwnBid
              ? t('game.cannotDoubtOwnBid')
              : noBidToChallenge
                ? t('game.noBidToDoubt')
                : t('game.doubt')
          }
        >
          {t('game.doubt')}
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="p-3 rounded-2xl shadow-lg border-2 w-full max-w-sm select-none relative z-10 mx-auto"
        style={{ backgroundColor: 'var(--game-surface-strong)', borderColor: 'var(--game-border)' }}
      >
        <div className="w-max max-w-full mx-auto">
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

          {/* Action Buttons — same width as dice row above */}
          <div className="mt-2 flex gap-2 w-full">
            <button
              type="button"
              onClick={fireDoubt}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={doubtDisabled}
              className={doubtButtonClass(true)}
              style={doubtButtonStyle}
            >
              {t("game.doubt")}
            </button>
            <button
              type="button"
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
              className={`interactive-press flex-1 py-2 h-10 rounded-xl font-bold text-xs shadow-lg border-2 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
              style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
            >
              {t("game.spotOn")}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="interactive-press w-10 h-10 shrink-0 rounded-xl font-bold text-base shadow-lg border-2 flex items-center justify-center"
              style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
            >
              {isExpanded ? "−" : "+"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const desktopShellStyle: CSSProperties = {
    backgroundColor: 'var(--game-surface-strong)',
    borderColor: 'var(--game-border)',
    width: compactDesktopLandscape ? 'min(360px, 80vw)' : 'min(420px, 80vw)',
    maxWidth: '80vw',
    ...(stacked
      ? {}
      : {
          position: 'fixed',
          left: '50%',
          bottom: '12rem',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }),
  };

  return (
    <div
      ref={containerRef}
      className={
        stacked
          ? 'p-3 rounded-2xl shadow-lg border-2 flex flex-col select-none relative z-10 pointer-events-auto mx-auto'
          : 'p-3 rounded-2xl shadow-lg border-2 flex flex-col select-none relative z-10'
      }
      style={desktopShellStyle}
    >
      <div className="space-y-1 w-full">
        {/* Quantity Rows - Show 2 or 4 rows based on expansion */}
        {displayQuantities.map((quantity) => (
          <div
            key={quantity}
            className="flex items-center justify-center gap-1 w-full"
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
        <div className="flex items-center justify-center gap-1 pt-1 w-full">
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

      {/* Action Buttons — stretch to panel width (matches own player) */}
      <div className="mt-2 flex gap-2 w-full">
        <button
          type="button"
          onClick={fireDoubt}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={doubtDisabled}
          className={doubtButtonClass(false)}
          style={doubtButtonStyle}
        >
          {t("game.doubt")}
        </button>
        <button
          type="button"
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
          className={`interactive-press flex-1 py-2.5 h-11 rounded-2xl font-bold text-sm shadow-lg border-2 ${spotOnClicked && animationsEnabled ? 'animate-button-press' : ''}`}
          style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border-strong)', color: 'var(--game-accent-text)' }}
        >
          {t("game.spotOn")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="interactive-press w-12 h-11 shrink-0 rounded-2xl font-bold text-lg shadow-lg border-2 flex items-center justify-center"
          style={{ backgroundColor: 'var(--game-surface-soft)', borderColor: 'var(--game-border)', color: 'var(--game-text)' }}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>
    </div>
  );
};

export default BidSelector;
