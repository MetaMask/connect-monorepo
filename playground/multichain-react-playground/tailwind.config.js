/** @type {import('tailwindcss').Config} */
const path = require('path');

module.exports = {
  // Use absolute path to avoid monorepo root config/content bleeding into this package
  content: [path.join(__dirname, 'src/**/*.{js,jsx,ts,tsx}')],
  theme: {
    extend: {},
  },
  plugins: [],
};
