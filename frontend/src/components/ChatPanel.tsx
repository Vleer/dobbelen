import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types/game';
import { gameApi } from '../api/gameApi';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  gameId: string;
  playerId: string;
  playerName: string;
  isMobile: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  gameId,
  playerId,
  playerName,
  isMobile,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Small delay to let panel open animation finish
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setInputText('');
    try {
      await gameApi.sendChatMessage(gameId, playerId, playerName, text);
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setInputText(text); // restore on failure
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

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const panelClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-[9990] flex flex-col rounded-t-2xl shadow-2xl border-t-2'
    : 'fixed right-4 bottom-4 z-[9990] w-80 flex flex-col rounded-2xl shadow-2xl border-2';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <button
          type="button"
          aria-label="Close chat"
          className="fixed inset-0 z-[9989] bg-black/40"
          onClick={onClose}
        />
      )}
      <div
        className={panelClass}
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          maxHeight: isMobile ? '60vh' : '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <span className="font-bold text-sm" style={{ color: 'var(--accent-gold)' }}>
            💬 Chat
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0" style={{ minHeight: '8rem' }}>
          {messages.length === 0 ? (
            <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>
              No messages yet. Say hi! 👋
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.playerId === playerId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] font-semibold mb-0.5 px-1" style={{ color: 'var(--accent-gold)' }}>
                      {msg.playerName}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm break-words ${
                      isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}
                    style={
                      isMe
                        ? { backgroundColor: '#1f3f2b', color: '#f5d98f', border: '1px solid #8a6a1d' }
                        : { backgroundColor: 'var(--panel-bg-soft)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }
                    }
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-3 py-2 flex gap-2 items-center border-t flex-shrink-0"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 200))}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm border focus:outline-none"
            style={{
              backgroundColor: 'var(--panel-bg-soft)',
              borderColor: 'var(--panel-border)',
              color: 'var(--text-main)',
            }}
            maxLength={200}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{
              backgroundColor: '#1f3f2b',
              color: '#f5d98f',
              border: '1px solid #8a6a1d',
            }}
            aria-label="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
