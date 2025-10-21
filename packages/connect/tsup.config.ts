import { defineConfig } from 'tsup';

// Dependencies that should remain external (not bundled)
const externalDeps = [
  '@react-native-async-storage/async-storage',
  'extension-port-stream',
  '@metamask/utils',
  'ws',
  'eventemitter3',
  'uuid',
  'cross-fetch',
  'bowser',
  'pako',
  'eciesjs',
  '@paulmillr/qr',
  '@metamask/mobile-wallet-protocol-core',
  '@metamask/mobile-wallet-protocol-dapp-client',
  '@metamask/multichain-api-client',
  '@metamask/onboarding'
];

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/multichain/index.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    bundle: true,
    // Only externalize the dependencies we want to keep external
    // This will bundle @metamask/multichain, @metamask/analytics, and @metamask/multichain-ui
    external: externalDeps,
    // Force bundling of workspace packages
    noExternal: ['@metamask/multichain', '@metamask/analytics', '@metamask/multichain-ui'],
    esbuildOptions: (options) => {
      options.metafile = true;
    },
  }
]);
