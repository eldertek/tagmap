/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#2b6451',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      spacing: {
        '80': '20rem',
        '96': '24rem',
      },
      maxHeight: {
        '0': '0',
        xl: '36rem',
      },
      minHeight: {
        '0': '0',
        xl: '36rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      boxShadow: {
        xs: '0 0 0 1px rgba(0, 0, 0, 0.05)',
        subtle: '0 0 0 1px rgba(0, 0, 0, 0.05)',
      },
      borderColor: theme => ({
        DEFAULT: theme('colors.gray.200', 'currentColor'),
      }),
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 