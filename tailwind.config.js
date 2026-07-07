/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Chakra UI already provides a CSS reset + base styles for the rest of the
  // app. We disable Tailwind's preflight so introducing Tailwind for the
  // Garden redesign doesn't change the look of any other (Chakra-based) page.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        display: ['Baloo 2', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        garden: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#0b3320',
        },
        soil: {
          200: '#e8dfc0',
          400: '#a08060',
          600: '#8b7355',
          800: '#4e2e18',
          900: '#3d2010',
        },
        gold: {
          100: '#fef3c7',
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        berry: {
          400: '#f472b6',
          500: '#ec4899',
        },
        sky: {
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(20,83,45,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
        'glass-lg': '0 20px 60px rgba(20,83,45,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
        'panel': '0 2px 10px rgba(20,83,45,0.06)',
        'glow-gold': '0 0 24px rgba(251,191,36,0.45)',
        'glow-red': '0 0 24px rgba(239,68,68,0.45)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
