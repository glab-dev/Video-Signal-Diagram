/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ==========================================
      // CYBER-GRID THEME COLORS
      // ==========================================
      colors: {
        // Neon Vapor Theme
        'neon-cyan': '#00f5ff',
        'neon-magenta': '#ff00ff',
        'neon-purple': '#bf00ff',
        'void': '#0a0a0f',

        // Circuit Board Theme
        'pcb-dark': '#0d1f14',
        'pcb-green': '#1a3d2a',
        'trace-teal': '#00c896',
        'trace-gold': '#c9a227',
        'led-green': '#00ff88',
        'led-red': '#ff3333',
        'solder': '#a0a0a0',
        'copper': '#b87333',

        // Holographic Theme
        'holo-black': '#0a0a12',
        'holo-blue': '#00d4ff',
        'holo-purple': '#9d00ff',
        'holo-pink': '#ff00aa',
      },

      // ==========================================
      // NEON GLOW BOX SHADOWS
      // ==========================================
      boxShadow: {
        // Neon Vapor
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.5), 0 0 40px rgba(0, 245, 255, 0.2)',
        'neon-cyan-sm': '0 0 8px rgba(0, 245, 255, 0.6)',
        'neon-magenta': '0 0 20px rgba(255, 0, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.2)',
        'neon-magenta-sm': '0 0 8px rgba(255, 0, 255, 0.6)',
        'neon-purple': '0 0 20px rgba(191, 0, 255, 0.5), 0 0 40px rgba(191, 0, 255, 0.2)',
        'inner-glow-cyan': 'inset 0 0 20px rgba(0, 245, 255, 0.1)',

        // Circuit Board
        'led-green': '0 0 4px #00ff88, 0 0 8px rgba(0, 255, 136, 0.5)',
        'led-amber': '0 0 4px #ffa500, 0 0 8px rgba(255, 165, 0, 0.5)',
        'trace': '0 0 2px #00c896',
        'copper-glow': '0 0 4px rgba(184, 115, 51, 0.6)',

        // Holographic
        'holo': '0 0 30px rgba(0, 212, 255, 0.3), 0 0 60px rgba(157, 0, 255, 0.2), 0 0 90px rgba(255, 0, 170, 0.1)',
        'holo-intense': '0 0 40px rgba(0, 212, 255, 0.5), 0 0 80px rgba(157, 0, 255, 0.3), 0 0 120px rgba(255, 0, 170, 0.2)',
      },

      // ==========================================
      // ANIMATIONS
      // ==========================================
      animation: {
        // Neon Vapor
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'border-flow': 'border-flow 3s linear infinite',

        // Circuit Board
        'led-blink': 'led-blink 1s ease-in-out infinite',
        'trace-flow': 'trace-flow 2s linear infinite',

        // Holographic
        'holo-rotate': 'holo-rotate 4s linear infinite',
        'holo-rotate-fast': 'holo-rotate 2s linear infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },

      // ==========================================
      // KEYFRAMES
      // ==========================================
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'led-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'trace-flow': {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        },
        'holo-rotate': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },

      // ==========================================
      // BACKDROP BLUR
      // ==========================================
      backdropBlur: {
        'glass': '12px',
        'glass-heavy': '20px',
      },
    },
  },
  plugins: [],
}
