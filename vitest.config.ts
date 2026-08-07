import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    hookTimeout: 0,
    include: ['test/**/*.test.ts'],
    testTimeout: 0,
  },
});
