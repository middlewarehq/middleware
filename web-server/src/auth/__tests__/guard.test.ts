jest.mock('@/auth/queries', () => ({
  getTeamIdsForUser: jest.fn(),
  getAllTeamIds: jest.fn()
}));

import {
  assertAuthenticated,
  assertRole,
  assertTeamAccess,
  canAccessAllTeams,
  getAccessibleTeamIds
} from '@/auth/guard';
import { getAllTeamIds, getTeamIdsForUser } from '@/auth/queries';
import { AuthSession } from '@/auth/types';

const superadmin: AuthSession = {
  userId: 'su1',
  email: 'boss@clustox.com',
  name: 'Boss',
  role: 'SUPERADMIN'
};
const admin: AuthSession = {
  userId: 'ad1',
  email: 'lead@clustox.com',
  name: 'Lead',
  role: 'ADMIN'
};

describe('assertAuthenticated', () => {
  it('returns the session when present', () => {
    expect(assertAuthenticated(admin)).toBe(admin);
  });

  it('throws 401 when the session is null', () => {
    expect(() => assertAuthenticated(null)).toThrow(
      expect.objectContaining({ status: 401 })
    );
  });
});

describe('assertRole', () => {
  it('passes when the role matches', () => {
    expect(assertRole(superadmin, 'SUPERADMIN')).toBe(superadmin);
  });

  it('throws 403 when an admin attempts a superadmin action', () => {
    expect(() => assertRole(admin, 'SUPERADMIN')).toThrow(
      expect.objectContaining({ status: 403 })
    );
  });

  it('throws 401 when unauthenticated, not 403', () => {
    expect(() => assertRole(null, 'SUPERADMIN')).toThrow(
      expect.objectContaining({ status: 401 })
    );
  });
});

describe('canAccessAllTeams', () => {
  it('is true for superadmin', () => {
    expect(canAccessAllTeams(superadmin)).toBe(true);
  });
  it('is false for admin', () => {
    expect(canAccessAllTeams(admin)).toBe(false);
  });
});

describe('assertTeamAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows superadmin any team without querying', async () => {
    await expect(
      assertTeamAccess(superadmin, 'any-team')
    ).resolves.toBeUndefined();
    expect(getTeamIdsForUser).not.toHaveBeenCalled();
  });

  it('allows an admin their assigned team', async () => {
    (getTeamIdsForUser as jest.Mock).mockResolvedValue(['t1', 't2']);
    await expect(assertTeamAccess(admin, 't2')).resolves.toBeUndefined();
  });

  it('throws 403 when an admin requests a team they do not own', async () => {
    (getTeamIdsForUser as jest.Mock).mockResolvedValue(['t1']);
    await expect(assertTeamAccess(admin, 't-other')).rejects.toMatchObject({
      status: 403
    });
  });

  it('throws 403 when an admin has no teams at all', async () => {
    (getTeamIdsForUser as jest.Mock).mockResolvedValue([]);
    await expect(assertTeamAccess(admin, 't1')).rejects.toMatchObject({
      status: 403
    });
  });

  it('throws 401 when unauthenticated', async () => {
    await expect(assertTeamAccess(null, 't1')).rejects.toMatchObject({
      status: 401
    });
  });
});

describe('getAccessibleTeamIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns every team for superadmin', async () => {
    (getAllTeamIds as jest.Mock).mockResolvedValue(['t1', 't2', 't3']);
    await expect(getAccessibleTeamIds(superadmin)).resolves.toEqual([
      't1',
      't2',
      't3'
    ]);
  });

  it('returns only assigned teams for admin', async () => {
    (getTeamIdsForUser as jest.Mock).mockResolvedValue(['t2']);
    await expect(getAccessibleTeamIds(admin)).resolves.toEqual(['t2']);
  });
});
