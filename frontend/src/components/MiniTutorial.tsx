import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';

export type TutorialStep =
  | 'intro'
  | 'explain_bid_your_turn'
  | 'explain_bid_opponent_turn'
  | 'highlight_opponent_bid'
  | 'before_your_bid'
  | 'done';

interface MiniTutorialProps {
  game: Game;
  localPlayerId: string;
  onDismiss: () => void;
  isMobile: boolean;
}

const MiniTutorial: React.FC<MiniTutorialProps> = ({ game, localPlayerId, onDismiss, isMobile }) => {
  const [step, setStep] = useState<TutorialStep>('intro');
  const [seenFirstOpponentBid, setSeenFirstOpponentBid] = useState(false);
  const [lastBidKey, setLastBidKey] = useState('');
  const [beforeBidShown, setBeforeBidShown] = useState(false);

  const isMyTurn = game.currentPlayerId === localPlayerId;

  // Determine who goes first
  useEffect(() => {
    if (step !== 'intro') return;
    if (game.state !== 'IN_PROGRESS') return;
    // Show intro immediately then transition
    const t = setTimeout(() => {
      if (isMyTurn) {
        setStep('explain_bid_your_turn');
      } else {
        setStep('explain_bid_opponent_turn');
      }
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state]);

  // Watch for opponent making a bid
  useEffect(() => {
    if (seenFirstOpponentBid) return;
    if (!game.currentBid) return;
    if (game.currentBid.playerId === localPlayerId) return;
    const key = `${game.currentBid.playerId}-${game.currentBid.quantity}-${game.currentBid.faceValue}`;
    if (key === lastBidKey) return;
    setLastBidKey(key);
    if (step === 'explain_bid_opponent_turn') {
      setSeenFirstOpponentBid(true);
      setStep('highlight_opponent_bid');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentBid]);

  // Watch for it becoming my turn (to show "before your bid" tip)
  useEffect(() => {
    if (beforeBidShown) return;
    if (!isMyTurn) return;
    if (step === 'highlight_opponent_bid' || (step === 'explain_bid_opponent_turn' && seenFirstOpponentBid)) {
      setBeforeBidShown(true);
      setStep('before_your_bid');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <>
            <div className="text-2xl mb-2">🎲</div>
            <p className="font-bold text-base mb-1" style={{ color: 'var(--accent-gold)' }}>Mini Tutorial</p>
            <p className="text-sm" style={{ color: 'var(--text-main)' }}>
              The game has started! Each player has hidden dice. Get ready…
            </p>
          </>
        );
      case 'explain_bid_your_turn':
        return (
          <>
            <div className="text-2xl mb-2">👋</div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--accent-gold)' }}>It's your turn!</p>
            <p className="text-sm mb-3" style={{ color: 'var(--text-main)' }}>
              Place a <strong>bid</strong> — you're claiming how many dice of a specific number exist
              across <em>all players' hands combined</em>.
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Example: bid "3 fours" means you believe there are at least 3 fours total among all players' dice.
            </p>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
              Bid anything you like — bluffing is fine! 😏
            </p>
            <button onClick={() => setStep('before_your_bid')} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#1f3f2b', color: '#f5d98f', border: '1px solid #8a6a1d' }}>
              Got it, show me more →
            </button>
          </>
        );
      case 'explain_bid_opponent_turn':
        return (
          <>
            <div className="text-2xl mb-2">👀</div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--accent-gold)' }}>Another player goes first</p>
            <p className="text-sm mb-2" style={{ color: 'var(--text-main)' }}>
              Watch the other player place a <strong>bid</strong>. Their bid means they claim
              there are at least that many dice of that number across <em>all players' hands combined</em>.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Waiting for their bid…
            </p>
          </>
        );
      case 'highlight_opponent_bid':
        return (
          <>
            <div className="text-2xl mb-2">🔍</div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--accent-gold)' }}>Bid placed!</p>
            <p className="text-sm mb-3" style={{ color: 'var(--text-main)' }}>
              See the bid displayed in the middle? That's how many dice of that number they claim
              are in <em>all hands combined</em>.
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Waiting for your turn to explain your options…
            </p>
          </>
        );
      case 'before_your_bid':
        return (
          <>
            <div className="text-2xl mb-2">⚡</div>
            <p className="font-bold text-base mb-2" style={{ color: 'var(--accent-gold)' }}>Before you act…</p>
            <p className="text-sm mb-2" style={{ color: 'var(--text-main)' }}>
              You have three options on your turn:
            </p>
            <ul className="text-sm space-y-1.5 mb-3">
              <li style={{ color: 'var(--text-main)' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Raise</strong> — Bid a higher number or a different face value
              </li>
              <li style={{ color: 'var(--text-main)' }}>
                <strong style={{ color: '#ef4444' }}>Doubt</strong> — Challenge the last bid if you think it's too high.{' '}
                <span style={{ color: 'var(--text-muted)' }}>Loser loses a die. Risky!</span>
              </li>
              <li style={{ color: 'var(--text-main)' }}>
                <strong style={{ color: '#22c55e' }}>Spot On</strong> — Claim the bid is <em>exactly</em> right.{' '}
                <span style={{ color: 'var(--text-muted)' }}>If correct, round resets. If wrong, you lose a die. Very risky!</span>
              </li>
            </ul>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
              🏆 Last remaining player wins!
            </p>
            <button onClick={() => setStep('done')} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#1f3f2b', color: '#f5d98f', border: '1px solid #8a6a1d' }}>
              I'm ready to play! 🎲
            </button>
          </>
        );
      default:
        return null;
    }
  };

  if (step === 'done') {
    onDismiss();
    return null;
  }

  const panelClass = isMobile
    ? 'fixed bottom-32 left-3 right-3 z-[9980] rounded-2xl shadow-2xl border-2 p-4'
    : 'fixed bottom-8 left-8 z-[9980] w-80 rounded-2xl shadow-2xl border-2 p-4';

  return (
    <div
      className={panelClass}
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: '#8a6a1d',
        boxShadow: '0 0 24px 6px rgba(138,106,29,0.35)',
        animation: 'bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-sm leading-none"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss tutorial"
      >
        ✕
      </button>
      {renderContent()}
    </div>
  );
};

export default MiniTutorial;
