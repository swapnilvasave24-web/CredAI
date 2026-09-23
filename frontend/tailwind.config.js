/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4338ca' },
        surface: {
          DEFAULT: '#0f172a',  // slate-950
          card:    '#1e293b',  // slate-800
          hover:   '#334155',  // slate-700
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':   'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      },
      animation: {
        'fade-up':    'fadeSlideUp 0.35s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      boxShadow: {
        'glow-indigo': '0 0 40px 0 rgba(99,102,241,0.2)',
        'glow-emerald': '0 0 30px 0 rgba(52,211,153,0.15)',
        'glow-rose':    '0 0 30px 0 rgba(251,113,133,0.18)',
      },
    }
  },
  plugins: []
}
