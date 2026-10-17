import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: base path is set via BASE_PATH env var at build time.
// Default '/' works for local dev; Pages builds pass BASE_PATH=/repo-name/.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
});