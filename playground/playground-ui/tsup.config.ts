import { defineConfig } from 'tsup';
import pkg from './package.json';

const deps = Object.keys((pkg as Record<string, unknown>).dependencies || {});
const peerDeps = Object.keys(
  (pkg as Record<string, unknown>).peerDependencies || {},
);
const external = [...deps, ...peerDeps];

export default defineConfig([
  // ESM build with inline types
  {
    entry: {
      'playground-ui': 'src/index.ts',
      constants: 'src/constants/index.ts',
      helpers: 'src/helpers/index.ts',
      types: 'src/types/index.ts',
      config: 'src/config/index.ts',
      testIds: 'src/testIds/index.ts',
    },
    outDir: 'dist/es',
    format: 'esm',
    platform: 'neutral',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    dts: {
      compilerOptions: {
        composite: false,
        incremental: false,
      },
    },
    external,
    esbuildOptions: (o) => {
      o.outExtension = { '.js': '.mjs' };
    },
  },
  // CJS build (no types needed, ESM build has them)
  {
    entry: {
      'playground-ui': 'src/index.ts',
      constants: 'src/constants/index.ts',
      helpers: 'src/helpers/index.ts',
      types: 'src/types/index.ts',
      config: 'src/config/index.ts',
      testIds: 'src/testIds/index.ts',
    },
    outDir: 'dist/cjs',
    format: 'cjs',
    platform: 'neutral',
    bundle: true,
    splitting: false,
    sourcemap: true,
    external,
    esbuildOptions: (o) => {
      o.outExtension = { '.js': '.cjs' };
    },
  },
]);
