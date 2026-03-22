import type { Config } from 'tailwindcss';

/** Design system "Rose Slate" — Beleza Pro */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E11D7A',
          hover: '#BE185D',
          light: '#FDF2F8',
          muted: '#FCE7F3',
        },
        sidebar: {
          bg: '#0F0F12',
          active: '#1A1A1F',
          border: 'rgba(255, 255, 255, 0.06)',
        },
        app: {
          bg: '#F8F8FB',
          surface: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E4E4E7',
          focus: '#E11D7A',
        },
        ink: {
          primary: '#0F0F12',
          secondary: '#71717A',
          muted: '#A1A1AA',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        /** compat: telas antigas usam background-light */
        'background-light': '#F8F8FB',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'header-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        metric: ['2rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'btn-primary': '0 1px 2px rgba(225, 29, 122, 0.12)',
        'btn-primary-lg': '0 1px 3px rgba(225, 29, 122, 0.18)',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
