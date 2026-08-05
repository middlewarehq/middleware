import { getToken } from 'next-auth/jwt';
import { NextApiRequest } from 'next/types';

import { AuthSession, ClustoxRole } from './types';

export const getAuthSession = async (
  req: NextApiRequest
): Promise<AuthSession | null> => {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return null;

  return {
    userId: token.userId as string,
    email: (token.email as string) ?? '',
    name: (token.name as string) ?? '',
    role: token.role as ClustoxRole
  };
};
