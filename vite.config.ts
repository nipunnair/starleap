import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build modes from one source tree:
//   `vite build`                 -> dist/ (multi-file, PWA-enabled)
//   `vite build --mode singlefile` -> starleap.html (inlined, no PWA/service worker)
export default defineConfig(({ mode }) => {
  const singlefile = mode === 'singlefile';

  return {
    plugins: [
      react(),
      ...(singlefile
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.svg'],
              manifest: {
                name: 'STARLEAP',
                short_name: 'STARLEAP',
                description: 'A browser-based Chinese Checkers variant with chained long-jumps.',
                theme_color: '#0b1020',
                background_color: '#0b1020',
                display: 'standalone',
                icons: [],
              },
            }),
          ]),
    ],
    worker: {
      format: 'es',
    },
    build: {
      target: 'es2022',
      outDir: singlefile ? 'dist-singlefile' : 'dist',
      assetsInlineLimit: singlefile ? Number.MAX_SAFE_INTEGER : 4096,
      cssCodeSplit: !singlefile,
    },
  };
});
