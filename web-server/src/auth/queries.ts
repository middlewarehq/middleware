import { randomUUID } from 'node:crypto';

import { Columns, Table } from '@/constants/db';
import { db } from '@/utils/db';

import { hashPassword } from './password';
import { AuthUserListItem, AuthUserRow, ClustoxRole } from './types';

export const getAuthUserByEmail = async (
  email: string
): Promise<AuthUserRow | null> => {
  const row = await db(Table.ClustoxUserAuth)
    .join(Table.Users, `${Table.Users}.id`, `${Table.ClustoxUserAuth}.user_id`)
    .where(`${Table.Users}.primary_email`, email)
    .andWhere(`${Table.Users}.is_deleted`, false)
    .select(
      `${Table.ClustoxUserAuth}.user_id`,
      `${Table.ClustoxUserAuth}.role`,
      `${Table.ClustoxUserAuth}.password_hash`,
      `${Table.Users}.primary_email`,
      `${Table.Users}.name`,
      `${Table.Users}.org_id`
    )
    .first();

  if (!row) return null;

  return {
    userId: row.user_id,
    email: row.primary_email,
    name: row.name,
    role: row.role as ClustoxRole,
    orgId: row.org_id ?? null,
    passwordHash: row.password_hash
  };
};

/**
 * Current auth state for a user id, straight from the database.
 *
 * Sessions are JWTs, so the token alone proves only that someone signed in at
 * some point. It says nothing about whether the account still exists or still
 * holds the role it had at sign-in. Every request resolves both here instead.
 */
export const getAuthUserById = async (
  userId: string
): Promise<{
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgId: string | null;
} | null> => {
  const row = await db(Table.ClustoxUserAuth)
    .join(Table.Users, `${Table.Users}.id`, `${Table.ClustoxUserAuth}.user_id`)
    .where(`${Table.ClustoxUserAuth}.user_id`, userId)
    .andWhere(`${Table.Users}.is_deleted`, false)
    .select(
      `${Table.ClustoxUserAuth}.user_id`,
      `${Table.ClustoxUserAuth}.role`,
      `${Table.Users}.primary_email`,
      `${Table.Users}.name`,
      `${Table.Users}.org_id`
    )
    .first();

  if (!row) return null;

  return {
    userId: row.user_id,
    email: row.primary_email,
    name: row.name,
    role: row.role as ClustoxRole,
    // null for SUPERADMIN, who sits above every workspace.
    orgId: row.org_id ?? null
  };
};

export const getTeamIdsForUser = async (userId: string): Promise<string[]> => {
  const rows = await db(Table.ClustoxUserTeamAccess)
    .select(Columns[Table.ClustoxUserTeamAccess].team_id)
    .where(Columns[Table.ClustoxUserTeamAccess].user_id, userId);
  return rows.map((r: { team_id: string }) => r.team_id);
};

export const getAllTeamIds = async (): Promise<string[]> => {
  const rows = await db(Table.Team).select('id').where('is_deleted', false);
  return rows.map((r: { id: string }) => r.id);
};

/** Which workspace a team belongs to, or null if the team does not exist. */
export const getTeamOrgId = async (teamId: string): Promise<string | null> => {
  const row = await db(Table.Team)
    .select('org_id')
    .where('id', teamId)
    .andWhere('is_deleted', false)
    .first();
  return row?.org_id ?? null;
};

/** Every workspace, oldest first. Used by the SuperAdmin switcher. */
export const listWorkspaces = async (): Promise<
  { id: string; name: string }[]
> => {
  const rows = await db(Table.Organization)
    .select('id', 'name')
    .orderBy('created_at', 'asc');
  return rows.map((r: { id: string; name: string }) => ({
    id: r.id,
    name: r.name
  }));
};

/** Does this workspace exist? Guards the SuperAdmin's selected workspace. */
export const workspaceExists = async (orgId: string): Promise<boolean> => {
  const row = await db(Table.Organization).select('id').where('id', orgId).first();
  return Boolean(row);
};

/** Every live team in a workspace. */
export const getTeamIdsForOrg = async (orgId: string): Promise<string[]> => {
  const rows = await db(Table.Team)
    .select('id')
    .where('org_id', orgId)
    .andWhere('is_deleted', false);
  return rows.map((r: { id: string }) => r.id);
};

export const countSuperadmins = async (): Promise<number> => {
  const rows = await db(Table.ClustoxUserAuth)
    .where(Columns[Table.ClustoxUserAuth].role, 'SUPERADMIN')
    .select(Columns[Table.ClustoxUserAuth].user_id);
  return rows.length;
};

export const listUsers = async (): Promise<AuthUserListItem[]> => {
  const rows = await db(Table.ClustoxUserAuth)
    .join(Table.Users, `${Table.Users}.id`, `${Table.ClustoxUserAuth}.user_id`)
    .leftJoin(
      Table.Organization,
      `${Table.Organization}.id`,
      `${Table.Users}.org_id`
    )
    .where(`${Table.Users}.is_deleted`, false)
    .select(
      `${Table.ClustoxUserAuth}.user_id`,
      `${Table.ClustoxUserAuth}.role`,
      `${Table.Users}.primary_email`,
      `${Table.Users}.name`,
      `${Table.Users}.org_id`,
      // left join: null for a superadmin, who owns no workspace
      `${Table.Organization}.name as org_name`
    );

  const access = await db(Table.ClustoxUserTeamAccess).select(
    'user_id',
    'team_id'
  );

  return rows.map((r: any) => ({
    userId: r.user_id,
    email: r.primary_email,
    name: r.name,
    role: r.role as ClustoxRole,
    orgId: r.org_id ?? null,
    orgName: r.org_name ?? null,
    teamIds: access
      .filter((a: any) => a.user_id === r.user_id)
      .map((a: any) => a.team_id)
  }));
};

/**
 * Create a workspace and return its id.
 *
 * Upstream only ever created one Organization, named "default", at boot. The
 * schema was always multi-workspace -- every table carries org_id and
 * Integration is keyed on (name, org_id) -- so provisioning more is simply
 * doing what the schema already allows.
 */
export const createWorkspace = async (name: string): Promise<string> => {
  // Organization.id has no database default -- upstream's bootstrap supplies
  // one from Python. The exported `db` helper is a table function, not the
  // knex instance, so there is no db.raw() here either. Generate it in JS.
  const id = randomUUID();

  await db(Table.Organization).insert({
    id,
    name,
    domain: name,
    created_at: new Date()
  });

  return id;
};

/**
 * Create a user.
 *
 * An ADMIN gets their own workspace, provisioned here. A SUPERADMIN gets none
 * (org_id null) because they sit above every workspace rather than owning one.
 */
export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: ClustoxRole;
  teamIds: string[];
  /** Existing workspace to place an ADMIN in. Omit to provision a new one. */
  orgId?: string | null;
}): Promise<{ userId: string; orgId: string | null }> => {
  const passwordHash = await hashPassword(input.password);

  let orgId: string | null = null;
  if (input.role === 'ADMIN') {
    orgId = input.orgId ?? (await createWorkspace(input.name));
  }

  const [user] = await db(Table.Users)
    .insert({
      org_id: orgId,
      name: input.name,
      primary_email: input.email,
      is_deleted: false
    })
    .returning('id');

  const userId = typeof user === 'string' ? user : user.id;

  await db(Table.ClustoxUserAuth).insert({
    user_id: userId,
    password_hash: passwordHash,
    role: input.role
  });

  if (input.teamIds.length) {
    await db(Table.ClustoxUserTeamAccess).insert(
      input.teamIds.map((team_id) => ({ user_id: userId, team_id }))
    );
  }

  return { userId, orgId };
};

export const updateUserRole = async (
  userId: string,
  role: ClustoxRole
): Promise<void> => {
  await db(Table.ClustoxUserAuth)
    .where(Columns[Table.ClustoxUserAuth].user_id, userId)
    .update({ role, updated_at: new Date() });
};

export const setUserTeams = async (
  userId: string,
  teamIds: string[]
): Promise<void> => {
  await db(Table.ClustoxUserTeamAccess)
    .where(Columns[Table.ClustoxUserTeamAccess].user_id, userId)
    .delete();

  if (teamIds.length) {
    await db(Table.ClustoxUserTeamAccess).insert(
      teamIds.map((team_id) => ({ user_id: userId, team_id }))
    );
  }
};
