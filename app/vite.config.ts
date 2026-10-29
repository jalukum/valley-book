import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + hash routing so the static build works from any path (local server or GitHub Pages subpath).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900, assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['src/**/*.test.ts'], css: { include: [/styles\.css/] } },
} as any);
