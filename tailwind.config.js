/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'reading': ['Crimson Pro', 'serif'],
        'ui': ['Inter', 'sans-serif'],
      },
      colors: {
        'parchment': '#f7f3e9',
        'cream': '#faf8f3',
        'warm-white': '#fefcf7',
        'sepia-light': '#f5f1e8',
        'sepia': '#e8dcc0',
        'charcoal': '#2c2c2c',
        'ink': '#1a1a1a',
        'burgundy': '#8b2635',
        'burgundy-light': '#a53545',
        'forest': '#2d5016',
        'forest-light': '#3d6b1f',
        'antique-gold': '#d4af37',
        'antique-gold-light': '#e6c547',
        'leather': '#8b4513',
        'aged-paper': '#f0ead6',
      },
      backgroundImage: {
        'literary-gradient': 'linear-gradient(135deg, #f7f3e9 0%, #f5f1e8 50%, #f0ead6 100%)',
        'literary-dark': 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
      },
    },
  },
  plugins: [],
};
