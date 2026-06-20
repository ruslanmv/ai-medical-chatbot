import { defineConfig } from 'vitest/config';
import path from 'path';

// Backend unit tests run in a plain Node environment — the RAG logic under
// test (fusion, vector math, FTS-match building, judge parsing) is pure and
// needs no DOM. Tests deliberately import only dependency-light modules so
// the suite never opens the SQLite native module or hits the network.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
