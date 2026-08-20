import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Nginx proxies the dev server; HMR must be reachable through the same origin.
    watch: { usePolling: true },
  },
  test: {
    // El carrito vive en LocalStorage (AD-06): sin DOM no se puede verificar
    // que la persistencia funcione de verdad.
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
