import { Errors, ResponseError } from '@/constants/error';

import { getAllTeamIds, getTeamIdsForUser } from './queries';
import { AuthSession, ClustoxRole } from './types';

export const assertAuthenticated = (
  session: AuthSession | null
): AuthSession => {
  if (!session) throw new ResponseError(Errors.SESSION_USER_NOT_FOUND, 401);
  return session;
};

export const assertRole = (
  session: AuthSession | null,
  role: ClustoxRole
): AuthSession => {
  const authed = assertAuthenticated(session);
  if (authed.role !== role) throw new ResponseError(Errors.ACCESS_DENIED, 403);
  return authed;
};

export const canAccessAllTeams = (session: AuthSession): boolean =>
  session.role === 'SUPERADMIN';

export const assertTeamAccess = async (
  session: AuthSession | null,
  teamId: string
): Promise<void> => {
  const authed = assertAuthenticated(session);
  if (canAccessAllTeams(authed)) return;

  const teamIds = await getTeamIdsForUser(authed.userId);
  if (!teamIds.includes(teamId)) {
    throw new ResponseError(Errors.ACCESS_DENIED, 403);
  }
};

export const getAccessibleTeamIds = async (
  session: AuthSession
): Promise<string[]> =>
  canAccessAllTeams(session)
    ? getAllTeamIds()
    : getTeamIdsForUser(session.userId);
