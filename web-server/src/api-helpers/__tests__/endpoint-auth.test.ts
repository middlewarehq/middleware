jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { getAuthSession } from '@/auth/session';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = () =>
  ({ method: 'GET', query: {}, body: {}, headers: {} }) as any;

describe('Endpoint auth enforcement', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects with 401 when no session and the endpoint is authenticated', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);

    const endpoint = new Endpoint(nullSchema);
    endpoint.handle.GET(nullSchema, async (_req, res) => res.send({ ok: true }));

    const res = mockRes();
    await endpoint.serve()(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('allows the request through when a session exists', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue({
      userId: 'u1',
      email: 'a@clustox.com',
      name: 'A',
      role: 'ADMIN'
    });

    const endpoint = new Endpoint(nullSchema);
    endpoint.handle.GET(nullSchema, async (_req, res) => res.send({ ok: true }));

    const res = mockRes();
    await endpoint.serve()(mockReq(), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
  });

  it('skips the check for endpoints marked unauthenticated', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);

    const endpoint = new Endpoint(nullSchema, { unauthenticated: true });
    endpoint.handle.GET(nullSchema, async (_req, res) => res.send({ ok: true }));

    const res = mockRes();
    await endpoint.serve()(mockReq(), res);

    expect(res.send).toHaveBeenCalledWith({ ok: true });
    expect(getAuthSession).not.toHaveBeenCalled();
  });

  it('exposes the session on the request object', async () => {
    const session = {
      userId: 'u1',
      email: 'a@clustox.com',
      name: 'A',
      role: 'ADMIN' as const
    };
    (getAuthSession as jest.Mock).mockResolvedValue(session);

    let seen: any = null;
    const endpoint = new Endpoint(nullSchema);
    endpoint.handle.GET(nullSchema, async (req, res) => {
      seen = (req as any).session;
      res.send({ ok: true });
    });

    await endpoint.serve()(mockReq(), mockRes());
    expect(seen).toEqual(session);
  });
});
