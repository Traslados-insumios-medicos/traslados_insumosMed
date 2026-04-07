/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a5f',
        'primary-hover': '#162d4a',
        accent: '#e8a020',
        surface: '#ffffff',
        bg: '#f4f6f9',
        border: '#e2e8f0',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
        nav: '0 1px 0 0 #e2e8f0',
      },
    },
  },
  plugins: [],
}
