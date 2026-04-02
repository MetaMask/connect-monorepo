/* eslint-disable @typescript-eslint/explicit-function-return-type -- Tsup config convention */
/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ and __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__ are esbuild define conventions */

import { defineConfig } from 'tsup';

import packageJson from './package.json';

const pkg: any = packageJson as any;

const deps = Object.keys(pkg.dependencies ?? {});
const peerDeps = Object.keys(pkg.peerDependencies ?? {});
const external = [...deps, ...peerDeps];
const entryName = pkg.name.replace('@metamask/', '');

const versionDefine = {
  __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__: JSON.stringify(
    pkg.peerDependencies?.['@metamask/connect-multichain'] ?? '',
  ),
};

export default defineConfig([
  // Browser ESM build
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/browser/es',
    format: 'esm',
    platform: 'browser',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    define: versionDefine,
    esbuildOptions: (options) => {
      options.platform = 'browser';
      options.mainFields = ['browser', 'module', 'main'];
      options.conditions = ['browser'];
      options.outExtension = { '.js': '.mjs' };
    },
    banner: {
      js: '/* Browser ES build */',
    },
  },
  // Node.js CJS build
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/node/cjs',
    format: 'cjs',
    platform: 'node',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    define: versionDefine,
    esbuildOptions: (options) => {
      options.platform = 'node';
      options.mainFields = ['module', 'main'];
      options.conditions = ['node'];
      options.outExtension = { '.js': '.js' };
    },
    banner: {
      js: '/* Node.js CJS build */',
    },
  },
  // Node.js ESM build
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/node/es',
    format: 'esm',
    platform: 'node',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    define: versionDefine,
    esbuildOptions: (options) => {
      options.platform = 'node';
      options.mainFields = ['module', 'main'];
      options.conditions = ['node'];
      options.outExtension = { '.js': '.mjs' };
    },
    banner: {
      js: '/* Node.js ES build */',
    },
  },
  // Type declarations
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/types',
    tsconfig: './tsconfig.types.json',
    dts: { only: true },
  },
]);
