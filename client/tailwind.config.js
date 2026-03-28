/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '.app-dark'],
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-primeui')],
}
