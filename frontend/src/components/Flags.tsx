import React from 'react';

interface FlagProps {
  code: string;
  className?: string;
}

const Flag: React.FC<FlagProps> = ({ code, className }) => {
  const commonProps = {
    width: "100%",
    height: "100%",
    viewBox: "0 0 900 600",
    className: `${className || ''} rounded-md overflow-hidden`,
  };

  switch (code) {
    case 'it':
      return (
        <svg {...commonProps}>
          <rect width="300" height="600" fill="#009246" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#CE2B37" />
        </svg>
      );
    case 'en':
        return (
          <svg {...commonProps}>
            <rect width="900" height="600" fill="#00247D" />
            <path d="M0,0 L900,600 M900,0 L0,600" stroke="#FFF" strokeWidth="60" />
            <path d="M0,0 L900,600 M900,0 L0,600" stroke="#C8102E" strokeWidth="40" />
            <path d="M0,300 L900,300 M450,0 L450,600" stroke="#FFF" strokeWidth="100" />
            <path d="M0,300 L900,300 M450,0 L450,600" stroke="#C8102E" strokeWidth="60" />
          </svg>
        );
    case 'nl':
        return (
          <svg {...commonProps}>
            <rect width="900" height="200" fill="#AE1C28" />
            <rect y="200" width="900" height="200" fill="#FFFFFF" />
            <rect y="400" width="900" height="200" fill="#21468B" />
          </svg>
        );
    case 'fr':
        return (
          <svg {...commonProps}>
            <rect width="300" height="600" fill="#002654" />
            <rect x="300" width="300" height="600" fill="#FFFFFF" />
            <rect x="600" width="300" height="600" fill="#ED2939" />
          </svg>
        );
    case 'de':
        return (
          <svg {...commonProps}>
            <rect width="900" height="200" fill="#000000" />
            <rect y="200" width="900" height="200" fill="#DD0000" />
            <rect y="400" width="900" height="200" fill="#FFCC00" />
          </svg>
        );
    default:
      return null;
  }
};

export default Flag;
