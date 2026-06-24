import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/vla': {
        target: 'http://47.108.78.62:8764',
        changeOrigin: true,
      },
    },
  },
});


