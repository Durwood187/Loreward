import { defineConfig } from 'vitest/config';

// Matcher tests run in plain Node. Adapter tests opt into a browser-like DOM
// with a `// @vitest-environment jsdom` comment at the top of the file.
export default defineConfig({
  test: { globals: true, include: ['tests/**/*.test.ts'] },
});
