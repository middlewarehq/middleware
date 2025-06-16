jest.mock('@/api/internal/[org_id]/utils', () => ({
    getGitHubGraphQLUrl: jest.fn(),
    replaceURL: jest.fn(),
  }))

  import { fetchRepos, selectAllRepos } from '@/api/internal/[org_id]/git_org_repos'
  import { Integration } from '@/constants/integrations'
  import * as utils from '@/api/internal/[org_id]/utils'

  type FetchResponse = { ok: boolean; json: () => Promise<any> }

  describe('fetchRepos', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // @ts-ignore
      delete (global as any).fetch
    })

    it('fetches a single page of GitHub repos', async () => {
      (utils.getGitHubGraphQLUrl as jest.Mock).mockResolvedValue('https://api.github.com/graphql')

      const ghResponse: any = {
        data: {
          organization: {
            repositories: {
              totalCount: 2,
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  databaseId: 1,
                  name: 'repo-one',
                  url: 'u1',
                  defaultBranchRef: { name: 'main' },
                  description: 'desc1',
                  primaryLanguage: { name: 'TS' },
                  owner: { login: 'org' },
                },
                {
                  databaseId: 2,
                  name: 'repo-two',
                  url: 'u2',
                  defaultBranchRef: null,
                  description: null,
                  primaryLanguage: null,
                  owner: { login: 'org' },
                },
              ],
            },
          },
        },
      }

      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(ghResponse) } as FetchResponse)

      const result = await fetchRepos({ provider: Integration.GITHUB, token: 'gh-token', org: 'my-org', first: 50, after: null })

      expect(utils.getGitHubGraphQLUrl).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'bearer gh-token', 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"org":"my-org"'),
        })
      )

      expect(result.totalCount).toBe(2)
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null })
      expect(result.repos.map(r => r.name)).toEqual(['repo-one', 'repo-two'])
    })

    it('fetches a single page of GitLab projects', async () => {
      (utils.replaceURL as jest.Mock).mockResolvedValue('https://gitlab.com/api/graphql')

      const glResponse: any = {
        data: {
          group: {
            projects: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: 'p1',
                  fullPath: 'g/p1',
                  name: 'proj1',
                  webUrl: 'w1',
                  description: 'd1',
                  path: 'p1',
                  languages: [{ name: 'JS' }],
                  repository: { rootRef: 'dev' },
                  namespace: { fullPath: 'gspace' },
                  lastActivityAt: '2025-06-15T00:00:00Z',
                },
              ],
            },
          },
        },
      }

      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(glResponse) } as FetchResponse)

      const result = await fetchRepos({ provider: Integration.GITLAB, token: 'gl-token', org: 'my-group', first: 20, after: null})

      expect(utils.replaceURL).toHaveBeenCalledWith('https://gitlab.com/api/graphql')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://gitlab.com/api/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer gl-token', 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"group":"my-group"'),
        })
      )

      expect(result.totalCount).toBeNull()
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null })
      expect(result.repos).toHaveLength(1)
      expect(result.repos[0]).toMatchObject({ id: 'p1', name: 'proj1', url: 'w1', defaultBranchRef: { name: 'dev' }, primaryLanguage: { name: 'JS' }, owner: { login: 'gspace' } })
    })
  })

  describe('selectAllRepos', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // @ts-ignore
      delete (global as any).fetch
    })

    it('iterates through multiple GitHub pages until done', async () => {
      (utils.getGitHubGraphQLUrl as jest.Mock).mockResolvedValue('https://api.github.com/graphql')

      const page1: any = { data: { organization: { repositories: { pageInfo: { hasNextPage: true, endCursor: 'cur1' }, nodes: [{ databaseId: 1, name: 'r1', url: 'u1', defaultBranchRef: null, description: null, primaryLanguage: null, owner: { login: '' } }] } } } }
      const page2: any = { data: { organization: { repositories: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ databaseId: 2, name: 'r2', url: 'u2', defaultBranchRef: null, description: null, primaryLanguage: null, owner: { login: '' } }] } } } }

      const fetchMock = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as FetchResponse)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) } as FetchResponse)
      // @ts-ignore
      global.fetch = fetchMock

      const all = await selectAllRepos({ provider: Integration.GITHUB, token: 'gh-token', org: 'any-org' })

      expect(all.map(r => r.name)).toEqual(['r1', 'r2'])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
