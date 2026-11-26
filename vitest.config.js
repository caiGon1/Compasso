import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs', 'tests/**/*.test.jsx'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}', 'server/{api,postgres,vercel-handler}.js', 'api/*.js'],
      exclude: ['src/main.jsx'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: { statements: 85, lines: 85, functions: 85, branches: 80 },
    },
  },
});
