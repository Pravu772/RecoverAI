/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#1d4ed8',
          hover:   '#1e40af',
          light:   '#eff6ff',
        },
        surface: '#ffffff',
        border:  '#e2e8f0',
      },
      boxShadow: {
        'xs':  '0 1px 2px 0 rgba(0,0,0,0.05)',
        'card':'0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.05)',
      },
      fontSize: {
        '2xs': ['0.625rem', '0.875rem'],
        'xs':  ['0.6875rem', '1rem'],
        'sm':  ['0.8125rem', '1.25rem'],
        'base':['0.875rem', '1.5rem'],
      },
    },
  },
  plugins: [],
}
