/* eslint-disable @typescript-eslint/explicit-function-return-type -- Tsup config convention */

import { defineConfig } from 'tsup';

import pkg from './package.json';

const deps = Object.keys((pkg as any).dependencies ?? {});
const peerDeps = Object.keys((pkg as any).peerDependencies ?? {});
const external = [...deps, ...peerDeps];
const entryName = (pkg as any).name.replace('@metamask/', '');

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
