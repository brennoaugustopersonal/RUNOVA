import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Módulo virtual criado pelo VitePWA, ausente no pipeline de testes.
      'virtual:pwa-register': fileURLToPath(
        new URL('./src/tests/stubs/pwaRegister.ts', import.meta.url)
      ),
    },
  },
  test: {
    include: ['src/tests/**/*.test.{js,ts,tsx}'],
    globals: true,
    environment: 'node',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', 'src/types/**', 'src/vite-env.d.ts'],
    },
  },
});
