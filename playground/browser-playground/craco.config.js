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
      webpackConfig.resolve.conditionNames = [
        'browser',
        'import',
        'require',
        'default',
      ];

      // === NODE.JS POLYFILLS ===
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        process: require.resolve('process/browser.js'),
      };

      // === SUPPRESS SOURCE MAP WARNINGS ===
      // Ignore source map warnings from node_modules dependencies
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
      ];

      // === PROVIDE PLUGINS ===
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
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
