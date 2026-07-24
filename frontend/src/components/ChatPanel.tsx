import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types/game';
import { gameApi } from '../api/gameApi';
import { audioService } from '../services/audioService';
import EmojiPicker from './EmojiPicker';
import FormattedMessage from './FormattedMessage';
import ChatIcon from './ChatIcon';
import { useLanguage } from '../contexts/LanguageContext';

type DragPos = { left: number; top: number };

const chatPosKey = (gameId: string) => `dobbelen-chat-pos:${gameId}`;

const loadChatPos = (gameId: string): DragPos | null => {
  try {
    const raw = sessionStorage.getItem(chatPosKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DragPos;
    if (typeof parsed?.left !== 'number' || typeof parsed?.top !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveChatPos = (gameId: string, pos: DragPos | null) => {
  try {
    if (!pos) {
      sessionStorage.removeItem(chatPosKey(gameId));
      return;
    }
    sessionStorage.setItem(chatPosKey(gameId), JSON.stringify(pos));
  } catch {
    // ignore quota / private mode
  }
};

/**
 * ChatPanel — multiplayer chat with emoji, formatting, drag (desktop), and ESC close.
 */
interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  gameId: string;
  playerId: string;
  playerName: string;
  isMobile: boolean;
  playerColors?: Record<string, string>;
  variant?: 'overlay' | 'inline';
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  gameId,
  playerId,
  playerName,
  isMobile,
  playerColors = {},
  variant = 'overlay',
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingPlayers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const lastMessageIdRef = useRef<string | null>(messages[messages.length - 1]?.id || null);
  const openedAtRef = useRef<number>(0);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [dragPosition, setDragPosition] = useState<DragPos | null>(() =>
    !isMobile ? loadChatPos(gameId) : null
  );
  const [dragging, setDragging] = useState(false);

  const canDrag = !isMobile;

  const clampToViewport = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const width = el?.offsetWidth ?? 320;
    const height = el?.offsetHeight ?? 360;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }, []);

  // Restore saved position when game changes (or remount after close)
  useEffect(() => {
    if (!canDrag) {
      setDragPosition(null);
      return;
    }
    setDragPosition(loadChatPos(gameId));
  }, [gameId, canDrag]);

  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
      // Re-clamp remembered position to the current viewport after layout
      if (canDrag) {
        requestAnimationFrame(() => {
          setDragPosition((prev) => {
            const saved = prev ?? loadChatPos(gameId);
            if (!saved) return prev;
            const clamped = clampToViewport(saved.left, saved.top);
            saveChatPos(gameId, clamped);
            return clamped;
          });
        });
      }
    } else {
      setShowEmojiPicker(false);
      draggingRef.current = false;
      setDragging(false);
      // Keep dragPosition so reopen restores it (also persisted to sessionStorage)
    }
  }, [isOpen, canDrag, gameId, clampToViewport]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  // ESC: close emoji picker first, then panel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, showEmojiPicker]);

  // Play sound notification for new messages (not from self)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newMessage = messages[messages.length - 1];
      if (newMessage && newMessage.playerId !== playerId && newMessage.id !== lastMessageIdRef.current) {
        try {
          audioService.playRaise();
        } catch (e) {
          console.warn('Failed to play chat notification sound', e);
        }
      }
      lastMessageIdRef.current = newMessage?.id || null;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playerId]);

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'button, a, input, textarea, select, [role="button"], [data-no-drag], .chat-scrollbar'
      )
    );
  };

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInteractiveTarget(e.target)) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const origin = { left: rect.left, top: rect.top };
    setDragPosition(origin);
    dragOffsetRef.current = {
      x: e.clientX - origin.left,
      y: e.clientY - origin.top,
    };
    draggingRef.current = true;
    setDragging(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // window listeners still handle the drag
    }
    e.preventDefault();
  };

  useEffect(() => {
    if (!canDrag) return;
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setDragPosition(
        clampToViewport(
          e.clientX - dragOffsetRef.current.x,
          e.clientY - dragOffsetRef.current.y
        )
      );
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      setDragPosition((prev) => {
        if (prev) saveChatPos(gameId, prev);
        return prev;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [canDrag, clampToViewport, gameId]);

  useEffect(() => {
    if (!dragPosition) return;
    const onResize = () =>
      setDragPosition((prev) => {
        if (!prev) return prev;
        const next = clampToViewport(prev.left, prev.top);
        saveChatPos(gameId, next);
        return next;
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [dragPosition, clampToViewport, gameId]);
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setInputText('');
    try {
      await gameApi.sendChatMessage(gameId, playerId, text);
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlayerColor = (playerIdToCheck: string) => {
    return playerColors[playerIdToCheck] || '#f5d98f';
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText((prev) => (prev + emoji).slice(0, 200));
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value.slice(0, 200));
  };

  const handleMobileBackdropClose = () => {
    if (Date.now() - openedAtRef.current < 250) return;
    onClose();
  };

  if (!isOpen) return null;

  const otherTypingPlayersCount = Array.from(typingPlayers).filter((id) => id !== playerId).length;

  const basePanelClass =
    variant === 'inline'
      ? 'w-[calc(100vw-0.5rem)] md:w-96 flex flex-col rounded-2xl shadow-2xl border-2 animate-fade-in overflow-hidden'
      : isMobile
        ? 'fixed inset-x-0 bottom-0 z-[9990] flex flex-col rounded-t-2xl shadow-2xl border-t-2 animate-slide-up'
        : 'fixed right-4 bottom-4 z-[9990] w-80 flex flex-col rounded-2xl shadow-2xl border-2 animate-fade-in';

  const panelClass = [
    basePanelClass,
    dragPosition ? 'fixed z-[9990]' : variant === 'inline' ? 'relative' : '',
    canDrag ? (dragging ? 'cursor-grabbing' : '') : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {variant === 'overlay' && isMobile && (
        <button
          type="button"
          aria-label="Close chat"
          className="fixed inset-0 z-[9989] bg-black/40"
          onClick={handleMobileBackdropClose}
        />
      )}
      <div
        ref={panelRef}
        className={panelClass}
        style={{
          background: 'linear-gradient(180deg, var(--game-surface-soft) 0%, var(--game-surface) 100%)',
          borderColor: 'var(--game-border-strong)',
          maxHeight: variant === 'inline' ? '80vh' : isMobile ? '60vh' : '70vh',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
          ...(dragPosition
            ? { left: dragPosition.left, top: dragPosition.top, right: 'auto', bottom: 'auto', transform: 'none' }
            : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — drag handle on desktop */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b flex-shrink-0 select-none ${
            canDrag ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          style={{ borderColor: 'var(--game-border)' }}
          onPointerDown={onHeaderPointerDown}
          title={canDrag ? 'Drag to move' : undefined}
        >
          <span className="w-5 h-5 shrink-0" style={{ color: 'var(--game-accent-text)' }} aria-hidden>
            <ChatIcon />
          </span>
          <button
            type="button"
            data-no-drag
            onClick={onClose}
            className="text-[10px] font-semibold leading-none transition-all hover:opacity-90 active:scale-95 px-1.5 py-1 rounded border cursor-pointer uppercase tracking-wide"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--game-border)',
              backgroundColor: 'var(--game-surface-soft)',
            }}
            aria-label={`${t('game.closeEsc')} — close chat`}
            title={t('game.closeEsc')}
          >
            [{t('game.closeEsc')}]
          </button>
        </div>

        {/* Messages */}
        <div
          data-no-drag
          className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-0.5 min-h-0 scroll-smooth chat-scrollbar"
          style={{ minHeight: '8rem' }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No messages yet. Say hi! 👋
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.playerId === playerId;
              const playerColor = getPlayerColor(msg.playerId);
              const isNew = idx >= messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isNew ? 'animate-slide-up' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`max-w-[90%] px-2 py-1 rounded-xl text-sm break-words ${
                      isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}
                    style={
                      isMe
                        ? {
                            backgroundColor: 'var(--game-surface-strong)',
                            color: 'var(--game-accent-text)',
                            border: '1px solid var(--game-border-strong)',
                          }
                        : {
                            backgroundColor: 'var(--game-surface-soft)',
                            color: 'var(--game-text)',
                            border: '1px solid var(--game-border)',
                          }
                    }
                  >
                    <div className="whitespace-pre-wrap leading-snug">
                      {!isMe && (
                        <span className="font-semibold mr-1.5" style={{ color: playerColor }}>
                          {msg.playerName}
                        </span>
                      )}
                      <FormattedMessage text={msg.text} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {otherTypingPlayersCount > 0 && (
            <div className="px-2 py-1 flex items-center gap-2 animate-fade-in">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {otherTypingPlayersCount > 1 ? 'Players are typing...' : 'A player is typing...'}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          data-no-drag
          className="px-3 py-3 flex flex-col gap-2 border-t flex-shrink-0 relative"
          style={{ borderColor: 'var(--game-border)' }}
        >
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiSelect={handleEmojiSelect}
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-2 py-2 rounded-lg text-lg transition-all hover:scale-110 active:scale-95"
              style={{
                backgroundColor: showEmojiPicker ? 'rgba(138, 106, 29, 0.2)' : 'transparent',
                border: '1px solid var(--game-border)',
              }}
              aria-label="Emoji picker"
              type="button"
            >
              😊
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                backgroundColor: 'var(--game-surface-soft)',
                borderColor: 'var(--game-border)',
                color: 'var(--game-text)',
              }}
              maxLength={200}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--game-surface-strong)',
                color: 'var(--game-accent-text)',
                border: '1px solid var(--game-border-strong)',
              }}
              aria-label="Send"
            >
              {isSending ? '...' : '➤'}
            </button>
          </div>
          {inputText.length > 0 && (
            <div
              className="text-[10px] text-right transition-all"
              style={{
                color: inputText.length >= 180 ? '#ff6b6b' : 'var(--text-muted)',
                fontWeight: inputText.length >= 180 ? 'bold' : 'normal',
              }}
            >
              {inputText.length}/200
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
