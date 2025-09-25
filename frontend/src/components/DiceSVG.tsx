import React from "react";

interface DiceSVGProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

const DiceSVG: React.FC<DiceSVGProps> = ({ value, size = 'md' }) => {
  const getSize = () => {
    switch (size) {
      case 'sm':
        return 32; // Match w-8 h-8 (32px)
      case 'lg':
        return 48; // Match w-12 h-12 (48px)
      default: // 'md'
        return 40; // Slightly larger than sm for better visibility
    }
  };

  const sizePx = getSize();
  const dotSize = sizePx * 0.12; // Smaller dots for better proportion
  const padding = sizePx * 0.08; // Reduced padding for bigger white area

  const renderDots = () => {
    const dots = [];
    const center = sizePx / 2;
    const offset = sizePx * 0.25;

    switch (value) {
      case 1:
        dots.push({ x: center, y: center });
        break;
      case 2:
        dots.push({ x: center - offset, y: center - offset });
        dots.push({ x: center + offset, y: center + offset });
        break;
      case 3:
        dots.push({ x: center - offset, y: center - offset });
        dots.push({ x: center, y: center });
        dots.push({ x: center + offset, y: center + offset });
        break;
      case 4:
        dots.push({ x: center - offset, y: center - offset });
        dots.push({ x: center + offset, y: center - offset });
        dots.push({ x: center - offset, y: center + offset });
        dots.push({ x: center + offset, y: center + offset });
        break;
      case 5:
        dots.push({ x: center - offset, y: center - offset });
        dots.push({ x: center + offset, y: center - offset });
        dots.push({ x: center, y: center });
        dots.push({ x: center - offset, y: center + offset });
        dots.push({ x: center + offset, y: center + offset });
        break;
      case 6:
        dots.push({ x: center - offset, y: center - offset });
        dots.push({ x: center + offset, y: center - offset });
        dots.push({ x: center - offset, y: center });
        dots.push({ x: center + offset, y: center });
        dots.push({ x: center - offset, y: center + offset });
        dots.push({ x: center + offset, y: center + offset });
        break;
    }

    return dots.map((dot, index) => (
      <circle
        key={index}
        cx={dot.x}
        cy={dot.y}
        r={dotSize}
        fill="#1f2937"
        className="drop-shadow-sm"
      />
    ));
  };

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${sizePx} ${sizePx}`}
      className="drop-shadow-md"
    >
      {/* Dice background with gradient */}
      <defs>
        <linearGradient id={`diceGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3f4f6" />
        </linearGradient>
        <filter id={`shadow-${size}`}>
          <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      {/* Main dice body */}
      <rect
        x={padding}
        y={padding}
        width={sizePx - padding * 2}
        height={sizePx - padding * 2}
        rx={sizePx * 0.12}
        ry={sizePx * 0.12}
        fill={`url(#diceGradient-${size})`}
        stroke="#d1d5db"
        strokeWidth="1"
        filter={`url(#shadow-${size})`}
      />
      
      {/* Inner shadow for depth */}
      <rect
        x={padding + 1}
        y={padding + 1}
        width={sizePx - padding * 2 - 2}
        height={sizePx - padding * 2 - 2}
        rx={sizePx * 0.1}
        ry={sizePx * 0.1}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="0.5"
      />
      
      {/* Dots */}
      {renderDots()}
    </svg>
  );
};

export default DiceSVG;
