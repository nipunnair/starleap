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
                icons: [
                  { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                  { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
                ],
              },
            }),
          ]),
    ],
    // Classic (not 'es') format: `useAIWorker.ts` loads the worker via `?worker&inline`, which
    // base64-embeds it as a blob URL (needed for the singlefile build opened via `file://`).
    // Chromium silently fails to execute a *module*-type worker loaded from a blob URL when the
    // document has an opaque origin (which `file://` always does) — the worker is created but
    // its script body never runs, no error is raised anywhere. Classic workers aren't fetched as
    // modules and aren't subject to that restriction. The worker is fully self-contained after
    // bundling either way, so this has no effect on what code runs, only how it's wrapped.
    worker: {
      format: 'iife',
    },
    build: {
      target: 'es2022',
      outDir: singlefile ? 'dist-singlefile' : 'dist',
      assetsInlineLimit: singlefile ? Number.MAX_SAFE_INTEGER : 4096,
      cssCodeSplit: !singlefile,
    },
  };
});
