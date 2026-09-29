import { defineConfig } from 'vitest/config';

// Domain code is pure and runs in node; the repository tests bring their own
// IndexedDB (fake-indexeddb). Components are not unit-tested, by design.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
