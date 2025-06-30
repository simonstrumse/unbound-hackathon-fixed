/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        'paper': '#FAFAF8',
        'ink': '#1A1A1A',
        'typewriter-red': '#E53E3E',
        'typewriter-blue': '#2B6CB0',
        'light-gray': '#E5E5E5',
        'medium-gray': '#D4D4D4',
        'dark-gray': '#666666',
      },
    },
  },
  plugins: [],
};
