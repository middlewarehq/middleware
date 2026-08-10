jest.mock('@/auth/session', () => ({ getAuthSession: jest.fn() }));
jest.mock('axios');
jest.mock('@/utils/db', () => ({ db: jest.fn() }));
jest.mock('@/utils/auth-supplementary', () => ({ dec: jest.fn() }));

import axios from 'axios';

import { getAuthSession } from '@/auth/session';
import { dec } from '@/utils/auth-supplementary';
import { db } from '@/utils/db';

import searchHandler from '../jira_project_search';

const ORG_ID = '11111111-1111-4111-8111-111111111111';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const mockReq = (query: Record<string, unknown> = {}) =>
  ({ method: 'GET', query: { org_id: ORG_ID, ...query }, body: {}, headers: {} }) as any;

const asAuthed = () =>
  (getAuthSession as jest.Mock).mockResolvedValue({
    userId: 'u1',
    email: 'admin@clustox.com',
    name: 'Admin',
    role: 'SUPERADMIN'
  });

// CLUSTOX: this route reads an Integration row via a real knex chain
// (db('Integration').select(...).where(...).first()), not a one-shot
// call -- stub the whole chain rather than just `db` itself. Mirrors the
// same auth/no-DB test setup already used by
// pages/api/integrations/jira/__tests__/validate.test.ts for the rest.
const mockDbChain = (row: any) => {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.first = jest.fn().mockResolvedValue(row);
  (db as unknown as jest.Mock).mockReturnValue(chain);
  return chain;
};

describe('GET /api/internal/[org_id]/jira_project_search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAuthed();
  });

  it('requires an authenticated session', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);
    mockDbChain(undefined);
    const res = mockRes();

    await searchHandler(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports not-linked, and never calls Jira, when the org has no Jira integration row', async () => {
    mockDbChain(undefined);
    const res = mockRes();

    await searchHandler(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('searches Jira and maps results, scoping idempotency_key by org_id', async () => {
    mockDbChain({
      provider_meta: { site_url: 'mycompany.atlassian.net', email: 'a@b.com' },
      access_token_enc_chunks: ['enc1']
    });
    (dec as jest.Mock).mockReturnValue('decrypted-token');
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        values: [
          { id: '10001', key: 'PAY', name: 'Payments' },
          { id: '10002', key: 'ENG', name: 'Engineering' }
        ]
      }
    });
    const res = mockRes();

    await searchHandler(mockReq({ search_text: 'pay' }), res);

    expect(axios.get).toHaveBeenCalledWith(
      'https://mycompany.atlassian.net/rest/api/3/project/search',
      expect.objectContaining({
        auth: { username: 'a@b.com', password: 'decrypted-token' },
        params: { maxResults: 50, query: 'pay' }
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith([
      {
        id: '10001',
        key: 'PAY',
        name: 'Payments',
        idempotency_key: `jira:${ORG_ID}:10001`,
        provider: 'jira'
      },
      {
        id: '10002',
        key: 'ENG',
        name: 'Engineering',
        idempotency_key: `jira:${ORG_ID}:10002`,
        provider: 'jira'
      }
    ]);
  });

  it('omits the query param when no search_text was given', async () => {
    mockDbChain({
      provider_meta: { site_url: 'mycompany.atlassian.net', email: 'a@b.com' },
      access_token_enc_chunks: ['enc1']
    });
    (dec as jest.Mock).mockReturnValue('decrypted-token');
    (axios.get as jest.Mock).mockResolvedValue({ data: { values: [] } });
    const res = mockRes();

    await searchHandler(mockReq(), res);

    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ params: { maxResults: 50 } })
    );
  });

  it.each([401, 403])(
    'reports 401 when Jira rejects the stored credentials (%d)',
    async (status) => {
      mockDbChain({
        provider_meta: { site_url: 'mycompany.atlassian.net', email: 'a@b.com' },
        access_token_enc_chunks: ['enc1']
      });
      (dec as jest.Mock).mockReturnValue('decrypted-token');
      (axios.get as jest.Mock).mockRejectedValue({ response: { status } });
      const res = mockRes();

      await searchHandler(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(401);
    }
  );

  it('reports 502 when Jira is unreachable', async () => {
    mockDbChain({
      provider_meta: { site_url: 'mycompany.atlassian.net', email: 'a@b.com' },
      access_token_enc_chunks: ['enc1']
    });
    (dec as jest.Mock).mockReturnValue('decrypted-token');
    (axios.get as jest.Mock).mockRejectedValue(new Error('network down'));
    const res = mockRes();

    await searchHandler(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});
