import { defineConfig, devices } from '@playwright/test'

/**
 * E2E sobre el build real (vite preview) con la API stubbeada por route
 * interception — no necesita backend corriendo ni red externa.
 * Local usa el Chrome instalado (channel), CI instala chromium.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['Desktop Chrome'],
    channel: process.env.CI ? undefined : 'chrome',
    // El service worker de la PWA NO debe interceptar los requests de los
    // tests: los stubs de route interception tienen que ver todo el tráfico.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
