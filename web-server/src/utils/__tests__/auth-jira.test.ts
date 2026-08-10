jest.mock('axios');

import axios from 'axios';

import { checkJiraValidity, normalizeJiraSiteUrl } from '@/utils/auth';

describe('normalizeJiraSiteUrl', () => {
  it('strips a leading https:// and trailing slash', () => {
    expect(normalizeJiraSiteUrl('https://mycompany.atlassian.net/')).toBe(
      'mycompany.atlassian.net'
    );
  });

  it('strips a leading http:// too', () => {
    expect(normalizeJiraSiteUrl('http://mycompany.atlassian.net')).toBe(
      'mycompany.atlassian.net'
    );
  });

  it('leaves a bare domain unchanged', () => {
    expect(normalizeJiraSiteUrl('mycompany.atlassian.net')).toBe(
      'mycompany.atlassian.net'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeJiraSiteUrl('  mycompany.atlassian.net  ')).toBe(
      'mycompany.atlassian.net'
    );
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizeJiraSiteUrl('https://mycompany.atlassian.net///')).toBe(
      'mycompany.atlassian.net'
    );
  });

  // CLUSTOX: regression test for a real bug found in code review. A regex
  // that only stripped a leading protocol and trailing slash left any
  // path/query intact -- pasting a full address copied from the browser
  // while looking at a board (a very plausible thing for a user to do,
  // more plausible than typing the bare domain) broke the very next
  // request even with valid credentials.
  it('reduces a full URL with a path to just the hostname', () => {
    expect(
      normalizeJiraSiteUrl(
        'https://mycompany.atlassian.net/jira/software/projects/ABC/boards/1'
      )
    ).toBe('mycompany.atlassian.net');
  });

  it('drops a port and query string too', () => {
    expect(
      normalizeJiraSiteUrl('https://mycompany.atlassian.net:443/?foo=bar')
    ).toBe('mycompany.atlassian.net');
  });
});

describe('checkJiraValidity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the three fields to the server-side validate endpoint', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: true, display_name: 'Jordan Diaz' }
    });

    await checkJiraValidity('mycompany.atlassian.net', 'jordan@mycompany.com', 'tok');

    expect(axios.post).toHaveBeenCalledWith(
      '/api/integrations/jira/validate',
      {
        site_url: 'mycompany.atlassian.net',
        email: 'jordan@mycompany.com',
        api_token: 'tok'
      }
    );
  });

  it('maps a valid response through, including the display name', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: true, display_name: 'Jordan Diaz' }
    });

    await expect(
      checkJiraValidity('mycompany.atlassian.net', 'a@b.com', 'tok')
    ).resolves.toEqual({
      valid: true,
      displayName: 'Jordan Diaz',
      reason: undefined
    });
  });

  it('maps an invalid response through, including the reason', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { valid: false, reason: 'unauthorized' }
    });

    await expect(
      checkJiraValidity('mycompany.atlassian.net', 'a@b.com', 'wrong')
    ).resolves.toEqual({
      valid: false,
      displayName: undefined,
      reason: 'unauthorized'
    });
  });

  // CLUSTOX: unlike checkGitHubValidity/checkGitLabValidity (which hit the
  // provider's API directly from the browser), this call goes through our
  // own backend -- so a thrown error here means *our* server was
  // unreachable, not Jira. Must still resolve, not throw, so the modal's
  // calling code doesn't need a second try/catch layer on top of its own.
  it('resolves to an unknown-reason failure, rather than throwing, if our own backend request fails', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('network down'));

    await expect(
      checkJiraValidity('mycompany.atlassian.net', 'a@b.com', 'tok')
    ).resolves.toEqual({ valid: false, reason: 'unknown' });
  });
});
