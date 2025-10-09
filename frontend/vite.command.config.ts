import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-command',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/command-embed.tsx'),
      name: 'CommandInsightsEmbed',
      formats: ['iife'],
      fileName: () => 'command-insights-embed.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
