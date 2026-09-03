/**
 * Jenkins endpoints must obey the same workspace boundary as everything else.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/jenkins.spec.ts
 */
import { APIRequestContext, expect, request, test } from '@playwright/test';

const APP = 'http://localhost:3333';

const SUPERADMIN = {
  email: process.env.SUPERADMIN_EMAIL || 'admin@clustox.com',
  password: process.env.SUPERADMIN_PASSWORD || ''
};

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

const unique = (p: string) =>
  `${p}.${Date.now()}${Math.floor(Math.random() * 1000)}@clustox.com`;

const createAdmin = async (su: APIRequestContext, name: string) => {
  const email = unique(name.toLowerCase().replace(/\s+/g, '.'));
  const password = 'E2eJenkinsPass123';
  const res = await su.post('/api/clustox/users', {
    data: { name, email, password, role: 'ADMIN', team_ids: [] }
  });
  expect(res.status()).toBe(200);
  const { user_id, org_id } = await res.json();
  return { userId: user_id, orgId: org_id as string, email, password };
};

test.describe('jenkins workspace isolation', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let su: APIRequestContext;
  let alpha: Awaited<ReturnType<typeof createAdmin>>;
  let beta: Awaited<ReturnType<typeof createAdmin>>;
  let alphaCtx: APIRequestContext;

  test.beforeAll(async () => {
    su = await signIn(SUPERADMIN.email, SUPERADMIN.password);
    alpha = await createAdmin(su, 'Jenkins Alpha');
    beta = await createAdmin(su, 'Jenkins Beta');
    alphaCtx = await signIn(alpha.email, alpha.password);
  });

  test.afterAll(async () => {
    for (const id of [alpha.userId, beta.userId]) {
      await su.fetch(`/api/clustox/users/${id}`, {
        method: 'DELETE',
        failOnStatusCode: false
      });
    }
  });

  test('an admin cannot list another workspace jenkins jobs', async () => {
    const res = await alphaCtx.get(
      `/api/clustox/jenkins/jobs?org_id=${beta.orgId}`,
      { failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);
  });

  test('an admin cannot map a job into another workspace', async () => {
    // CLUSTOX: the id below must be a schema-valid (v4-shaped) UUID. Payload
    // validation runs before assertWorkspaceAccess (see global.ts), so a
    // malformed placeholder would 400 before the workspace check ever ran,
    // making this test pass for the wrong reason.
    const res = await alphaCtx.post('/api/clustox/jenkins/mappings', {
      data: {
        org_id: beta.orgId,
        org_repo_id: '00000000-0000-4000-8000-000000000001',
        job_full_name: 'deploy-api'
      },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('an admin cannot delete a mapping in another workspace', async () => {
    // CLUSTOX: same reasoning as above -- repo_workflow_id must pass schema
    // validation so the request actually reaches assertWorkspaceAccess.
    const res = await alphaCtx.fetch('/api/clustox/jenkins/mappings', {
      method: 'DELETE',
      data: {
        org_id: beta.orgId,
        repo_workflow_id: '00000000-0000-4000-8000-000000000001'
      },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated requests are rejected', async ({ request: req }) => {
    const res = await req.get(
      `${APP}/api/clustox/jenkins/jobs?org_id=${alpha.orgId}`,
      { failOnStatusCode: false, maxRedirects: 0 }
    );
    expect(res.status()).toBe(401);
  });

  test('a malformed org_id is a 400, not a 403', async () => {
    // Schema validation runs before the access check, so bad input is not
    // reported as a permission problem.
    const res = await alphaCtx.get('/api/clustox/jenkins/jobs?org_id=nonsense', {
      failOnStatusCode: false
    });
    expect(res.status()).toBe(400);
  });
});
