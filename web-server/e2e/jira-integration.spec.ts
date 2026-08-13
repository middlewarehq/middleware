/**
 * Jira linking (Phase 1 -- see docs/JIRA_INTEGRATION_PROPOSAL.md).
 *
 * Deliberately does not exercise a full successful link: that needs a real
 * Jira Cloud site + API token, and this repo has no precedent for that kind
 * of dependency in E2E either -- there's no "link GitHub successfully" or
 * "link GitLab successfully" E2E test here, for the exact same reason (a
 * real PAT would be needed). ConfigureJiraModalBody's validation/success/
 * error logic is covered in isolation instead, by
 * src/content/Dashboards/__tests__/ConfigureJiraModalBody.test.tsx (Jest,
 * mocked network).
 *
 * This dev environment's org has a real, live-linked Jira integration
 * (checked directly against the DB while writing this) -- these tests are
 * deliberately non-destructive: nothing here unlinks it, since redoing that
 * link requires real credentials this test run doesn't have and can't
 * restore.
 *
 * Running (see e2e/auth.spec.ts for why this needs a real browser, and
 * therefore the host or CI rather than the middleware-dev container):
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/jira-integration.spec.ts
 */
import { expect, test } from '@playwright/test';

const APP = 'http://localhost:3333';

const SUPERADMIN = {
  email: process.env.SUPERADMIN_EMAIL || 'admin@clustox.com',
  password: process.env.SUPERADMIN_PASSWORD || ''
};

const signIn = async (page: import('@playwright/test').Page) => {
  await page.goto(`${APP}/login`);
  await page.fill('input[type="email"]', SUPERADMIN.email);
  await page.fill('input[type="password"]', SUPERADMIN.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 30_000 }),
    page.click('button[type="submit"]')
  ]);
};

const gotoIntegrations = async (page: import('@playwright/test').Page) => {
  // The sidebar is closed by default (SidebarContext's sidebarToggle starts
  // false) and the post-login landing page shows its own "Getting app
  // data" loading state first -- see integration-link-status.spec.ts for
  // both.
  await expect(page.getByText('Getting app data')).toHaveCount(0, {
    timeout: 90_000
  });
  await page.getByRole('navigation').click();
  await page
    .getByRole('link', { name: 'Manage Integrations', exact: true })
    .click();
  await page.waitForURL(/\/integrations$/, { timeout: 15_000 });
};

test('the Jira card reflects the real link status on first paint after login, without a refresh', async ({
  page
}) => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');
  test.setTimeout(180_000);

  await signIn(page);
  // gotoIntegrations waits out the post-login "Getting app data" loading
  // state first -- firing page.request calls before the page has settled
  // was observed to starve the (single-process, dev mode) Next server of
  // the request budget the page's own hydration needs, which can leave
  // /api/auth/session itself answering with no org yet.
  await gotoIntegrations(page);

  const session = await (await page.request.get(`${APP}/api/auth/session`)).json();
  const orgId = session?.org?.id;
  expect(orgId, 'signed-in session should resolve an org').toBeTruthy();

  const map = await (
    await page.request.get(
      `${APP}/api/integrations/integrations-map?org_id=${orgId}`
    )
  ).json();
  const trulyLinked = Boolean(map.jira);

  const jiraCard = page.getByTestId('jira-integration-card');
  if (trulyLinked) {
    await expect(jiraCard.getByText('Unlink', { exact: true })).toBeVisible({
      timeout: 5_000
    });
  } else {
    await expect(jiraCard.getByText('Link', { exact: true })).toBeVisible({
      timeout: 5_000
    });
  }
});

test('declining the unlink confirmation leaves a linked Jira integration untouched', async ({
  page
}) => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');
  test.setTimeout(180_000);

  await signIn(page);
  await gotoIntegrations(page);

  const session = await (await page.request.get(`${APP}/api/auth/session`)).json();
  const orgId = session?.org?.id;
  const before = await (
    await page.request.get(
      `${APP}/api/integrations/integrations-map?org_id=${orgId}`
    )
  ).json();
  test.skip(!before.jira, 'this environment has no Jira integration linked to protect');

  // Scoped to the Jira card specifically -- GitHub is also linked in this
  // environment, so an unscoped getByText('Unlink') would be ambiguous.
  const jiraCard = page.getByTestId('jira-integration-card');
  page.once('dialog', (dialog) => dialog.dismiss());
  await jiraCard.getByText('Unlink', { exact: true }).click();

  // Give the (declined) confirm a moment to resolve, then confirm nothing
  // changed -- no DELETE was ever sent.
  await page.waitForTimeout(500);
  const after = await (
    await page.request.get(
      `${APP}/api/integrations/integrations-map?org_id=${orgId}`
    )
  ).json();
  expect(after.jira).toBeTruthy();
  await expect(jiraCard.getByText('Unlink', { exact: true })).toBeVisible();
});
