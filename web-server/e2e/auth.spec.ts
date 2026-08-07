/**
 * Auth and access-control end-to-end coverage.
 *
 * Running these:
 *
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/auth.spec.ts
 *
 * The four request-level tests (401/403/health) need no browser and run
 * anywhere. The three page-level tests need Chromium plus its system
 * libraries, which the middleware-dev image does not ship -- `playwright
 * install --with-deps` fails on this Debian base. Run those from the host or
 * from CI, where browser dependencies are available. The behaviours they
 * cover were each verified manually against a real browser when written.
 */
import { expect, test } from '@playwright/test';

// URLs are absolute on purpose: upstream's playwright.config.ts sets no
// baseURL, and adding one would mean touching another upstream file for no
// functional gain.
const APP = 'http://localhost:3333';
const API = 'http://localhost:9696';
const SYNC = 'http://localhost:9697';

const SUPERADMIN = {
  email: process.env.SUPERADMIN_EMAIL || 'admin@clustox.com',
  password: process.env.SUPERADMIN_PASSWORD || ''
};

const signIn = async (page: any, email: string, password: string) => {
  await page.goto(`${APP}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/login'), {
    timeout: 30_000
  });
};

test('unauthenticated visitors are redirected to login', async ({ page }) => {
  await page.goto(`${APP}/dora-metrics`);
  await expect(page).toHaveURL(/\/login/);
});

test('bad credentials are rejected without revealing which field was wrong', async ({
  page
}) => {
  await page.goto(`${APP}/login`);
  await page.fill('input[type="email"]', 'nobody@clustox.com');
  await page.fill('input[type="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
});

test('unauthenticated API requests return 401, not a redirect', async ({
  request
}) => {
  const res = await request.get(`${APP}/api/clustox/users`, {
    failOnStatusCode: false,
    maxRedirects: 0
  });
  expect(res.status()).toBe(401);
});

test('the analytics API refuses direct requests without the internal token', async ({
  request
}) => {
  const res = await request.get(`${API}/teams/any-id/lead_time`, {
    failOnStatusCode: false
  });
  expect(res.status()).toBe(403);
});

test('the sync API refuses direct requests without the internal token', async ({
  request
}) => {
  const res = await request.post(`${SYNC}/sync`, { failOnStatusCode: false });
  expect(res.status()).toBe(403);
});

test('health endpoints stay reachable so probes keep working', async ({
  request
}) => {
  expect((await request.get(`${API}/`, { failOnStatusCode: false })).status()).toBe(200);
  expect((await request.get(`${SYNC}/`, { failOnStatusCode: false })).status()).toBe(200);
});

test('superadmin can sign in and reach user management', async ({ page }) => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  await signIn(page, SUPERADMIN.email, SUPERADMIN.password);
  await page.goto(`${APP}/users`);
  await expect(page.getByText('Not authorised')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
});
