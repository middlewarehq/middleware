jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/api-helpers/axios', () => ({ handleRequest: jest.fn() }));

import { handleRequest } from '@/api-helpers/axios';
import { getAuthSession } from '@/auth/session';

import ticketInsightsHandler from '../ticket_insights';

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

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E). See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('GET /api/internal/team/[team_id]/ticket_insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  it('proxies to the backend with isoDateString-formatted timestamps, not toISOString', async () => {
    (handleRequest as jest.Mock).mockResolvedValue({
      cycle_time_by_project: [],
      prs_without_ticket_count: 0
    });
    const res = mockRes();

    await ticketInsightsHandler(
      mockReq({ from_date: '2026-05-01', to_date: '2026-08-01' }),
      res
    );

    expect(handleRequest).toHaveBeenCalledWith(
      `/teams/${TEAM_ID}/ticket_insights`,
      {
        params: {
          // isoDateString uses a real +hh:mm/-hh:mm offset, never a bare
          // "Z" -- Python's datetime.fromisoformat() on the backend
          // (pre-3.11) rejects the latter.
          from_time: expect.not.stringContaining('Z'),
          to_time: expect.not.stringContaining('Z')
        }
      }
    );
  });

  it('sends back whatever the backend returned', async () => {
    const payload = {
      cycle_time_by_project: [
        {
          project_key: 'PZDA',
          project_name: 'Project Zero Deposit Africa',
          ticket_count: 5,
          avg_total_seconds: 3600,
          avg_seconds_by_category: { 'In Progress': 3600 }
        }
      ],
      prs_without_ticket_count: 2
    };
    (handleRequest as jest.Mock).mockResolvedValue(payload);
    const res = mockRes();

    await ticketInsightsHandler(
      mockReq({ from_date: '2026-05-01', to_date: '2026-08-01' }),
      res
    );

    expect(res.send).toHaveBeenCalledWith(payload);
  });

  it('rejects a request missing the required date range', async () => {
    const res = mockRes();

    await ticketInsightsHandler(mockReq({}), res);

    expect(handleRequest).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
