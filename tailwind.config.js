/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        sidebar: '#16162a',
        primary: '#6366f1',
        accent: '#8b5cf6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
        },
        border: '#2d2d4a',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
      },
      boxShadow: {
        panel: '0 10px 40px -20px rgba(0,0,0,0.35)',
      },
      screens: {
        tablet: '768px',
        desktop: '1200px',
      },
    },
  },
  plugins: [],
}
