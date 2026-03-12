/* eslint-disable @typescript-eslint/explicit-function-return-type -- Tsup config convention */
/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ is an esbuild define convention */

import { defineConfig } from 'tsup';

import packageJson from './package.json';

const pkg: any = packageJson as any;

const deps = Object.keys(pkg.dependencies ?? {});
const peerDeps = Object.keys(pkg.peerDependencies ?? {});
const external = [...deps, ...peerDeps];
const entryName = pkg.name.replace('@metamask/', '');

export default defineConfig([
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
    define: {
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
    esbuildOptions: (options) => {
      options.platform = 'browser';
      options.mainFields = ['browser', 'module', 'main'];
      options.conditions = ['browser'];
      options.outExtension = { '.js': '.mjs' };
    },
  },
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/types',
    tsconfig: './tsconfig.types.json',
    dts: { only: true },
  },
]);
