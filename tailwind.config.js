/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        kurdish: ['"Noto Kufi Arabic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#d4af37',
          dim: '#b8942e',
        },
        surface: {
          DEFAULT: '#0c0f14',
          card: '#141a23',
          elevated: '#1c2432',
          input: '#0f1419',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
