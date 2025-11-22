/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      animation: {
        'bounce-delay-100': 'bounce-delay-100 1.4s infinite ease-in-out both',
        'bounce-delay-200': 'bounce-delay-100 1.4s infinite ease-in-out both 0.2s',
      },
    },
  },
  plugins: [],
}