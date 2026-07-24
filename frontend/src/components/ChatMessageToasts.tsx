import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types/game';

export interface ChatMessageToastsProps {
  messages: ChatMessage[];
  localPlayerId: string;
  /** When chat is open, suppress new toasts and clear visible ones */
  chatOpen: boolean;
  /** Compact bubbles for mobile top bar */
  compact?: boolean;
}

type ToastItem = {
  id: string;
  playerName: string;
  text: string;
};

const TOAST_MS = 4000;
const MAX_VISIBLE = 2;
const MAX_TEXT_LEN = 72;

const truncate = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TEXT_LEN) return trimmed;
  return `${trimmed.slice(0, MAX_TEXT_LEN - 1)}…`;
};

/**
 * Speech-bubble previews for incoming chat messages (max 2, auto-dismiss).
 * Anchor this inside the relative wrapper around the chat button.
 */
const ChatMessageToasts: React.FC<ChatMessageToastsProps> = ({
  messages,
  localPlayerId,
  chatOpen,
  compact = false,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastSeenIdRef = useRef<string | null>(messages[messages.length - 1]?.id ?? null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearToast = (id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  };

  useEffect(() => {
    if (chatOpen) {
      clearAll();
      lastSeenIdRef.current = messages[messages.length - 1]?.id ?? null;
    }
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen || messages.length === 0) {
      lastSeenIdRef.current = messages[messages.length - 1]?.id ?? lastSeenIdRef.current;
      return;
    }

    const lastId = lastSeenIdRef.current;
    const startIdx = lastId
      ? messages.findIndex((m) => m.id === lastId) + 1
      : Math.max(0, messages.length - MAX_VISIBLE);

    if (startIdx < 0 || startIdx >= messages.length) {
      lastSeenIdRef.current = messages[messages.length - 1]?.id ?? null;
      return;
    }

    const incoming = messages
      .slice(startIdx)
      .filter((m) => m.playerId !== localPlayerId);

    lastSeenIdRef.current = messages[messages.length - 1]?.id ?? null;

    if (incoming.length === 0) return;

    const newIds = new Set(incoming.map((m) => m.id));

    setToasts((prev) => {
      const next = [
        ...prev,
        ...incoming.map((m) => ({
          id: m.id,
          playerName: m.playerName,
          text: truncate(m.text),
        })),
      ].slice(-MAX_VISIBLE);

      timersRef.current.forEach((timer, id) => {
        if (!next.some((t) => t.id === id)) {
          clearTimeout(timer);
          timersRef.current.delete(id);
        }
      });

      next.forEach((item) => {
        if (!newIds.has(item.id) || timersRef.current.has(item.id)) return;
        const timer = setTimeout(() => clearToast(item.id), TOAST_MS);
        timersRef.current.set(item.id, timer);
      });

      return next;
    });
  }, [messages, localPlayerId, chatOpen]);

  useEffect(() => () => clearAll(), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className={`absolute z-[60] flex flex-col gap-1 pointer-events-none ${
        compact
          ? 'left-1/2 top-full mt-0.5 -translate-x-1/2 items-center'
          : 'right-0 top-full mt-1.5 items-end'
      }`}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative animate-bounce-in shadow-lg border ${
            compact
              ? 'max-w-[9.5rem] rounded-md px-1.5 py-0.5'
              : 'max-w-[15rem] rounded-xl px-2.5 py-1.5'
          }`}
          style={{
            backgroundColor: 'var(--game-surface)',
            borderColor: 'var(--game-border-strong)',
          }}
        >
          {/* Tail pointing up toward chat button */}
          <span
            className={`absolute -top-1.5 w-0 h-0 border-l-transparent border-r-transparent border-b-[6px] ${
              compact ? 'left-1/2 -translate-x-1/2' : 'right-3'
            }`}
            style={{ borderBottomColor: 'var(--game-border-strong)' }}
            aria-hidden
          />
          <span
            className={`absolute -top-1 w-0 h-0 border-l-transparent border-r-transparent border-b-[5px] ${
              compact ? 'left-1/2 -translate-x-1/2' : 'right-3'
            }`}
            style={{ borderBottomColor: 'var(--game-surface)' }}
            aria-hidden
          />
          <p
            className={`font-semibold truncate ${compact ? 'text-[9px] leading-tight' : 'text-xs'}`}
            style={{ color: 'var(--game-accent-text)' }}
          >
            {toast.playerName}
          </p>
          <p
            className={`truncate ${compact ? 'text-[8px] leading-tight' : 'text-[11px] leading-snug'}`}
            style={{ color: 'var(--game-text)' }}
          >
            {toast.text}
          </p>
        </div>
      ))}
    </div>
  );
};

export default ChatMessageToasts;
