jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('axios');

import axios from 'axios';

import { getAuthSession } from '@/auth/session';

import validateHandler from '../validate';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = (body: Record<string, unknown>) =>
  ({ method: 'POST', query: {}, body, headers: {} }) as any;

const asAuthed = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'u1',
    email: 'admin@clustox.com',
    name: 'Admin',
    role: 'SUPERADMIN'
  });

describe('POST /api/integrations/jira/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  it('requires an authenticated session, same as every other Endpoint route', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'x.atlassian.net',
        email: 'a@b.com',
        api_token: 't'
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports valid, with the display name, when Jira answers with a real /myself payload', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { accountId: 'acc-1', displayName: 'Jordan Diaz' }
    });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'https://mycompany.atlassian.net/',
        email: 'jordan@mycompany.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({
      valid: true,
      display_name: 'Jordan Diaz'
    });
    // Normalized: protocol and trailing slash stripped before the request.
    expect(axios.get).toHaveBeenCalledWith(
      'https://mycompany.atlassian.net/rest/api/3/myself',
      expect.objectContaining({
        auth: { username: 'jordan@mycompany.com', password: 'tok' }
      })
    );
  });

  // CLUSTOX: regression test for a real bug found in code review. A regex
  // that only stripped a leading protocol and trailing slash left any
  // path/query intact -- pasting a full address copied from the browser
  // while looking at a board would have built a request against the
  // wrong path (a plausible thing for a user to paste, since /rest/api/3
  // is not something they'd normally see or think to strip themselves).
  it('normalizes a full URL with a path down to just the hostname before requesting', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { accountId: 'acc-1' }
    });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url:
          'https://mycompany.atlassian.net/jira/software/projects/ABC/boards/1',
        email: 'a@b.com',
        api_token: 'tok'
      }),
      res
    );

    expect(axios.get).toHaveBeenCalledWith(
      'https://mycompany.atlassian.net/rest/api/3/myself',
      expect.anything()
    );
  });

  it('falls back to the submitted email as display name when Jira omits displayName', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { accountId: 'acc-1' }
    });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'mycompany.atlassian.net',
        email: 'jordan@mycompany.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({
      valid: true,
      display_name: 'jordan@mycompany.com'
    });
  });

  // CLUSTOX: regression test for a real bug found while building this --
  // id.atlassian.com (a genuine Atlassian domain, just not a Jira Cloud
  // *site*) answers this exact path with HTTP 202 and an HTML body, which
  // a naive "did the request throw" check accepts as valid. Every real
  // Jira /myself response is JSON with an accountId; this must be
  // rejected despite the "successful" HTTP status.
  it('rejects a 2xx response that is not actually a Jira /myself payload', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html>not jira</html>'
    });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'id.atlassian.com',
        email: 'a@b.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({ valid: false, reason: 'unknown' });
  });

  it.each([401, 403])(
    'reports "unauthorized" when Jira responds %d',
    async (status) => {
      (axios.get as jest.Mock).mockRejectedValue({ response: { status } });
      const res = mockRes();

      await validateHandler(
        mockReq({
          site_url: 'mycompany.atlassian.net',
          email: 'a@b.com',
          api_token: 'wrong'
        }),
        res
      );

      expect(res.send).toHaveBeenCalledWith({
        valid: false,
        reason: 'unauthorized'
      });
    }
  );

  // CLUSTOX: regression test for a real bug found while building this --
  // a nonexistent *.atlassian.net subdomain resolves fine at the DNS/edge
  // level and answers with a JSON 404, it does not fail to connect. A
  // check that only looked for "no response at all" would misclassify a
  // typo'd site as reason:"unknown" instead of the more useful
  // reason:"unreachable" ("check the URL").
  it('reports "unreachable" for a 404 (a typo\'d or nonexistent site)', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'this-does-not-exist.atlassian.net',
        email: 'a@b.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({
      valid: false,
      reason: 'unreachable'
    });
  });

  it('reports "unreachable" when there is no response at all (DNS/network failure)', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ code: 'ENOTFOUND' });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'unreachable.example',
        email: 'a@b.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({
      valid: false,
      reason: 'unreachable'
    });
  });

  it('reports "unknown" for any other error status', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ response: { status: 500 } });
    const res = mockRes();

    await validateHandler(
      mockReq({
        site_url: 'mycompany.atlassian.net',
        email: 'a@b.com',
        api_token: 'tok'
      }),
      res
    );

    expect(res.send).toHaveBeenCalledWith({ valid: false, reason: 'unknown' });
  });

  it('rejects a request missing required fields before ever calling Jira', async () => {
    const res = mockRes();

    await validateHandler(mockReq({ site_url: 'x.atlassian.net' }), res);

    expect(axios.get).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
