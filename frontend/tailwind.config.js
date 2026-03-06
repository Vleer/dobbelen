/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'dice-roll': {
          '0%':   { transform: 'rotate(0deg) scale(1)' },
          '25%':  { transform: 'rotate(90deg) scale(0.82)' },
          '50%':  { transform: 'rotate(180deg) scale(1.12)' },
          '75%':  { transform: 'rotate(270deg) scale(0.82)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        'dice-land': {
          '0%':   { transform: 'scale(0.55) rotate(-25deg)', opacity: '0.6' },
          '45%':  { transform: 'scale(1.3) rotate(6deg)',   opacity: '1' },
          '68%':  { transform: 'scale(0.9) rotate(-3deg)' },
          '84%':  { transform: 'scale(1.1) rotate(1deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        'turn-start': {
          '0%':   { transform: 'scale(1)' },
          '30%':  { transform: 'scale(1.05)' },
          '60%':  { transform: 'scale(0.97)' },
          '80%':  { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'turn-glow': {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(134, 239, 172, 0.0)' },
          '50%':       { 'box-shadow': '0 0 18px 6px rgba(134, 239, 172, 0.45)' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0.65)', opacity: '0' },
          '55%':  { transform: 'scale(1.12)', opacity: '1' },
          '75%':  { transform: 'scale(0.93)' },
          '90%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '18%':       { transform: 'translateX(-7px)' },
          '36%':       { transform: 'translateX(7px)' },
          '54%':       { transform: 'translateX(-5px)' },
          '72%':       { transform: 'translateX(5px)' },
          '88%':       { transform: 'translateX(-2px)' },
        },
        'button-press': {
          '0%':   { transform: 'scale(1)' },
          '35%':  { transform: 'scale(0.88)' },
          '70%':  { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'dice-roll':    'dice-roll 0.13s linear infinite',
        'dice-land':    'dice-land 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'turn-start':   'turn-start 0.55s ease-out',
        'turn-glow':    'turn-glow 2s ease-in-out infinite',
        'bounce-in':    'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-up':     'slide-up 0.32s ease-out forwards',
        'shake':        'shake 0.45s ease-in-out',
        'button-press': 'button-press 0.28s ease-out',
      },
    },
  },
  plugins: [],
};
