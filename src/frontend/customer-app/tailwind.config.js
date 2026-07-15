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
        primary:     '#6c8aff',
        dark:        '#2a1448',
        surface:     '#f4f6fb',
        accent:      '#401f68',
        accentLight: '#c3aee0',
        pale:        '#f3effa',
      },
    },
  },
  plugins: [],
}
