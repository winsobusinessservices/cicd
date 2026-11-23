/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        cream: {
          50: '#FFFDF7',
          100: '#FAF7EE',
          200: '#F5EFE0',
        },
        neo: {
          yellow: '#FACC15',
          'yellow-light': '#FDE047',
          blue: '#38BDF8',
          'blue-light': '#BAE6FD',
          purple: '#A855F7',
          'purple-light': '#E9D5FF',
          pink: '#FB7185',
          'pink-light': '#FFE4E6',
          green: '#22C55E',
          'green-light': '#DCFCE7',
          red: '#EF4444',
          'red-light': '#FEE2E2',
          black: '#000000',
          dark: '#0C0D12',
        }
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #000000',
        'neo': '3px 3px 0px #000000',
        'neo-md': '4px 4px 0px #000000',
        'neo-lg': '6px 6px 0px #000000',
        'neo-xl': '8px 8px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
