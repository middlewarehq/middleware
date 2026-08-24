jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/api-helpers/axios', () => ({ handleRequest: jest.fn() }));

import { handleRequest } from '@/api-helpers/axios';
import { getAuthSession } from '@/auth/session';

import projectsHandler from '../team_projects';

const TEAM_ID = '22222222-2222-4222-8222-222222222222';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = (method: string, query: Record<string, unknown>, body: Record<string, unknown> = {}) =>
  ({ method, query, body, headers: {} }) as any;

const asAuthed = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'u1',
    email: 'admin@clustox.com',
    name: 'Admin',
    role: 'SUPERADMIN'
  });

// CLUSTOX: this route is a thin proxy to the Python backend's
// /teams/<team_id>/projects -- mirrors team_repos.ts, which this file's
// GET/PUT handlers are modeled on. See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('/api/resources/team_projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  describe('GET', () => {
    it('fetches the current team projects and stamps team_id onto every row', async () => {
      (handleRequest as jest.Mock).mockResolvedValue([
        { org_project_id: 'proj-1', key: 'PAY', name: 'Payments' }
      ]);
      const res = mockRes();

      await projectsHandler(mockReq('GET', { team_id: TEAM_ID }), res);

      expect(handleRequest).toHaveBeenCalledWith(`/teams/${TEAM_ID}/projects`);
      expect(res.send).toHaveBeenCalledWith([
        { org_project_id: 'proj-1', key: 'PAY', name: 'Payments', team_id: TEAM_ID }
      ]);
    });
  });

  describe('PUT', () => {
    it('forwards the full replacement project set to the backend, with team_id on each item', async () => {
      (handleRequest as jest.Mock).mockResolvedValue([
        {
          org_project_id: 'proj-1',
          key: 'PAY',
          name: 'Payments',
          provider: 'jira',
          idempotency_key: 'jira:org-1:10001'
        }
      ]);
      const res = mockRes();

      await projectsHandler(
        mockReq('PUT', { team_id: TEAM_ID }, {
          projects: [
            {
              key: 'PAY',
              name: 'Payments',
              provider: 'jira',
              idempotency_key: 'jira:org-1:10001'
            }
          ]
        }),
        res
      );

      expect(handleRequest).toHaveBeenCalledWith(
        `/teams/${TEAM_ID}/projects`,
        {
          method: 'PUT',
          data: {
            projects: [
              {
                key: 'PAY',
                name: 'Payments',
                provider: 'jira',
                idempotency_key: 'jira:org-1:10001',
                team_id: TEAM_ID
              }
            ]
          }
        }
      );
      expect(res.send).toHaveBeenCalledWith([
        {
          org_project_id: 'proj-1',
          key: 'PAY',
          name: 'Payments',
          provider: 'jira',
          idempotency_key: 'jira:org-1:10001',
          team_id: TEAM_ID
        }
      ]);
    });

    it('rejects an empty body missing the required projects array', async () => {
      const res = mockRes();

      await projectsHandler(mockReq('PUT', { team_id: TEAM_ID }, {}), res);

      expect(handleRequest).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
