import { getToken } from 'next-auth/jwt';
import { NextApiRequest } from 'next/types';

import { getAuthUserById } from './queries';
import { AuthSession } from './types';

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
 * Team access was already resolved per-request for the same reason; leaving
 * identity and role in the token was an inconsistency.
 */
export const getAuthSession = async (
  req: NextApiRequest
): Promise<AuthSession | null> => {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return null;

  const user = await getAuthUserById(token.userId as string);
  if (!user) return null;

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role
  };
};
