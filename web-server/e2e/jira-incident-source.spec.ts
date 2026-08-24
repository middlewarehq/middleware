/**
 * Jira issues as an incident source for Change Failure Rate / MTTR
 * (MID-8 -- see docs/JIRA_INTEGRATION_PROPOSAL.md).
 *
 * Same shape as jira-integration.spec.ts: skips without SUPERADMIN_PASSWORD,
 * runs against a real host/CI browser (see e2e/auth.spec.ts for why this
 * can't run inside the middleware-dev container), and is deliberately
 * non-destructive to whatever this org's actual setting already is --
 * every test restores it in an `afterEach` rather than leaving the org
 * opted in/out as a side effect of the test run.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/jira-incident-source.spec.ts
 */
import { expect, test } from '@playwright/test';

const APP = 'http://localhost:3333';
const INCIDENT_SOURCES_SETTING = 'INCIDENT_SOURCES_SETTING';
const JIRA_INCIDENT_ISSUE_TYPES_SETTING = 'JIRA_INCIDENT_ISSUE_TYPES_SETTING';
const JIRA_ISSUE_SOURCE = 'JIRA_ISSUE';

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

const gotoDoraMetrics = async (page: import('@playwright/test').Page) => {
  // Same "Getting app data" first-paint wait as jira-integration.spec.ts's
  // gotoIntegrations -- the post-login landing page has its own loading
  // state before any other page's content is safe to interact with.
  await expect(page.getByText('Getting app data')).toHaveCount(0, {
    timeout: 90_000
  });
  await page.goto(`${APP}/dora-metrics`);
  await page.getByRole('button', { name: /settings/i }).waitFor({
    timeout: 30_000
  });
};

const getOrgId = async (page: import('@playwright/test').Page) => {
  const session = await (await page.request.get(`${APP}/api/auth/session`)).json();
  return session?.org?.id as string | undefined;
};

const getSetting = async (
  page: import('@playwright/test').Page,
  orgId: string,
  settingType: string
) =>
  (
    await page.request.get(
      `${APP}/api/internal/${orgId}/settings?setting_type=${settingType}`
    )
  ).json();

test.describe('Jira incident source setting', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let orgId: string | undefined;
  let originalSources: string[] = [];
  let originalIssueTypes: string[] = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    orgId = await getOrgId(page);
    expect(orgId, 'signed-in session should resolve an org').toBeTruthy();

    const sources = await getSetting(page, orgId!, INCIDENT_SOURCES_SETTING);
    originalSources = sources.incident_sources || [];
    const types = await getSetting(
      page,
      orgId!,
      JIRA_INCIDENT_ISSUE_TYPES_SETTING
    );
    originalIssueTypes = types.issue_types || [];
  });

  test.afterEach(async ({ page }) => {
    if (!orgId) return;
    // Restore this org's real setting -- this test's whole point is
    // exercising the toggle, not leaving the environment's actual
    // configuration changed behind it.
    await page.request.put(`${APP}/api/internal/${orgId}/settings`, {
      data: {
        setting_type: INCIDENT_SOURCES_SETTING,
        setting_data: { incident_sources: originalSources }
      }
    });
    await page.request.put(`${APP}/api/internal/${orgId}/settings`, {
      data: {
        setting_type: JIRA_INCIDENT_ISSUE_TYPES_SETTING,
        setting_data: { issue_types: originalIssueTypes }
      }
    });
  });

  test('enabling the switch and adding an issue type persists both settings', async ({
    page
  }) => {
    await gotoDoraMetrics(page);

    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByRole('menuitem', { name: 'Configure Jira Incident Source' }).click();

    const dialog = page.getByRole('dialog');
    const switchInput = dialog.getByRole('checkbox');
    if (!(await switchInput.isChecked())) {
      await switchInput.click();
    }

    const issueTypeInput = dialog.getByPlaceholder(/e\.g\. bug, incident/i);
    await issueTypeInput.click();
    await issueTypeInput.fill('Bug');
    await page.keyboard.press('Enter');

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Updated Successfully')).toBeVisible({
      timeout: 10_000
    });

    const sources = await getSetting(page, orgId!, INCIDENT_SOURCES_SETTING);
    expect(sources.incident_sources).toContain(JIRA_ISSUE_SOURCE);

    const types = await getSetting(
      page,
      orgId!,
      JIRA_INCIDENT_ISSUE_TYPES_SETTING
    );
    expect(types.issue_types).toContain('Bug');
  });

  test('disabling the switch removes JIRA_ISSUE but keeps every other configured source', async ({
    page
  }) => {
    // Seed a known starting state: enabled, plus a source unrelated to
    // this ticket, so the test can assert the unrelated one survives.
    await page.request.put(`${APP}/api/internal/${orgId}/settings`, {
      data: {
        setting_type: INCIDENT_SOURCES_SETTING,
        setting_data: { incident_sources: ['GIT_REPO', JIRA_ISSUE_SOURCE] }
      }
    });

    await gotoDoraMetrics(page);
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByRole('menuitem', { name: 'Configure Jira Incident Source' }).click();

    const dialog = page.getByRole('dialog');
    const switchInput = dialog.getByRole('checkbox');
    await expect(switchInput).toBeChecked();
    await switchInput.click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Updated Successfully')).toBeVisible({
      timeout: 10_000
    });

    const sources = await getSetting(page, orgId!, INCIDENT_SOURCES_SETTING);
    expect(sources.incident_sources).not.toContain(JIRA_ISSUE_SOURCE);
    expect(sources.incident_sources).toContain('GIT_REPO');
  });
});
