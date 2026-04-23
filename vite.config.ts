import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the repo at https://<user>.github.io/<repo>/ so
// every asset URL in the build needs the repo-name prefix. Omit this and
// the deployed page 404s on its own JS/CSS.
export default defineConfig({
  plugins: [react()],
  base: '/bow/',
});
