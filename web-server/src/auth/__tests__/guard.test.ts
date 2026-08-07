jest.mock('@/auth/queries', () => ({
  getTeamIdsForOrg: jest.fn(),
  getTeamOrgId: jest.fn(),
  getAllTeamIds: jest.fn()
}));

import {
  assertAuthenticated,
  assertRole,
  canAccessAllTeams
} from '@/auth/guard';
import { AuthSession } from '@/auth/types';

const superadmin: AuthSession = {
  userId: 'su1',
  email: 'boss@clustox.com',
  name: 'Boss',
  role: 'SUPERADMIN',
  orgId: null
};
const admin: AuthSession = {
  userId: 'ad1',
  email: 'lead@clustox.com',
  name: 'Lead',
  role: 'ADMIN',
  orgId: 'workspace-1'
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

// assertTeamAccess and getAccessibleTeamIds are workspace-derived since
// multitenancy; they are covered in workspace-guard.test.ts.
