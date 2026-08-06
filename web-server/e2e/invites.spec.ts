/**
 * Invite links.
 *
 * The link is a bearer credential handed to someone with no account, so the
 * properties worth testing are the ones that make it safe to send over Slack:
 * single use, expiring, revocable, and useless to anyone reading the database.
 *
 * Running:
 *   docker compose up -d
 *   cd web-server && yarn playwright test e2e/invites.spec.ts
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

const tokenFrom = (url: string) => url.split('token=')[1];

const invite = async (su: APIRequestContext, email: string, role = 'ADMIN') => {
  const res = await su.post('/api/clustox/invites', {
    data: { name: 'Invited Person', email, role }
  });
  expect(res.status()).toBe(200);
  return tokenFrom((await res.json()).invite_url);
};

test.describe('invite links', () => {
  test.skip(!SUPERADMIN.password, 'SUPERADMIN_PASSWORD not set');

  let su: APIRequestContext;
  let anon: APIRequestContext;

  test.beforeAll(async () => {
    su = await signIn(SUPERADMIN.email, SUPERADMIN.password);
    // No cookies: an invitee has no account and therefore no session.
    anon = await request.newContext({ baseURL: APP });
  });

  test('only a superadmin can issue an invite', async () => {
    const email = unique('perm.check');
    const token = await invite(su, email);

    // Redeem it so the created admin can be used to test the restriction.
    await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'InvitedPersonPass123' }
    });
    const adminCtx = await signIn(email, 'InvitedPersonPass123');

    const res = await adminCtx.post('/api/clustox/invites', {
      data: { name: 'Nope', email: unique('nope'), role: 'ADMIN' },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(403);
  });

  test('an invitee can preview and redeem without a session', async () => {
    const email = unique('redeem');
    const token = await invite(su, email);

    const preview = await anon.get(
      `/api/clustox/accept-invite?token=${token}`,
      { failOnStatusCode: false }
    );
    expect(preview.status()).toBe(200);
    expect((await preview.json()).email).toBe(email);

    const accept = await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'InvitedPersonPass123' },
      failOnStatusCode: false
    });
    expect(accept.status()).toBe(200);

    // and the password they chose actually works
    const ctx = await signIn(email, 'InvitedPersonPass123');
    const me = await (await ctx.get('/api/clustox/me')).json();
    expect(me.email).toBe(email);
    expect(me.role).toBe('ADMIN');
    expect(me.org_id).toBeTruthy();
  });

  test('a link cannot be redeemed twice', async () => {
    const token = await invite(su, unique('single.use'));

    const first = await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'InvitedPersonPass123' },
      failOnStatusCode: false
    });
    expect(first.status()).toBe(200);

    const second = await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'DifferentPersonPass123' },
      failOnStatusCode: false
    });
    expect(second.status()).toBe(404);
  });

  test('a revoked link stops working', async () => {
    const email = unique('revoked');
    const token = await invite(su, email);

    const pending = await (await su.get('/api/clustox/invites')).json();
    const row = pending.find((i: any) => i.email === email);
    expect(row).toBeTruthy();

    const del = await su.fetch(`/api/clustox/invites/${row.id}`, {
      method: 'DELETE'
    });
    expect(del.status()).toBe(200);

    const res = await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'InvitedPersonPass123' },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(404);
  });

  test('an unknown token is rejected exactly like a spent one', async () => {
    // Identical responses, so guessing reveals nothing about which tokens
    // exist.
    const spent = await invite(su, unique('spent'));
    await anon.post('/api/clustox/accept-invite', {
      data: { token: spent, password: 'InvitedPersonPass123' }
    });

    const spentRes = await anon.get(
      `/api/clustox/accept-invite?token=${spent}`,
      { failOnStatusCode: false }
    );
    const unknownRes = await anon.get(
      '/api/clustox/accept-invite?token=deadbeefdeadbeef',
      { failOnStatusCode: false }
    );

    expect(spentRes.status()).toBe(unknownRes.status());
    expect(spentRes.status()).toBe(404);
  });

  test('inviting an email that already has an account is refused', async () => {
    const email = unique('dupe');
    const token = await invite(su, email);
    await anon.post('/api/clustox/accept-invite', {
      data: { token, password: 'InvitedPersonPass123' }
    });

    const res = await su.post('/api/clustox/invites', {
      data: { name: 'Dupe', email, role: 'ADMIN' },
      failOnStatusCode: false
    });
    expect(res.status()).toBe(409);
  });

  test('the accept page is reachable signed out', async () => {
    const token = await invite(su, unique('page'));
    const res = await anon.get(`/accept-invite?token=${token}`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    // Not a redirect to /login: the invitee has no account to sign in with.
    expect(res.status()).toBe(200);
  });
});
