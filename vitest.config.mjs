import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
  dir: './',
  include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  exclude: ['node_modules', 'dist', 'public', 'docs', 'Resources', 'supabase', 'scripts', 'db'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
  pool: 'threads',
  poolOptions: { threads: { singleThread: true } },
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
