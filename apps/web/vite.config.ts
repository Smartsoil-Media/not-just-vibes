import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Heavy editor/sandbox libs go into their own chunks so the
    // initial paint (topbar, login-ish empty state) loads quickly.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/monaco-editor/') || id.includes('@monaco-editor/')) {
            return 'monaco';
          }
          if (id.includes('/shiki/') || id.includes('@shikijs/')) return 'shiki';
          if (id.includes('@codesandbox/')) return 'sandpack';
          if (id.includes('@xyflow/')) return 'flow';
          if (
            id.includes('react-markdown') ||
            id.includes('/remark') ||
            id.includes('/micromark') ||
            id.includes('/mdast') ||
            id.includes('/hast') ||
            id.includes('/unified') ||
            id.includes('/vfile')
          ) {
            return 'markdown';
          }
          if (id.includes('@radix-ui/')) return 'radix';
          return undefined;
        },
      },
    },
    // Sandpack alone is ~975 KB (bundler + CodeMirror) and is lazy-loaded;
    // raise the warning so CI logs don't shout about a chunk we can't shrink.
    chunkSizeWarningLimit: 1100,
  },
});
