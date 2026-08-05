jest.mock('@/auth/queries', () => ({
  countSuperadmins: jest.fn(),
  createUser: jest.fn()
}));
jest.mock('@/utils/db', () => ({ db: jest.fn() }));

import { bootstrapSuperadmin } from '@/auth/bootstrap';
import { countSuperadmins, createUser } from '@/auth/queries';

describe('bootstrapSuperadmin', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterAll(() => {
    process.env = env;
  });

  it('does nothing when a superadmin already exists', async () => {
    (countSuperadmins as jest.Mock).mockResolvedValue(1);
    process.env.SUPERADMIN_EMAIL = 'a@clustox.com';
    process.env.SUPERADMIN_PASSWORD = 'pw';

    await bootstrapSuperadmin();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('does not create a user when env vars are missing', async () => {
    (countSuperadmins as jest.Mock).mockResolvedValue(0);
    delete process.env.SUPERADMIN_EMAIL;
    delete process.env.SUPERADMIN_PASSWORD;

    await bootstrapSuperadmin();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates the superadmin when none exists and env vars are set', async () => {
    (countSuperadmins as jest.Mock).mockResolvedValue(0);
    (createUser as jest.Mock).mockResolvedValue('new-id');
    process.env.SUPERADMIN_EMAIL = 'boss@clustox.com';
    process.env.SUPERADMIN_PASSWORD = 'strong-password';

    await bootstrapSuperadmin('org-1');

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'boss@clustox.com',
        password: 'strong-password',
        role: 'SUPERADMIN',
        teamIds: [],
        orgId: 'org-1'
      })
    );
  });
});
