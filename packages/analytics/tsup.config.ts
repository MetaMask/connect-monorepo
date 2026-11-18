import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    clean: true,
    sourcemap: true,
    tsconfig: './tsconfig.json',
  },
  {
    entry: ['src/index.ts'],
    dts: { only: true },
    tsconfig: './tsconfig.types.json',
  },
]);
