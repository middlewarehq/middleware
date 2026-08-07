jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/auth/queries', () => ({ getAuthUserById: jest.fn() }));

import { getToken } from 'next-auth/jwt';

import { getAuthUserById } from '@/auth/queries';
import { getAuthSession } from '@/auth/session';

const req = {} as any;

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
      role: 'ADMIN'
    });

    await expect(getAuthSession(req)).resolves.toEqual({
      userId: 'u1',
      email: 'current@clustox.com',
      name: 'Current Name',
      role: 'ADMIN'
    });
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
