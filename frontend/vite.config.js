import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
  },

  build: {
    // Aumenta o limite do aviso de tamanho dos chunks (em KB)
    chunkSizeWarningLimit: 1000,

    // Separa bibliotecas grandes em arquivos independentes
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
