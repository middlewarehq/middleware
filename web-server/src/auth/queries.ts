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
      `${Table.Users}.name`
    )
    .first();

  if (!row) return null;

  return {
    userId: row.user_id,
    email: row.primary_email,
    name: row.name,
    role: row.role as ClustoxRole,
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
): Promise<{ userId: string; email: string; name: string; role: ClustoxRole } | null> => {
  const row = await db(Table.ClustoxUserAuth)
    .join(Table.Users, `${Table.Users}.id`, `${Table.ClustoxUserAuth}.user_id`)
    .where(`${Table.ClustoxUserAuth}.user_id`, userId)
    .andWhere(`${Table.Users}.is_deleted`, false)
    .select(
      `${Table.ClustoxUserAuth}.user_id`,
      `${Table.ClustoxUserAuth}.role`,
      `${Table.Users}.primary_email`,
      `${Table.Users}.name`
    )
    .first();

  if (!row) return null;

  return {
    userId: row.user_id,
    email: row.primary_email,
    name: row.name,
    role: row.role as ClustoxRole
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

export const countSuperadmins = async (): Promise<number> => {
  const rows = await db(Table.ClustoxUserAuth)
    .where(Columns[Table.ClustoxUserAuth].role, 'SUPERADMIN')
    .select(Columns[Table.ClustoxUserAuth].user_id);
  return rows.length;
};

export const listUsers = async (): Promise<AuthUserListItem[]> => {
  const rows = await db(Table.ClustoxUserAuth)
    .join(Table.Users, `${Table.Users}.id`, `${Table.ClustoxUserAuth}.user_id`)
    .where(`${Table.Users}.is_deleted`, false)
    .select(
      `${Table.ClustoxUserAuth}.user_id`,
      `${Table.ClustoxUserAuth}.role`,
      `${Table.Users}.primary_email`,
      `${Table.Users}.name`
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
    teamIds: access
      .filter((a: any) => a.user_id === r.user_id)
      .map((a: any) => a.team_id)
  }));
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: ClustoxRole;
  teamIds: string[];
  orgId: string;
}): Promise<string> => {
  const passwordHash = await hashPassword(input.password);

  const [user] = await db(Table.Users)
    .insert({
      org_id: input.orgId,
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

  return userId;
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
