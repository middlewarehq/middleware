import { createHash, randomBytes } from 'node:crypto';

import { Table } from '@/constants/db';
import { db } from '@/utils/db';

import { createUser } from './queries';
import { ClustoxRole } from './types';

/** Days a link stays usable. Long enough to survive a weekend. */
export const INVITE_TTL_DAYS = 7;

export type PendingInvite = {
  id: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgId: string | null;
  orgName: string | null;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
};

/**
 * The link is a bearer credential, so only its hash is stored -- reading the
 * table must not let anyone accept an invitation.
 *
 * SHA-256 rather than bcrypt is deliberate. The token is 32 random bytes, so
 * it is not brute-forceable and does not need a slow hash; and a fast
 * deterministic hash makes acceptance a single indexed lookup rather than a
 * scan comparing against every pending row.
 */
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const createInvite = async (input: {
  name: string;
  email: string;
  role: ClustoxRole;
  orgId: string | null;
  createdBy: string;
}): Promise<{ token: string; expiresAt: Date }> => {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db(Table.ClustoxInvite).insert({
    token_hash: hashToken(token),
    email: input.email,
    name: input.name,
    role: input.role,
    org_id: input.role === 'ADMIN' ? input.orgId : null,
    created_by: input.createdBy,
    expires_at: expiresAt
  });

  return { token, expiresAt };
};

export const listPendingInvites = async (): Promise<PendingInvite[]> => {
  const rows = await db(Table.ClustoxInvite)
    .leftJoin(
      Table.Organization,
      `${Table.Organization}.id`,
      `${Table.ClustoxInvite}.org_id`
    )
    .whereNull(`${Table.ClustoxInvite}.accepted_at`)
    .whereNull(`${Table.ClustoxInvite}.revoked_at`)
    .select(
      `${Table.ClustoxInvite}.id`,
      `${Table.ClustoxInvite}.email`,
      `${Table.ClustoxInvite}.name`,
      `${Table.ClustoxInvite}.role`,
      `${Table.ClustoxInvite}.org_id`,
      `${Table.ClustoxInvite}.created_at`,
      `${Table.ClustoxInvite}.expires_at`,
      `${Table.Organization}.name as org_name`
    )
    .orderBy(`${Table.ClustoxInvite}.created_at`, 'desc');

  const now = Date.now();

  return rows.map((r: any) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as ClustoxRole,
    orgId: r.org_id ?? null,
    orgName: r.org_name ?? null,
    createdAt: new Date(r.created_at).toISOString(),
    expiresAt: new Date(r.expires_at).toISOString(),
    // Surfaced rather than hidden: an expired invite still explains why
    // someone's link stopped working.
    expired: new Date(r.expires_at).getTime() < now
  }));
};

export const revokeInvite = async (inviteId: string): Promise<void> => {
  await db(Table.ClustoxInvite)
    .where('id', inviteId)
    .whereNull('accepted_at')
    .update({ revoked_at: new Date() });
};

export type InvitePreview = {
  email: string;
  name: string;
  role: ClustoxRole;
  orgName: string | null;
};

/**
 * Look up a usable invite by its raw token.
 *
 * Returns null for anything unusable -- unknown, spent, revoked or expired --
 * without distinguishing between them. The endpoint is unauthenticated, so
 * telling a caller that a token exists but is expired would confirm a valid
 * token to someone guessing.
 */
export const findUsableInvite = async (token: string) => {
  const row = await db(Table.ClustoxInvite)
    .where('token_hash', hashToken(token))
    .whereNull('accepted_at')
    .whereNull('revoked_at')
    .first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return row;
};

export const previewInvite = async (
  token: string
): Promise<InvitePreview | null> => {
  const row = await findUsableInvite(token);
  if (!row) return null;

  const org = row.org_id
    ? await db(Table.Organization).where('id', row.org_id).first()
    : null;

  return {
    email: row.email,
    name: row.name,
    role: row.role as ClustoxRole,
    orgName: org?.name ?? null
  };
};

/**
 * Redeem an invite, creating the account with a password the invitee chose.
 *
 * The invite is marked spent in the same step, so a link that leaks after use
 * grants nothing.
 */
export const acceptInvite = async (
  token: string,
  password: string
): Promise<{ ok: true; email: string } | { ok: false; reason: string }> => {
  const row = await findUsableInvite(token);
  if (!row) return { ok: false, reason: 'INVALID' };

  const existing = await db(Table.Users)
    .where('primary_email', row.email)
    .andWhere('is_deleted', false)
    .first();
  if (existing) return { ok: false, reason: 'ALREADY_EXISTS' };

  const { userId } = await createUser({
    name: row.name,
    email: row.email,
    password,
    role: row.role as ClustoxRole,
    teamIds: [],
    orgId: row.org_id ?? null
  });

  await db(Table.ClustoxInvite)
    .where('id', row.id)
    .update({ accepted_at: new Date(), accepted_by: userId });

  return { ok: true, email: row.email };
};
