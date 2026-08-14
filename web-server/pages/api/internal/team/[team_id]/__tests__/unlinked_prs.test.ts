jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/api-helpers/axios', () => ({ handleRequest: jest.fn() }));

import { handleRequest } from '@/api-helpers/axios';
import { getAuthSession } from '@/auth/session';

import unlinkedPrsHandler from '../unlinked_prs';

const TEAM_ID = '33333333-3333-4333-8333-333333333333';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = (query: Record<string, unknown>) =>
  ({ method: 'GET', query: { team_id: TEAM_ID, ...query }, body: {}, headers: {} }) as any;

const asAuthed = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'u1',
    email: 'admin@clustox.com',
    name: 'Admin',
    role: 'SUPERADMIN'
  });

// CLUSTOX: Jira integration, Phase 4 (§6E) -- the Data Hygiene card's
// drill-down. See docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('GET /api/internal/team/[team_id]/unlinked_prs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  it('proxies to the backend with isoDateString-formatted timestamps, not toISOString', async () => {
    (handleRequest as jest.Mock).mockResolvedValue([]);
    const res = mockRes();

    await unlinkedPrsHandler(
      mockReq({ from_date: '2026-05-01', to_date: '2026-08-01' }),
      res
    );

    expect(handleRequest).toHaveBeenCalledWith(
      `/teams/${TEAM_ID}/unlinked_prs`,
      {
        params: {
          from_time: expect.not.stringContaining('Z'),
          to_time: expect.not.stringContaining('Z')
        }
      }
    );
  });

  it('sends back whatever the backend returned', async () => {
    const payload = [
      {
        id: 'pr-1',
        title: 'feat(payments): add refund flow',
        url: 'https://github.com/org/repo/pull/42',
        head_branch: 'feat/refund-flow',
        author: 'jordan',
        merged_at: '2026-07-15T10:00:00+00:00'
      }
    ];
    (handleRequest as jest.Mock).mockResolvedValue(payload);
    const res = mockRes();

    await unlinkedPrsHandler(
      mockReq({ from_date: '2026-05-01', to_date: '2026-08-01' }),
      res
    );

    expect(res.send).toHaveBeenCalledWith(payload);
  });

  it('rejects a request missing the required date range', async () => {
    const res = mockRes();

    await unlinkedPrsHandler(mockReq({}), res);

    expect(handleRequest).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
