/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:  '#6c8aff',
        dark:     '#1a1f36',
        surface:  '#f4f6fb',
      },
    },
  },
  plugins: [],
}
