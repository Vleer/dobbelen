/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // Activate dark-mode utilities when the <html> element carries the "theme-dark" class.
  // Using `html.theme-dark` ensures only the root HTML element activates the dark palette,
  // keeping the selector precise and intentional.
  // This lets every component use the standard `dark:` prefix (e.g. dark:bg-dk-surface)
  // instead of the brittle CSS-filter approach that was used before.
  darkMode: ["class", "html.theme-dark"],
  theme: {
    extend: {
      colors: {
        // Coordinated dark-theme palette (prefix "dk" to avoid Tailwind name collisions).
        // These values are used exclusively via the `dark:` modifier so they never
        // affect the default theme.
        dk: {
          bg:               "#0d1117", // page background
          surface:          "#161b22", // card / panel surface
          "surface-alt":    "#21262d", // slightly raised surface
          border:           "#30363d", // subtle border
          text:             "#e6edf3", // primary text
          "text-muted":     "#8b949e", // secondary / muted text
          "text-faint":     "#656d76", // faint / disabled text
          input:            "#0d1117", // form input background
          "input-border":   "#30363d", // form input border
          accent:           "#2ea043", // green CTA (readable on dark bg)
          "accent-hover":   "#3fb950", // hover variant
          "accent-dim":     "#238636", // lower-key accent
          table:            "#0c2318", // game-table felt
          panel:            "#0d1f12", // player-card / panel on table
          "panel-border":   "#1a4a2c", // panel border on table
          "dice-face":      "#1e2d3d", // dice face background
          "dice-dot":       "#c9d1d9", // dice dot colour
          "dice-border":    "#334155", // dice border
          "bid-active":     "#1f6feb", // active bid button
          "bid-inactive":   "#21262d", // inactive / disabled bid button
          "bid-inactive-t": "#656d76", // text on inactive bid button
        },
      },
    },
  },
  plugins: [],
};
