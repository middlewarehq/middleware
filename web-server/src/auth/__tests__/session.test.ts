jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/auth/queries', () => ({
  getAuthUserById: jest.fn(),
  listWorkspaces: jest.fn(),
  workspaceExists: jest.fn()
}));

import { getToken } from 'next-auth/jwt';

import {
  getAuthUserById,
  listWorkspaces,
  workspaceExists
} from '@/auth/queries';
import { getAuthSession } from '@/auth/session';

const req = { cookies: {} } as any;

describe('getAuthSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when there is no token', async () => {
    (getToken as jest.Mock).mockResolvedValue(null);
    await expect(getAuthSession(req)).resolves.toBeNull();
    expect(getAuthUserById).not.toHaveBeenCalled();
  });

  it('returns null when the token is valid but the user no longer exists', async () => {
    (getToken as jest.Mock).mockResolvedValue({ userId: 'deleted-user' });
    (getAuthUserById as jest.Mock).mockResolvedValue(null);

    await expect(getAuthSession(req)).resolves.toBeNull();
  });

  it('resolves the session from the database, not the token', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      userId: 'u1',
      // Stale claims from sign-in time. These must be ignored.
      role: 'SUPERADMIN',
      email: 'old@clustox.com',
      name: 'Old Name'
    });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'u1',
      email: 'current@clustox.com',
      name: 'Current Name',
      role: 'ADMIN',
      orgId: 'workspace-1'
    });

    await expect(getAuthSession(req)).resolves.toEqual({
      userId: 'u1',
      email: 'current@clustox.com',
      name: 'Current Name',
      role: 'ADMIN',
      orgId: 'workspace-1'
    });
  });

  it('carries the admin workspace onto the session', async () => {
    (getToken as jest.Mock).mockResolvedValue({ userId: 'u1' });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'u1',
      email: 'a@clustox.com',
      name: 'A',
      role: 'ADMIN',
      orgId: 'workspace-1'
    });

    const session = await getAuthSession(req);
    expect(session?.orgId).toBe('workspace-1');
  });

  it('drops a superadmin into the oldest workspace when none is selected', async () => {
    (getToken as jest.Mock).mockResolvedValue({ userId: 'su1' });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'su1',
      email: 'boss@clustox.com',
      name: 'Boss',
      role: 'SUPERADMIN',
      orgId: null
    });
    (listWorkspaces as jest.Mock).mockResolvedValue([
      { id: 'workspace-1', name: 'First' },
      { id: 'workspace-2', name: 'Second' }
    ]);

    const session = await getAuthSession(req);
    expect(session?.role).toBe('SUPERADMIN');
    // Viewing context, not ownership -- guards let them into any workspace.
    expect(session?.orgId).toBe('workspace-1');
  });

  it('honours a superadmin selected workspace', async () => {
    (getToken as jest.Mock).mockResolvedValue({ userId: 'su1' });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'su1',
      email: 'boss@clustox.com',
      name: 'Boss',
      role: 'SUPERADMIN',
      orgId: null
    });
    (workspaceExists as jest.Mock).mockResolvedValue(true);

    const session = await getAuthSession({
      cookies: { 'clustox-workspace': 'workspace-2' }
    } as any);
    expect(session?.orgId).toBe('workspace-2');
  });

  it('ignores a stale selected workspace that no longer exists', async () => {
    (getToken as jest.Mock).mockResolvedValue({ userId: 'su1' });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'su1',
      email: 'boss@clustox.com',
      name: 'Boss',
      role: 'SUPERADMIN',
      orgId: null
    });
    (workspaceExists as jest.Mock).mockResolvedValue(false);
    (listWorkspaces as jest.Mock).mockResolvedValue([
      { id: 'workspace-1', name: 'First' }
    ]);

    const session = await getAuthSession({
      cookies: { 'clustox-workspace': 'deleted-workspace' }
    } as any);
    expect(session?.orgId).toBe('workspace-1');
  });

  it('reflects a demotion immediately rather than at token expiry', async () => {
    (getToken as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'SUPERADMIN'
    });
    (getAuthUserById as jest.Mock).mockResolvedValue({
      userId: 'u1',
      email: 'a@clustox.com',
      name: 'A',
      role: 'ADMIN'
    });

    const session = await getAuthSession(req);
    expect(session?.role).toBe('ADMIN');
  });
});
