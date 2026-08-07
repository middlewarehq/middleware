jest.mock('@/auth/queries', () => ({
  getTeamIdsForUser: jest.fn(),
  getAllTeamIds: jest.fn(),
  getTeamOrgId: jest.fn(),
  getTeamIdsForOrg: jest.fn()
}));

import {
  assertTeamAccess,
  assertWorkspaceAccess,
  getAccessibleTeamIds
} from '@/auth/guard';
import { getTeamIdsForOrg, getTeamOrgId } from '@/auth/queries';
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

const adminWithoutWorkspace: AuthSession = {
  ...admin,
  userId: 'ad2',
  orgId: null
};

describe('assertWorkspaceAccess', () => {
  it('lets a superadmin into any workspace', async () => {
    await expect(
      assertWorkspaceAccess(superadmin, 'workspace-9')
    ).resolves.toBeUndefined();
  });

  it('lets an admin into their own workspace', async () => {
    await expect(
      assertWorkspaceAccess(admin, 'workspace-1')
    ).resolves.toBeUndefined();
  });

  it('403s an admin reaching into another workspace', async () => {
    await expect(
      assertWorkspaceAccess(admin, 'workspace-2')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('403s an admin who has no workspace at all', async () => {
    await expect(
      assertWorkspaceAccess(adminWithoutWorkspace, 'workspace-1')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('401s when unauthenticated', async () => {
    await expect(
      assertWorkspaceAccess(null, 'workspace-1')
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('assertTeamAccess is now workspace-derived', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets an admin reach any team inside their own workspace', async () => {
    // No explicit ClustoxUserTeamAccess row: ownership of the workspace is
    // what grants access now.
    (getTeamOrgId as jest.Mock).mockResolvedValue('workspace-1');
    await expect(assertTeamAccess(admin, 'team-a')).resolves.toBeUndefined();
  });

  it('403s an admin reaching a team in another workspace', async () => {
    (getTeamOrgId as jest.Mock).mockResolvedValue('workspace-2');
    await expect(assertTeamAccess(admin, 'team-b')).rejects.toMatchObject({
      status: 403
    });
  });

  it('403s on a team that does not exist', async () => {
    (getTeamOrgId as jest.Mock).mockResolvedValue(null);
    await expect(assertTeamAccess(admin, 'team-ghost')).rejects.toMatchObject({
      status: 403
    });
  });

  it('lets a superadmin reach any team without a lookup', async () => {
    await expect(
      assertTeamAccess(superadmin, 'team-anything')
    ).resolves.toBeUndefined();
    expect(getTeamOrgId).not.toHaveBeenCalled();
  });
});

describe('getAccessibleTeamIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gives an admin every team in their workspace', async () => {
    (getTeamIdsForOrg as jest.Mock).mockResolvedValue(['t1', 't2']);
    await expect(getAccessibleTeamIds(admin)).resolves.toEqual(['t1', 't2']);
    expect(getTeamIdsForOrg).toHaveBeenCalledWith('workspace-1');
  });

  it('gives an admin with no workspace nothing', async () => {
    await expect(getAccessibleTeamIds(adminWithoutWorkspace)).resolves.toEqual(
      []
    );
  });
});
