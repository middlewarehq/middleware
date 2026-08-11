/**
 * Cross-workspace isolation for the per-team DORA benchmark endpoints.
 *
 * Two endpoints are under test:
 *   - the settings routes, reused for benchmarks via setting_type=BENCHMARK_SETTING:
 *       GET/PUT /api/internal/team/{team_id}/settings
 *     workspace-scoped by Endpoint.serve() asserting team access whenever the
 *     payload carries a team_id (here, taken from the URL path).
 *   - the global baseline:
 *       GET/PUT /api/clustox/benchmarks/global
 *     GET is open to any authenticated admin (the four numbers already appear
 *     on every team's own dashboard as target lines); PUT is SUPERADMIN-only,
 *     because one superadmin's numbers become every unset team's targets.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && SUPERADMIN_PASSWORD='<value>' yarn playwright test e2e/benchmarks.spec.ts
 *
 * The suite provisions its own admins through the API and cleans them up, so
 * it does not depend on whatever happens to be in the database.
 */
import { APIRequestContext, expect, request, test } from '@playwright/test';

const APP = 'http://localhost:3333';

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
  const password = 'E2eBenchmarksPass123';

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

// CLUSTOX: yup.string().uuid() enforces the RFC-4122 version/variant nibbles,
// so an all-zero placeholder like ...-000000000001 is rejected at schema
// validation -- a test using it would get a 400 while asserting 403, passing
// for the wrong reason. This value is v4/variant-8 shaped but not a real row.
// It must NOT be GLOBAL_BENCHMARK_ENTITY_ID (...-000000000001), which is the
// real global baseline row -- using that as a "nonexistent team" would be
// reasoning about live data.
const FOREIGN_TEAM_ID = '00000000-0000-4000-8000-0000000000ff';

const BENCHMARK_PAYLOAD = {
  lead_time: 24,
  deployment_frequency: 3,
  change_failure_rate: 10,
  mean_time_to_recovery: 12
};

test.describe('benchmarks workspace isolation', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let su: APIRequestContext;
  let alpha: Awaited<ReturnType<typeof createAdmin>>;
  let beta: Awaited<ReturnType<typeof createAdmin>>;
  let alphaCtx: APIRequestContext;
  let betaCtx: APIRequestContext;
  let betaTeamId: string;

  test.beforeAll(async () => {
    su = await signIn(SUPERADMIN.email, SUPERADMIN.password);
    alpha = await createAdmin(su, 'E2e Bench Alpha');
    beta = await createAdmin(su, 'E2e Bench Beta');
    alphaCtx = await signIn(alpha.email, alpha.password);
    betaCtx = await signIn(beta.email, beta.password);

    const created = await betaCtx.post(
      `/api/resources/orgs/${beta.orgId}/teams/v2`,
      { data: { name: 'Bench Beta Team', org_repos: {} } }
    );
    expect(created.status()).toBe(200);
    betaTeamId = (await created.json()).team.id;
  });

  test.afterAll(async () => {
    await deleteUsers(su, [alpha.userId, beta.userId]);
  });

  test('an admin cannot read another workspace team benchmark', async () => {
    const res = await alphaCtx.get(
      `/api/internal/team/${betaTeamId}/settings`,
      {
        params: { setting_type: 'BENCHMARK_SETTING' },
        failOnStatusCode: false
      }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot write another workspace team benchmark', async () => {
    const res = await alphaCtx.fetch(
      `/api/internal/team/${betaTeamId}/settings`,
      {
        method: 'PUT',
        data: {
          setting_type: 'BENCHMARK_SETTING',
          setting_data: BENCHMARK_PAYLOAD
        },
        failOnStatusCode: false
      }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot read a nonexistent/foreign team benchmark either', async () => {
    // CLUSTOX: same 403, via a placeholder id rather than a real foreign
    // team -- covers the case where the id does not resolve to any team in
    // the caller's own workspace, not just a team that visibly belongs to
    // someone else.
    const res = await alphaCtx.get(
      `/api/internal/team/${FOREIGN_TEAM_ID}/settings`,
      {
        params: { setting_type: 'BENCHMARK_SETTING' },
        failOnStatusCode: false
      }
    );
    expect(res.status()).toBe(403);
  });

  test('a non-superadmin PUT to the global baseline is forbidden', async () => {
    const res = await alphaCtx.fetch('/api/clustox/benchmarks/global', {
      method: 'PUT',
      data: BENCHMARK_PAYLOAD,
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('a non-superadmin GET of the global baseline is allowed', async () => {
    // CLUSTOX: deliberately not a 403. The four global numbers already
    // appear on every admin's own dashboard as resolved target lines, so
    // reading them is open to any authenticated admin; only writing is
    // superadmin-only. Asserting 403 here would assert the opposite of the
    // intended design.
    const res = await alphaCtx.get('/api/clustox/benchmarks/global', {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(200);
  });

  test('unauthenticated requests to either endpoint are rejected', async ({
    request: req
  }) => {
    const teamRes = await req.get(
      `${APP}/api/internal/team/${betaTeamId}/settings`,
      {
        params: { setting_type: 'BENCHMARK_SETTING' },
        failOnStatusCode: false,
        maxRedirects: 0
      }
    );
    expect(teamRes.status()).toBe(401);

    const globalRes = await req.get(`${APP}/api/clustox/benchmarks/global`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expect(globalRes.status()).toBe(401);
  });

  test('a superadmin can read and write the global baseline', async () => {
    // CLUSTOX: this endpoint has no per-run row to delete afterwards -- it's
    // the one real, shared global baseline (GLOBAL_BENCHMARK_ENTITY_ID), not
    // an ephemeral fixture. Capture whatever is there before writing so the
    // test can put it back, instead of leaving the shared row permanently
    // changed to test values for every other admin's dashboard.
    const before = await su.get('/api/clustox/benchmarks/global', {
      failOnStatusCode: false
    });
    expect(before.status()).toBe(200);
    const original = (await before.json()).setting;

    try {
      const putRes = await su.fetch('/api/clustox/benchmarks/global', {
        method: 'PUT',
        data: BENCHMARK_PAYLOAD,
        failOnStatusCode: false
      });
      expect(putRes.status()).toBe(200);

      const getRes = await su.get('/api/clustox/benchmarks/global', {
        failOnStatusCode: false
      });
      expect(getRes.status()).toBe(200);
      const body = await getRes.json();
      expect(body.setting).toMatchObject({
        lead_time: BENCHMARK_PAYLOAD.lead_time
      });
    } finally {
      await su.fetch('/api/clustox/benchmarks/global', {
        method: 'PUT',
        data: original ?? {
          lead_time: null,
          deployment_frequency: null,
          change_failure_rate: null,
          mean_time_to_recovery: null
        },
        failOnStatusCode: false
      });
    }
  });
});
