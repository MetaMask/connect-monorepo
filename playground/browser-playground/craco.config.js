/* eslint-disable import-x/no-extraneous-dependencies -- Build tool */
/* eslint-disable n/no-extraneous-require -- Build tool */
/* eslint-disable require-unicode-regexp -- Webpack config */
/* eslint-disable n/no-process-env -- Build tool env */
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
        process: require.resolve('process/browser.js'),
      };

      // === ALIASES ===
      // Force bitcoinjs-lib to use its ESM build so webpack can statically analyse
      // named exports (the CJS build + "type":"module" causes interop issues in webpack 5).
      // In a yarn workspace the real node_modules lives at the monorepo root, so we must
      // also extend ModuleScopePlugin's allowedPaths to include it; otherwise CRA rejects
      // the resolved absolute path as "outside src/".
      const path = require('path');
      const bitcoinjsLibCjs = require.resolve('bitcoinjs-lib');
      const bitcoinjsLibEsm = bitcoinjsLibCjs.replace(
        'src/cjs/index.cjs',
        'src/esm/index.js',
      );
      const monorepoNodeModules = path.dirname(path.dirname(bitcoinjsLibCjs)); // …/node_modules

      const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.map(
        (plugin) => {
          if (plugin instanceof ModuleScopePlugin) {
            plugin.allowedPaths.push(monorepoNodeModules);
          }
          return plugin;
        },
      );

      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'bitcoinjs-lib': bitcoinjsLibEsm,
      };

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
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      // === PROVIDE PLUGINS ===
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
        }),
        new webpack.DefinePlugin({
          'process.env.INFURA_API_KEY': JSON.stringify(
            process.env.INFURA_API_KEY,
          ),
        }),
      );

      return webpackConfig;
    },
  },
};
