import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.js'],
    globals: true,
    environment: 'node',
    setupFiles: [],
  },
});
