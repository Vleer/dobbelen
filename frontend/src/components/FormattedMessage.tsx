import React from 'react';

/**
 * FormattedMessage Component
 * 
 * Renders chat messages with rich formatting support:
 * - Detects and converts URLs to clickable links
 * - Supports basic markdown-style formatting:
 *   - Bold text: **text** or __text__
 * - Truncates long URLs for better display
 * - Links open in new tab with security attributes
 */
interface FormattedMessageProps {
  text: string;
}

const FormattedMessage: React.FC<FormattedMessageProps> = ({ text }) => {
  // Function to detect and linkify URLs
  const linkifyText = (inputText: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = inputText.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: '#6eb3f5' }}
            onClick={(e) => e.stopPropagation()}
          >
            {part.length > 30 ? `${part.substring(0, 30)}...` : part}
          </a>
        );
      }
      return <span key={index}>{formatText(part)}</span>;
    });
  };

  // Function to apply basic markdown-style formatting
  const formatText = (inputText: string) => {
    // Bold: **text** or __text__
    let formatted: React.ReactNode[] | string = inputText;
    
    // Bold
    if (typeof formatted === 'string') {
      const boldRegex = /(\*\*|__)(.*?)\1/g;
      const parts = formatted.split(boldRegex);
      formatted = parts.map((part, i) => {
        if (i % 3 === 2) {
          return <strong key={i}>{part}</strong>;
        }
        return part;
      }).filter(p => typeof p !== 'string' || p !== '**' && p !== '__');
    }
    
    return formatted;
  };

  return <>{linkifyText(text)}</>;
};

export default FormattedMessage;
