jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/api-helpers/axios', () => ({ handleRequest: jest.fn() }));

import { handleRequest } from '@/api-helpers/axios';
import { getAuthSession } from '@/auth/session';

import sprintsHandler from '../sprints';

const TEAM_ID = '33333333-3333-4333-8333-333333333333';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = () =>
  ({ method: 'GET', query: { team_id: TEAM_ID }, body: {}, headers: {} }) as any;

const asAuthed = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'u1',
    email: 'admin@clustox.com',
    name: 'Admin',
    role: 'SUPERADMIN'
  });

// CLUSTOX: Jira integration -- the Sprint rollup chart. See
// docs/JIRA_INTEGRATION_PROPOSAL.md §6D.
describe('GET /api/internal/team/[team_id]/sprints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  it('proxies to the backend with no date-range params', async () => {
    (handleRequest as jest.Mock).mockResolvedValue([]);
    const res = mockRes();

    await sprintsHandler(mockReq(), res);

    expect(handleRequest).toHaveBeenCalledWith(`/teams/${TEAM_ID}/sprints`);
  });

  it('sends back whatever the backend returned', async () => {
    const payload = [
      {
        name: 'PZDA Sprint 1',
        state: 'closed',
        start_date: '2026-07-20T07:55:00.130Z',
        end_date: '2026-08-03T05:00:00.000Z',
        planned_count: 355,
        completed_count: 272
      }
    ];
    (handleRequest as jest.Mock).mockResolvedValue(payload);
    const res = mockRes();

    await sprintsHandler(mockReq(), res);

    expect(res.send).toHaveBeenCalledWith(payload);
  });
});
