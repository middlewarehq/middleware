import { Errors, ResponseError } from '@/constants/error';

import { getTeamIdsForOrg, getTeamOrgId } from './queries';
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

/** A superadmin sits above every workspace rather than owning one. */
export const canAccessAllWorkspaces = (session: AuthSession): boolean =>
  session.role === 'SUPERADMIN';

/** Retained name for readability at call sites that talk about teams. */
export const canAccessAllTeams = canAccessAllWorkspaces;

/**
 * Gate a request against a specific workspace.
 *
 * An admin may only touch the workspace they own. An admin with no workspace
 * is denied everything -- that state means their account exists but has not
 * been provisioned, and silently showing them an empty app reads as data loss
 * rather than as a permissions problem.
 */
export const assertWorkspaceAccess = async (
  session: AuthSession | null,
  orgId: string
): Promise<void> => {
  const authed = assertAuthenticated(session);
  if (canAccessAllWorkspaces(authed)) return;

  if (!authed.orgId || authed.orgId !== orgId) {
    throw new ResponseError(Errors.ACCESS_DENIED, 403);
  }
};

/**
 * Gate a request against a team.
 *
 * Access is derived from which workspace the team belongs to, not from a
 * per-team grant. An admin owns their whole workspace, so listing individual
 * teams would be redundant. ClustoxUserTeamAccess is left in place unused, so
 * finer-grained scoping can be reinstated inside a workspace later without a
 * migration.
 */
export const assertTeamAccess = async (
  session: AuthSession | null,
  teamId: string
): Promise<void> => {
  const authed = assertAuthenticated(session);
  if (canAccessAllWorkspaces(authed)) return;

  const teamOrgId = await getTeamOrgId(teamId);
  // A missing team is denied rather than 404'd, so an admin cannot probe for
  // which team ids exist outside their workspace.
  if (!teamOrgId || !authed.orgId || teamOrgId !== authed.orgId) {
    throw new ResponseError(Errors.ACCESS_DENIED, 403);
  }
};

/** Every team the session may see. */
export const getAccessibleTeamIds = async (
  session: AuthSession
): Promise<string[]> => {
  if (canAccessAllWorkspaces(session)) {
    const { getAllTeamIds } = await import('./queries');
    return getAllTeamIds();
  }
  if (!session.orgId) return [];
  return getTeamIdsForOrg(session.orgId);
};
