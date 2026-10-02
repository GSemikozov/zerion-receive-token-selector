import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // Not VITE_-prefixed on purpose: the key stays on the dev server and never reaches the bundle.
  const { ZERION_API_KEY } = loadEnv(mode, import.meta.dirname, '');
  // Only the dev/preview proxy needs it; in production (Netlify) an edge function adds the key.
  if (!ZERION_API_KEY && command === 'serve' && mode !== 'test') {
    console.warn('ZERION_API_KEY is not set — copy .env.example to .env.local');
  }

  const zerionProxy: Record<string, ProxyOptions> = {
    '/api/zerion': {
      target: 'https://api.zerion.io',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/zerion/, ''),
      headers: {
        Authorization: `Basic ${Buffer.from(`${ZERION_API_KEY ?? ''}:`).toString('base64')}`,
      },
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: zerionProxy,
    },
    preview: {
      proxy: zerionProxy,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: false,
    },
  };
});
