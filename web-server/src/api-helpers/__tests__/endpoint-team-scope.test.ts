jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/auth/queries', () => ({
  getTeamIdsForUser: jest.fn(),
  getAllTeamIds: jest.fn()
}));

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { getTeamIdsForUser } from '@/auth/queries';
import { getAuthSession } from '@/auth/session';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const reqWithTeam = (team_id?: string) =>
  ({
    method: 'GET',
    query: team_id ? { team_id } : {},
    body: {},
    headers: {}
  }) as any;

const asAdmin = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'ad1',
    email: 'lead@clustox.com',
    name: 'Lead',
    role: 'ADMIN'
  });

const asSuperadmin = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'su1',
    email: 'boss@clustox.com',
    name: 'Boss',
    role: 'SUPERADMIN'
  });

const buildEndpoint = () => {
  const endpoint = new Endpoint(nullSchema);
  endpoint.handle.GET(nullSchema, async (_req, res) => res.send({ ok: true }));
  return endpoint;
};

describe('Endpoint team scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('403s when an admin requests a team they are not assigned', async () => {
    asAdmin();
    (getTeamIdsForUser as jest.Mock).mockResolvedValue(['team-zda']);

    const res = mockRes();
    await buildEndpoint().serve()(reqWithTeam('team-cgpt'), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows an admin their own team', async () => {
    asAdmin();
    (getTeamIdsForUser as jest.Mock).mockResolvedValue(['team-zda']);

    const res = mockRes();
    await buildEndpoint().serve()(reqWithTeam('team-zda'), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
  });

  it('allows a superadmin any team', async () => {
    asSuperadmin();

    const res = mockRes();
    await buildEndpoint().serve()(reqWithTeam('team-anything'), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
    expect(getTeamIdsForUser).not.toHaveBeenCalled();
  });

  it('does not attempt a team check when the payload has no team_id', async () => {
    asAdmin();

    const res = mockRes();
    await buildEndpoint().serve()(reqWithTeam(undefined), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
    expect(getTeamIdsForUser).not.toHaveBeenCalled();
  });

  it('skips the team check entirely on unauthenticated endpoints', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);

    const endpoint = new Endpoint(nullSchema, { unauthenticated: true });
    endpoint.handle.GET(nullSchema, async (_req, res) => res.send({ ok: true }));

    const res = mockRes();
    await endpoint.serve()(reqWithTeam('team-zda'), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
  });
});
