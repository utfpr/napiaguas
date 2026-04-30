/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-primary',
    'bg-primary-dark',
    'bg-primary-light',
    'text-primary',
    'text-primary-dark',
    'text-primary-light',
    'hover:bg-primary',
    'hover:bg-primary-dark',
    'hover:bg-primary/10',
    'hover:text-primary-dark',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0099CC',
          light: '#33B5E5',
          dark: '#006B8F',
        },
        secondary: {
          DEFAULT: '#00CC66',
          light: '#4DD599',
        },
        accent: '#FFD700',
        neutral: {
          50: '#F9FAFB',
          100: '#F5F5F5',
          200: '#E5E7EB',
          300: '#CCCCCC',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#333333',
        },
        vulnerability: {
          low: '#00CC66',
          medium: '#FFD700',
          high: '#FB8500',
          critical: '#D62828',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 2px 4px rgba(0, 153, 204, 0.1)',
        md: '0 2px 8px rgba(0, 153, 204, 0.15)',
        lg: '0 4px 16px rgba(0, 153, 204, 0.2)',
        xl: '0 8px 32px rgba(0, 153, 204, 0.25)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '300ms',
        slow: '500ms',
      },
    },
  },
  plugins: [],
}
