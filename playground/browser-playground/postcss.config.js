const path = require('path');

module.exports = {
  plugins: {
    // Explicitly set config to ensure Tailwind uses this package's local config instead of a parent monorepo config
    '@tailwindcss/postcss': {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
