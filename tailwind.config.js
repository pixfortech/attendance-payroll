/**
 * Tailwind is themed against the Ganguram design tokens. The CSS custom
 * properties in src/styles/tokens/*.css remain the single source of truth;
 * these utilities simply resolve to the same values for layout/glue code.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#f1f1f8',
          100: '#e4e3f1',
          200: '#c8c7e3',
          300: '#a5a4cf',
          400: '#7e7cb5',
          500: '#5d5ca0',
          600: '#49488d',
          700: '#3d3c76',
          800: '#312f5e',
          900: '#26254a',
          950: '#16162c',
        },
        coral: {
          50: '#fef1f1',
          100: '#fde3e3',
          200: '#fbc9c9',
          300: '#f7a3a3',
          400: '#f17676',
          500: '#ea5454',
          600: '#d63b3b',
          700: '#b42c2c',
          800: '#952929',
          900: '#7c2727',
        },
        neutral: {
          0: '#ffffff',
          50: '#f8f8fb',
          100: '#f1f1f6',
          200: '#e6e6ee',
          300: '#d4d4e0',
          400: '#a9a9bd',
          500: '#7b7b91',
          600: '#585869',
          700: '#42424f',
          800: '#2c2c36',
          900: '#1a1a22',
        },
        brand: {
          primary: '#49488d',
          accent: '#ea5454',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(38, 37, 74, 0.06)',
        sm: '0 1px 2px rgba(38, 37, 74, 0.06), 0 2px 4px rgba(38, 37, 74, 0.05)',
        md: '0 2px 4px rgba(38, 37, 74, 0.05), 0 6px 16px rgba(38, 37, 74, 0.08)',
        lg: '0 4px 8px rgba(38, 37, 74, 0.06), 0 16px 32px rgba(38, 37, 74, 0.12)',
        xl: '0 8px 16px rgba(38, 37, 74, 0.08), 0 28px 56px rgba(38, 37, 74, 0.16)',
        brand: '0 6px 18px rgba(73, 72, 141, 0.32)',
      },
      maxWidth: {
        content: '1320px',
      },
    },
  },
  plugins: [],
};
