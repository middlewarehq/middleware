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
 *     GET is open to any authenticated admin (the five numbers already appear
 *     on every team's own dashboard as target lines); PUT is SUPERADMIN-only,
 *     because one superadmin's numbers become every unset team's targets.
 *
 * All five benchmarked metrics are covered -- the four DORA ones plus
 * lines_of_code, which shares these exact routes.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && SUPERADMIN_PASSWORD='<value>' yarn playwright test e2e/benchmarks.spec.ts
 *
 * The suite provisions its own admins through the API and cleans them up, so
 * it does not depend on whatever happens to be in the database.
 */
import { APIRequestContext, expect, request, test } from '@playwright/test';

// CLUSTOX: overridable so the suite can run against an instance other than the
// default dev one -- e.g. a second server started from a branch build while the
// usual port is still serving something else.
const APP = process.env.E2E_BASE_URL || 'http://localhost:3333';

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

// CLUSTOX: all five benchmarked metrics, lines_of_code included. It is a full
// benchmark metric on the same routes as the original four -- same team
// setting, same global fallback -- so an isolation suite that only carried the
// four would leave the newest one unproven on exactly the endpoints where a
// missing key is silently dropped rather than rejected.
//
// The value is in *lines* (average gross lines per merged PR), not seconds or
// a percentage, and it has no upper bound. 200 is a plausible target rather
// than a shape-only placeholder.
const BENCHMARK_PAYLOAD = {
  lead_time: 24,
  deployment_frequency: 3,
  change_failure_rate: 10,
  mean_time_to_recovery: 12,
  lines_of_code: 200
};

/**
 * Every metric cleared, for restoring the shared global row when it had no
 * value before. Derived from the payload above so a sixth metric added there
 * cannot be left behind set to a test value on the one row every workspace
 * inherits from.
 */
const CLEARED_PAYLOAD = Object.fromEntries(
  Object.keys(BENCHMARK_PAYLOAD).map((metric) => [metric, null])
);

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
    // CLUSTOX: deliberately not a 403. The five global numbers already
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
      // CLUSTOX: was `lead_time` alone. Asserting the whole payload is what
      // makes a metric that the route quietly drops -- rather than rejects --
      // fail here, which is the failure mode a fifth metric added to an
      // existing schema is most likely to hit.
      expect(body.setting).toMatchObject(BENCHMARK_PAYLOAD);
    } finally {
      await su.fetch('/api/clustox/benchmarks/global', {
        method: 'PUT',
        data: original ?? CLEARED_PAYLOAD,
        failOnStatusCode: false
      });
    }
  });

  test('a team lines_of_code target round-trips in its own workspace', async () => {
    // CLUSTOX: the isolation cases above only ever assert 403, so nothing in
    // this file proved the settings route stores what it was given. A route
    // that rejected every write would pass all of them. Beta writes to beta's
    // own team, which is the allowed direction of the same call alpha is
    // refused.
    const put = await betaCtx.fetch(
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
    expect(put.status()).toBe(200);

    const read = await betaCtx.get(
      `/api/internal/team/${betaTeamId}/settings`,
      {
        params: { setting_type: 'BENCHMARK_SETTING' },
        failOnStatusCode: false
      }
    );
    expect(read.status()).toBe(200);

    const setting = (await read.json()).setting;
    expect(setting).toMatchObject(BENCHMARK_PAYLOAD);
    // Named explicitly as well as via the payload above, so the assertion
    // that matters cannot be weakened by editing one shared constant.
    expect(setting.lines_of_code).toBe(200);

    // CLUSTOX: no cleanup. The team belongs to beta's workspace, which
    // afterAll deletes along with beta -- unlike the global row, which is
    // shared and is restored in place.
  });

  test('a lines_of_code target does not leak across workspaces', async () => {
    // The isolation guarantee, restated for the fifth metric specifically:
    // beta's 200 lines/PR target must not be readable by alpha.
    const res = await alphaCtx.get(
      `/api/internal/team/${betaTeamId}/settings`,
      {
        params: { setting_type: 'BENCHMARK_SETTING' },
        failOnStatusCode: false
      }
    );
    expect(res.status()).toBe(403);
    expect(await res.text()).not.toContain('lines_of_code');
  });
});
