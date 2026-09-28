import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Compila la escena como un único archivo IIFE que el sitio estático carga con <script>.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '../js',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.jsx',
      name: 'DelorrioScene',
      formats: ['iife'],
      fileName: () => 'scene.bundle.js',
    },
    minify: 'esbuild',
    sourcemap: false,
  },
});
