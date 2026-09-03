import { adaptBitbucketRepo } from '@/utils/bitbucketRepos';
import { Integration } from '@/constants/integrations';

// CLUSTOX: the same realistic v2 payload shape the backend fixtures use --
// asserting a simplified shape here would let the adapter and the test agree
// while both misread the real API.
const BB_REPO = {
  uuid: '{c3d4e5f6-0000-4000-8000-000000000003}',
  name: 'middleware',
  slug: 'middleware',
  full_name: 'clustox/middleware',
  description: 'DORA metrics',
  mainbranch: { name: 'main' },
  workspace: { slug: 'clustox' },
  links: { html: { href: 'https://bitbucket.org/clustox/middleware' } }
};

describe('adaptBitbucketRepo', () => {
  it('returns the exact shape the GitHub and GitLab branches return', () => {
    // Key-for-key: the repo-selection UI reads all three providers through
    // one code path, so a missing or renamed key here surfaces as a blank
    // column in the picker, not an error.
    expect(adaptBitbucketRepo(BB_REPO, 'clustox')).toEqual({
      id: '{c3d4e5f6-0000-4000-8000-000000000003}',
      name: 'middleware',
      desc: 'DORA metrics',
      slug: 'middleware',
      web_url: 'https://bitbucket.org/clustox/middleware',
      branch: 'main',
      parent: 'clustox',
      provider: Integration.BITBUCKET
    });
  });

  it('tolerates a repo with no mainbranch', () => {
    // A freshly created empty repo has mainbranch: null.
    const empty = { ...BB_REPO, mainbranch: null as any };
    expect(adaptBitbucketRepo(empty, 'clustox').branch).toBeNull();
  });
});

describe('isBitbucketApiUrl', () => {
  const { isBitbucketApiUrl } = require('@/utils/bitbucketRepos');

  it('accepts only Bitbucket API URLs, prefix-anchored', () => {
    expect(
      isBitbucketApiUrl('https://api.bitbucket.org/2.0/repositories/x?page=2')
    ).toBe(true);
    // CLUSTOX: the cursor is client-supplied and fetched with the org's
    // Basic auth header -- each of these is a token-exfiltration attempt.
    expect(isBitbucketApiUrl('https://evil.example/steal')).toBe(false);
    expect(
      isBitbucketApiUrl('https://evil.example/https://api.bitbucket.org/2.0/')
    ).toBe(false);
    expect(isBitbucketApiUrl('http://api.bitbucket.org/2.0/x')).toBe(false);
  });
});
