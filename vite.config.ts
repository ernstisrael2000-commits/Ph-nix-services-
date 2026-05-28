import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.RECAPTCHA_SITE_KEY': JSON.stringify(env.RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY),
      'process.env.FIREBASE_VAPID_KEY': JSON.stringify(env.FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
            'vendor-ui': ['lucide-react', 'sonner', 'motion'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          },
        },
      },
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
    },
    server: {
      hmr: process.env.REPLIT_DEV_DOMAIN
        ? {
            clientPort: 443,
            protocol: 'wss',
            host: process.env.REPLIT_DEV_DOMAIN,
          }
        : true,
      host: '0.0.0.0',
      allowedHosts: true,
      watch: {
        ignored: ['**/.local/**', '**/.cache/**', '**/node_modules/**', '**/dist/**'],
      },
    },
  };
});
