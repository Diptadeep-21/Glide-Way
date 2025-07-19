import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow access from localhost and network
    open: true, // Automatically open browser on start
    hmr: {
      protocol: 'ws', // Explicitly use WebSocket for HMR
      host: 'localhost',
      port: 3000,
      clientPort: 3000, // Ensure client uses correct port
      timeout: 10000, // Increase timeout for slow connections
    },
    cors: true, // Enable CORS for API requests
  },
  build: {
    outDir: 'dist', // Ensure build output is consistent
    assetsDir: 'assets', // Store assets in dist/assets
  },
  resolve: {
    alias: {
      '@': '/src', // Simplify imports (e.g., '@/components')
    },
  },
});