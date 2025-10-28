import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  resolve: { mainFields: ['browser', 'module', 'main'] },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
  },
  build: {
    target: 'es2022',
    commonjsOptions: { transformMixedEsModules: true },
    outDir: './build',
    emptyOutDir: true, // also necessary
  },
  plugins: [react()],
  base: './',
});
