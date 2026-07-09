import { defineConfig } from 'vitest/config'

// Unit tests de lógica pura (lib/): sin DOM, corren en node.
// Los flujos de UI se cubren en e2e/ con Playwright + API stubbeada.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
