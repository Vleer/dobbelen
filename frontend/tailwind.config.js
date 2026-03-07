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
          '25%':  { transform: 'scale(1.10)' },
          '60%':  { transform: 'scale(0.96)' },
          '80%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        'turn-glow': {
          '0%, 100%': { 'box-shadow': '0 0 8px 2px rgba(96, 165, 250, 0.25)' },
          '50%':       { 'box-shadow': '0 0 32px 12px rgba(96, 165, 250, 0.80)' },
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
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'winner-glow': {
          '0%, 100%': { boxShadow: '0 0 20px 4px rgba(74, 222, 128, 0.35)' },
          '50%':      { boxShadow: '0 0 50px 18px rgba(74, 222, 128, 0.85)' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 18px 4px rgba(74, 222, 128, 0.35)' },
          '50%':      { boxShadow: '0 0 44px 14px rgba(74, 222, 128, 0.85)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 18px 4px rgba(239, 68, 68, 0.35)' },
          '50%':      { boxShadow: '0 0 44px 14px rgba(239, 68, 68, 0.85)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'confetti-spin': {
          '0%':   { transform: 'rotate(0deg) scale(1)',   opacity: '1' },
          '50%':  { transform: 'rotate(180deg) scale(1.4)', opacity: '1' },
          '100%': { transform: 'rotate(360deg) scale(1)', opacity: '0.7' },
        },
        'star-burst': {
          '0%':   { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '50%':  { transform: 'scale(1.35) rotate(10deg)',  opacity: '1' },
          '75%':  { transform: 'scale(0.9) rotate(-5deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)',   opacity: '1' },
        },
        'flash': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        'elim-flash': {
          '0%':   { transform: 'scale(1)',    boxShadow: '0 0 0px 0px rgba(239, 68, 68, 0)' },
          '25%':  { transform: 'scale(1.10)', boxShadow: '0 0 40px 14px rgba(239, 68, 68, 0.85)' },
          '60%':  { transform: 'scale(0.96)', boxShadow: '0 0 20px 6px rgba(239, 68, 68, 0.45)' },
          '80%':  { transform: 'scale(1.04)', boxShadow: '0 0 10px 3px rgba(239, 68, 68, 0.20)' },
          '100%': { transform: 'scale(1)',    boxShadow: '0 0 0px 0px rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        'dice-roll':      'dice-roll 0.13s linear infinite',
        'dice-land':      'dice-land 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'turn-start':     'turn-start 0.55s ease-out',
        'turn-glow':      'turn-glow 1.4s ease-in-out infinite',
        'bounce-in':      'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-up':       'slide-up 0.32s ease-out forwards',
        'shake':          'shake 0.45s ease-in-out',
        'button-press':   'button-press 0.28s ease-out',
        'float':          'float 2.4s ease-in-out infinite',
        'winner-glow':    'winner-glow 1.6s ease-in-out infinite',
        'pulse-green':    'pulse-green 1.6s ease-in-out infinite',
        'pulse-red':      'pulse-red 1.6s ease-in-out infinite',
        'fade-in':        'fade-in 0.4s ease-out forwards',
        'confetti-spin':  'confetti-spin 1.2s ease-out forwards',
        'star-burst':     'star-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'flash':          'flash 0.8s ease-in-out infinite',
        'elim-flash':     'elim-flash 0.7s ease-out forwards',
      },
    },
  },
  plugins: [],
};
