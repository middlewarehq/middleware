jest.mock('@/utils/db', () => ({
    db: jest.fn(),
}));

import { db } from '@/utils/db';
import * as githubUtils from '../utils';
import { DEFAULT_GH_URL } from '@/constants/urls';

describe('GitHub URL utilities', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getGitHubCustomDomain', () => {
    it('returns custom_domain when present', async () => {
      const mockMeta = [{ custom_domain: 'custom.sujai.com' }];
      (db as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue(mockMeta)
      });

      const domain = await githubUtils.getGitHubCustomDomain();
      expect(domain).toBe('custom.sujai.com');
    });

    it('returns null when no provider_meta found', async () => {
      (db as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      });

      const domain = await githubUtils.getGitHubCustomDomain();
      expect(domain).toBeNull();
    });

    it('returns null on db error and logs error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (db as jest.Mock).mockImplementation(() => {
        throw new Error('DB failure');
      });

      const domain = await githubUtils.getGitHubCustomDomain();
      expect(domain).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error occured while getting custom domain from database:',
        expect.any(Error)
      );
    });
  });

  describe('getGitHubRestApiUrl', () => {
    it('uses default URL when no custom domain', async () => {
      jest.spyOn(githubUtils, 'getGitHubCustomDomain').mockResolvedValue(null);
      const url = await githubUtils.getGitHubRestApiUrl('path/to/repo');
      expect(url).toBe(`${DEFAULT_GH_URL}/path/to/repo`);
    });

    it('uses custom domain when provided', async () => {
      jest.spyOn(githubUtils, 'getGitHubCustomDomain').mockResolvedValue('git.sujai.com');
      const url = await githubUtils.getGitHubRestApiUrl('repos/owner/repo');
      expect(url).toBe('https://git.sujai.com/api/v3/repos/owner/repo');
    });

    it('normalizes multiple slashes in URL', async () => {
      jest.spyOn(githubUtils, 'getGitHubCustomDomain').mockResolvedValue('git.sujai.com/');
      const url = await githubUtils.getGitHubRestApiUrl('/repos//owner//repo');
      expect(url).toBe('https://git.sujai.com/api/v3/repos/owner/repo');
    });
  });

  describe('getGitHubGraphQLUrl', () => {
    it('uses default GraphQL endpoint when no custom domain', async () => {
      jest.spyOn(githubUtils, 'getGitHubCustomDomain').mockResolvedValue(null);
      const url = await githubUtils.getGitHubGraphQLUrl();
      expect(url).toBe(`${DEFAULT_GH_URL}/graphql`);
    });

    it('uses custom domain for GraphQL endpoint', async () => {
      jest.spyOn(githubUtils, 'getGitHubCustomDomain').mockResolvedValue('api.github.local');
      const url = await githubUtils.getGitHubGraphQLUrl();
      expect(url).toBe('https://api.github.local/api/graphql');
    });
  });
});
