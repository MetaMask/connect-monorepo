require('dotenv').config();
const webpack = require('webpack');

module.exports = {
  style: {
    postcss: {
      mode: 'file',
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Control export conditions (for packages with conditional exports)
      // Put 'require' before 'import' to prefer CommonJS for better compatibility
      webpackConfig.resolve.conditionNames = [
        'browser',
        'require',
        'import',
        'default',
      ];

      // === NODE.JS POLYFILLS ===
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser.js'),
      };

      // === ALIASES ===
      // No aliases needed - using resolutions in package.json instead

      // === MODULE RULES ===
      // Handle ESM modules from node_modules that have issues
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // === SUPPRESS SOURCE MAP WARNINGS ===
      // Ignore source map warnings from node_modules dependencies
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
      ];

      // === PROVIDE PLUGINS ===
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        }),
        new webpack.DefinePlugin({
          'process.env.INFURA_API_KEY': JSON.stringify(process.env.INFURA_API_KEY),
        }),
      );

      return webpackConfig;
    },
  },
};
