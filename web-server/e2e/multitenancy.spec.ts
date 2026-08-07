/**
 * Cross-workspace isolation.
 *
 * This is the property the product promises: an admin owns one workspace and
 * cannot reach another's data. Everything here is request-level, so it runs
 * without a browser -- unlike the page tests in auth.spec.ts, which need
 * Chromium system libraries the dev image does not ship.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/multitenancy.spec.ts
 *
 * The suite provisions its own admins through the API and cleans them up, so
 * it does not depend on whatever happens to be in the database.
 */
import { APIRequestContext, expect, request, test } from '@playwright/test';

const APP = 'http://localhost:3333';
const API = 'http://localhost:9696';
const SYNC = 'http://localhost:9697';

const SUPERADMIN = {
  email: process.env.SUPERADMIN_EMAIL || 'admin@clustox.com',
  password: process.env.SUPERADMIN_PASSWORD || ''
};

/** A signed-in API context. next-auth needs the CSRF token from a prior GET. */
const signIn = async (email: string, password: string) => {
  const ctx = await request.newContext({ baseURL: APP });

  const csrf = await (await ctx.get('/api/auth/csrf')).json();
  const res = await ctx.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf.csrfToken, email, password, json: 'true' },
    failOnStatusCode: false
  });
  expect(res.status(), `sign-in failed for ${email}`).toBe(200);

  return ctx;
};

const unique = (prefix: string) =>
  `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@clustox.com`;

/** Provision an admin with their own fresh workspace. */
const createAdmin = async (su: APIRequestContext, name: string) => {
  const email = unique(name.toLowerCase().replace(/\s+/g, '.'));
  const password = 'E2eWorkspacePass123';

  const res = await su.post('/api/clustox/users', {
    data: { name, email, password, role: 'ADMIN', team_ids: [] }
  });
  expect(res.status()).toBe(200);
  const { user_id, org_id } = await res.json();

  return { userId: user_id, orgId: org_id as string, email, password };
};

/**
 * Remove accounts the suite created, and their workspaces with them.
 *
 * Without this every run left behind an admin and a workspace, which
 * accumulated until the superadmin's cross-workspace view was unreadable.
 */
const deleteUsers = async (su: APIRequestContext, userIds: string[]) => {
  for (const id of userIds) {
    await su.fetch(`/api/clustox/users/${id}`, {
      method: 'DELETE',
      failOnStatusCode: false
    });
  }
};

test.describe('cross-workspace isolation', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let su: APIRequestContext;
  let alpha: Awaited<ReturnType<typeof createAdmin>>;
  let beta: Awaited<ReturnType<typeof createAdmin>>;
  let alphaCtx: APIRequestContext;

  test.beforeAll(async () => {
    su = await signIn(SUPERADMIN.email, SUPERADMIN.password);
    alpha = await createAdmin(su, 'E2e Alpha');
    beta = await createAdmin(su, 'E2e Beta');
    alphaCtx = await signIn(alpha.email, alpha.password);
  });

  test.afterAll(async () => {
    await deleteUsers(su, [alpha.userId, beta.userId]);
  });

  test('each admin is given a distinct workspace', async () => {
    expect(alpha.orgId).toBeTruthy();
    expect(beta.orgId).toBeTruthy();
    expect(alpha.orgId).not.toBe(beta.orgId);
  });

  test('an admin sees only their own workspace', async () => {
    const res = await alphaCtx.get('/api/clustox/workspace-status');
    expect(res.status()).toBe(200);

    const workspaces = await res.json();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe(alpha.orgId);
  });

  test('an admin cannot read another workspace integration', async () => {
    const res = await alphaCtx.get(
      `/api/resources/orgs/${beta.orgId}/integration`,
      { failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot write an integration into another workspace', async () => {
    const res = await alphaCtx.post(
      `/api/resources/orgs/${beta.orgId}/integration`,
      {
        data: {
          provider: 'github',
          the_good_stuff: 'not-a-real-token',
          meta_data: {}
        },
        failOnStatusCode: false
      }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot create a team in another workspace', async () => {
    const res = await alphaCtx.post(
      `/api/resources/orgs/${beta.orgId}/teams/v2`,
      { data: { name: 'Intruder', org_repos: {} }, failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin can create a team in their own workspace', async () => {
    const res = await alphaCtx.post(
      `/api/resources/orgs/${alpha.orgId}/teams/v2`,
      { data: { name: 'Alpha Squad', org_repos: {} }, failOnStatusCode: false }
    );
    expect(res.status()).toBe(200);
  });

  test('an admin cannot delete another workspace team by supplying their own org_id', async () => {
    // The subtle case: the path carries a workspace they DO own, while the
    // body names a team they do not. Central scoping keys on org_id, so this
    // is only caught by an explicit team check.
    const betaCtx = await signIn(beta.email, beta.password);
    const created = await betaCtx.post(
      `/api/resources/orgs/${beta.orgId}/teams/v2`,
      { data: { name: 'Beta Only', org_repos: {} } }
    );
    expect(created.status()).toBe(200);
    const betaTeamId = (await created.json()).team.id;

    const res = await alphaCtx.fetch(
      `/api/resources/orgs/${alpha.orgId}/teams/v2`,
      { method: 'DELETE', data: { id: betaTeamId }, failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);

    // and the team survived
    const stillThere = await betaCtx.get(
      `/api/resources/orgs/${beta.orgId}/teams/v2`
    );
    const names = (await stillThere.json()).teams.map((t: any) => t.name);
    expect(names).toContain('Beta Only');
  });

  test('an admin cannot manage users', async () => {
    const res = await alphaCtx.get('/api/clustox/users', {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('an admin cannot force a sync across all workspaces', async () => {
    const res = await alphaCtx.post('/api/clustox/sync-now', {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('a superadmin sees every workspace', async () => {
    const res = await su.get('/api/clustox/workspace-status');
    const ids = (await res.json()).map((w: any) => w.id);
    expect(ids).toEqual(expect.arrayContaining([alpha.orgId, beta.orgId]));
  });
});

test.describe('backend reachability', () => {
  test('the analytics API refuses requests without the internal token', async ({
    request: req
  }) => {
    const res = await req.get(`${API}/teams/any-id/lead_time`, {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('the sync API refuses requests without the internal token', async ({
    request: req
  }) => {
    const res = await req.post(`${SYNC}/sync`, { failOnStatusCode: false });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated BFF requests are rejected', async ({ request: req }) => {
    const res = await req.get(`${APP}/api/clustox/users`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expect(res.status()).toBe(401);
  });
});
