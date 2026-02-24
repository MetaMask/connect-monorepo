const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'shims', 'empty.js');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
  crypto: emptyModule,
  http: emptyModule,
  https: emptyModule,
  net: emptyModule,
  tls: emptyModule,
  zlib: emptyModule,
  os: emptyModule,
  dns: emptyModule,
  assert: emptyModule,
  url: emptyModule,
  path: emptyModule,
  fs: emptyModule,
};

module.exports = config;
