import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',

  server: {
    port: 5173,
  },

  build: {
    outDir: 'dist_FINAL_AGORA', // <-- COLOCA ESSA LINHA
    emptyOutDir: true,          // <-- E ESSA
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          solana: [
            '@solana/web3.js',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-wallets',
          ],
        },
      },
    },
  },
});
