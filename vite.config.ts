import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.RECAPTCHA_SITE_KEY': JSON.stringify(env.RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY),
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
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            'vendor-ui': ['lucide-react', 'sonner', 'motion'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          },
        },
      },
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
