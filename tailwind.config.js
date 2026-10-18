/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        swiss: {
          orange: '#FF4F00',
          orangeDark: '#E04500',
          orangeLight: '#FFF2EB',
          orangeGlow: 'rgba(255, 79, 0, 0.12)',
          dark: '#0A0A0C',
          darkMuted: '#1A1B22',
          surface: '#FBFBFB',
          panel: '#FFFFFF',
          border: '#EAEAEA',
          gridline: 'rgba(255, 79, 0, 0.22)',
          subtle: '#6E7381',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        widest: '0.15em',
      },
    },
  },
  plugins: [],
};
