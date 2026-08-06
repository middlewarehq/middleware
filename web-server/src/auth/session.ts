import { getToken } from 'next-auth/jwt';
import { NextApiRequest } from 'next/types';

import { getAuthUserById, listWorkspaces, workspaceExists } from './queries';
import { AuthSession } from './types';

const WORKSPACE_COOKIE = 'clustox-workspace';

/**
 * Which workspace a SuperAdmin is currently looking at.
 *
 * A SuperAdmin owns no workspace, but the entire UI is workspace-scoped, so
 * without one there is nothing to render. Their selection is a *viewing*
 * context only -- guards let a SuperAdmin into every workspace regardless of
 * what is selected here.
 *
 * Falls back to the oldest workspace so a fresh SuperAdmin lands somewhere
 * useful rather than on an empty app.
 */
const resolveViewingWorkspace = async (
  req: NextApiRequest
): Promise<string | null> => {
  const selected = req.cookies?.[WORKSPACE_COOKIE];
  if (selected && (await workspaceExists(selected))) return selected;

  const workspaces = await listWorkspaces();
  return workspaces[0]?.id ?? null;
};

/**
 * Resolve the caller's session.
 *
 * The JWT is only used to identify *who* is claiming to be signed in. Whether
 * that account still exists, and what role it currently holds, are read from
 * the database on every request.
 *
 * Without this, a JWT stays valid for its full lifetime regardless of what
 * happens to the account behind it: a deleted user keeps a working session,
 * and a demoted superadmin keeps superadmin powers until the token expires.
 */
export const getAuthSession = async (
  req: NextApiRequest
): Promise<AuthSession | null> => {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return null;

  const user = await getAuthUserById(token.userId as string);
  if (!user) return null;

  const orgId =
    user.role === 'SUPERADMIN'
      ? await resolveViewingWorkspace(req)
      : user.orgId;

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId
  };
};
