import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A setup file is executed before each test file.
    setupFiles: ['./src/tests/setup.ts'],
  },
});
