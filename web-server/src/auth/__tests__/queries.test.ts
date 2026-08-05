const mockDb = jest.fn();
jest.mock('@/utils/db', () => ({
  db: (...args: any[]) => mockDb(...args)
}));

import { getAuthUserByEmail, getTeamIdsForUser } from '@/auth/queries';

const chain = (result: any) => {
  const c: any = {};
  c.select = jest.fn(() => c);
  c.join = jest.fn(() => c);
  c.where = jest.fn(() => c);
  c.andWhere = jest.fn(() => c);
  c.first = jest.fn(() => Promise.resolve(result));
  c.then = (fn: any) => Promise.resolve(result).then(fn);
  return c;
};

describe('getAuthUserByEmail', () => {
  beforeEach(() => mockDb.mockReset());

  it('maps a row to AuthUserRow', async () => {
    mockDb.mockReturnValue(
      chain({
        user_id: 'u1',
        primary_email: 'a@clustox.com',
        name: 'Ayesha',
        role: 'ADMIN',
        password_hash: 'hashed'
      })
    );

    await expect(getAuthUserByEmail('a@clustox.com')).resolves.toEqual({
      userId: 'u1',
      email: 'a@clustox.com',
      name: 'Ayesha',
      role: 'ADMIN',
      passwordHash: 'hashed'
    });
  });

  it('returns null when no row matches', async () => {
    mockDb.mockReturnValue(chain(undefined));
    await expect(getAuthUserByEmail('nobody@clustox.com')).resolves.toBeNull();
  });
});

describe('getTeamIdsForUser', () => {
  beforeEach(() => mockDb.mockReset());

  it('returns a flat array of team ids', async () => {
    mockDb.mockReturnValue(chain([{ team_id: 't1' }, { team_id: 't2' }]));
    await expect(getTeamIdsForUser('u1')).resolves.toEqual(['t1', 't2']);
  });

  it('returns an empty array when the user has no teams', async () => {
    mockDb.mockReturnValue(chain([]));
    await expect(getTeamIdsForUser('u1')).resolves.toEqual([]);
  });
});
