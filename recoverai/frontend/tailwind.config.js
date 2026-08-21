/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — deep ocean blue (fintech trustworthy)
        primary: {
          50:  '#edf5ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1a6cf5',
          600: '#1558d6',
          700: '#1045b5',
          800: '#0d3490',
          900: '#0a2470',
          950: '#06154a',
        },
        // Accent — electric teal (action/CTA)
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        // Surface — dark navy background
        surface: {
          900: '#080e1e',
          800: '#0d1529',
          700: '#111e38',
          600: '#162847',
          500: '#1e3457',
        },
        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #080e1e 0%, #0d1529 50%, #0a2470 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(22,40,71,0.8) 0%, rgba(13,21,41,0.9) 100%)',
        'glow-teal': 'radial-gradient(circle at center, rgba(20,184,166,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-blue': '0 0 30px rgba(26,108,245,0.3)',
        'glow-teal': '0 0 20px rgba(20,184,166,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(26,108,245,0.2)',
      },
      animation: {
        'counter-up': 'counterUp 0.8s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        counterUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20,184,166,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(20,184,166,0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
