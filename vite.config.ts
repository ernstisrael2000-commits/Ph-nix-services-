import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    optimizeDeps: {
      include: [
        'react', 'react-dom', 'react/jsx-runtime',
        'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage',
        'motion/react', 'sonner', 'clsx', 'tailwind-merge',
        'class-variance-authority',
      ],
      esbuildOptions: {
        sourcemap: false,
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase — split each sub-package so only what's used loads
            if (id.includes('node_modules/firebase/app') || id.includes('node_modules/@firebase/app')) {
              return 'vendor-firebase-app';
            }
            if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
              return 'vendor-firebase-auth';
            }
            if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/@firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }
            if (id.includes('node_modules/firebase/storage') || id.includes('node_modules/@firebase/storage')) {
              return 'vendor-firebase-storage';
            }
            if (id.includes('node_modules/firebase/messaging') || id.includes('node_modules/@firebase/messaging')) {
              return 'vendor-firebase-messaging';
            }
            // Heavy UI deps
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'vendor-motion';
            if (id.includes('node_modules/recharts')) return 'vendor-charts';
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) return 'vendor-pdf';
            if (id.includes('node_modules/sonner')) return 'vendor-sonner';
            // React core — always small, keep together
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
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
