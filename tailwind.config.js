/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2FB', 100: '#D6DEF4', 200: '#AEBEE9', 300: '#7B90CE', 400: '#4C63A8',
          500: '#2C3F7C', 600: '#1C2C5E', 700: '#141F47', 800: '#0E1633', 900: '#0A1024', 950: '#060A18',
        },
        electric: {
          50: '#EFF5FF', 100: '#DBE8FE', 200: '#BFD6FE', 300: '#93BBFD', 400: '#6096FA',
          500: '#3B76F6', 600: '#2563EB', 700: '#1D4FD8', 800: '#1E42AF', 900: '#1E3A8A',
        },
        violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
        mist: '#F5F7FD',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      fontSize: {
        'display-sm': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['4.25rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
      },
      borderRadius: { card: '1.25rem', panel: '1.75rem' },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(10,16,36,.06), 0 12px 32px -12px rgba(10,16,36,.12)',
        lift: '0 8px 24px -8px rgba(10,16,36,.16), 0 24px 56px -24px rgba(28,44,94,.28)',
        glow: '0 18px 48px -18px rgba(37,99,235,.55)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg,#0A1024 0%,#1C2C5E 45%,#6D28D9 100%)',
        'action-gradient': 'linear-gradient(120deg,#2563EB 0%,#7C3AED 100%)',
        grid: 'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)',
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '50%': { transform: 'translate3d(2rem,-1.5rem,0) scale(1.08)' } },
      },
      animation: { drift: 'drift 18s ease-in-out infinite' },
    },
  },
  plugins: [],
};
