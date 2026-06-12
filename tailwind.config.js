/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        fadeSlideIn: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideOut: {
          '0%':   { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-16px)' },
        },
        popIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)'  },
        },
      },
      animation: {
        'fade-slide-in':  'fadeSlideIn 0.35s ease forwards',
        'fade-slide-out': 'fadeSlideOut 0.25s ease forwards',
        'pop-in':         'popIn 0.3s ease forwards',
        'shimmer':        'shimmer 1.6s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};

