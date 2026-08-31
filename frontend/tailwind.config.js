/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        classA: {
          DEFAULT: '#2F6FED',
          light: '#EBF2FE',
          dark: '#1D4ED8',
          border: '#93C5FD'
        },
        classB: {
          DEFAULT: '#E28A2B',
          light: '#FEF6ED',
          dark: '#B45309',
          border: '#FCD34D'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
