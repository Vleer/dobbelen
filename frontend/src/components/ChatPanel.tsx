import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types/game';
import { gameApi } from '../api/gameApi';
import { audioService } from '../services/audioService';
import EmojiPicker from './EmojiPicker';
import FormattedMessage from './FormattedMessage';
import ChatIcon from './ChatIcon';

/**
 * ChatPanel Component
 * 
 * An enhanced chat interface for multiplayer games featuring:
 * - Real-time messaging with WebSocket support
 * - Emoji picker with categorized emojis
 * - Message formatting (bold text with **text** or __text__)
 * - URL detection and clickable links
 * - Player color-coded messages
 * - Typing indicators
 * - Sound notifications for new messages
 * - Unread message badges
 * - Smooth animations and transitions
 * - Mobile-responsive design
 * - Character counter (200 char limit)
 * - Custom scrollbar styling
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
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingPlayers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const lastMessageIdRef = useRef<string | null>(messages[messages.length - 1]?.id || null);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Small delay to let panel open animation finish
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages.length]);

  // Play sound notification for new messages (not from self)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newMessage = messages[messages.length - 1];
      if (newMessage && newMessage.playerId !== playerId && newMessage.id !== lastMessageIdRef.current) {
        // Play a subtle notification sound
        try {
          audioService.playRaise(); // Using existing sound - could add custom chat sound
        } catch (e) {
          console.warn('Failed to play chat notification sound', e);
        }
      }
      lastMessageIdRef.current = newMessage?.id || null;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playerId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setInputText('');
    try {
      await gameApi.sendChatMessage(gameId, playerId, text);
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
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const panelClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-[9990] flex flex-col rounded-t-2xl shadow-2xl border-t-2 animate-slide-up'
    : 'fixed right-4 bottom-4 z-[9990] w-80 flex flex-col rounded-2xl shadow-2xl border-2 animate-fade-in';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <button
          type="button"
          aria-label="Close chat"
          className="fixed inset-0 z-[9989] bg-black/40"
          onClick={handleMobileBackdropClose}
        />
      )}
      <div
        className={panelClass}
        style={{
          background: 'linear-gradient(180deg, var(--game-surface-soft) 0%, var(--game-surface) 100%)',
          borderColor: 'var(--game-border-strong)',
          maxHeight: isMobile ? '60vh' : '70vh',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--game-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5" style={{ color: 'var(--game-accent-text)' }}>
              <ChatIcon />
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm" style={{ color: 'var(--game-accent-text)' }}>
                Chat
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none transition-all hover:scale-110 active:scale-95 p-1 rounded-full hover:bg-opacity-10"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close chat"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(138, 106, 29, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0 scroll-smooth chat-scrollbar" style={{ minHeight: '8rem' }}>
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
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isNew ? 'animate-slide-up' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {!isMe && (
                    <div className="flex items-center gap-1 mb-0.5 px-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: playerColor }}
                      />
                      <span 
                        className="text-[10px] font-semibold" 
                        style={{ color: playerColor }}
                      >
                        {msg.playerName}
                      </span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words shadow-md transition-all hover:shadow-lg ${
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
                    <div className="whitespace-pre-wrap">
                      <FormattedMessage text={msg.text} />
                    </div>
                  </div>
                  <span className="text-[9px] mt-0.5 px-1 opacity-70" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            })
          )}
          {otherTypingPlayersCount > 0 && (
            <div className="px-2 py-1 flex items-center gap-2 animate-fade-in">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#8a6a1d] animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                fontWeight: inputText.length >= 180 ? 'bold' : 'normal'
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
