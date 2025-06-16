import * as yup from 'yup'
import {
  getGithubToken,
  getGitlabToken,
  getGitHubGraphQLUrl,
  replaceURL,
} from '@/api/internal/[org_id]/utils'
import { Endpoint } from '@/api-helpers/global'
import { Integration } from '@/constants/integrations'
import { BaseRepo } from '@/types/resources'

const pathSchema = yup.object({
  org_id: yup.string().required(),
})
const getSchema = yup.object({
  provider: yup
    .string()
    .oneOf([Integration.GITHUB, Integration.GITLAB])
    .required(),
  org: yup.string().required(),
  first: yup.number().integer().min(1).max(100).optional(),
  after: yup.string().optional(),
  select_all: yup.boolean().optional(),
})

const endpoint = new Endpoint(pathSchema)

type PageInfo = { hasNextPage: boolean; endCursor: string | null }
type RepoItem = Record<string, any>

export async function fetchRepos(params: {
  provider: string
  token: string
  org: string
  first?: number
  after?: string | null
}): Promise<{
  totalCount: number | null
  pageInfo: PageInfo | null
  repos: RepoItem[]
}> {
  const { provider, token, org, first = 50, after = null } = params

  if (provider === Integration.GITHUB) {
    const query = `
      query($org: String!, $first: Int!, $after: String) {
        organization(login: $org) {
          repositories(
            first: $first
            after: $after
            orderBy: { field: UPDATED_AT, direction: DESC }
          ) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id: databaseId
              name
              url
              defaultBranchRef {
                name
              }
              description
              primaryLanguage {
                name
              }
              owner {
                login
              }
            }
          }
        }
      }
    `

    const graphqlUrl = await getGitHubGraphQLUrl()
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { org, first, after },
      }),
    })

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`)
    }

    const { data, errors } = await res.json()
    if (errors) throw new Error(JSON.stringify(errors))

    const r = data.organization?.repositories
    const repos =
      r?.nodes.map(
        (repo: any) =>
          ({
            id: repo.id,
            name: repo.name,
            desc: repo.description,
            slug: repo.name,
            parent: repo.owner.login,
            web_url: repo.url,
            language: repo.primaryLanguage?.name,
            branch: repo.defaultBranchRef?.name,
            provider: Integration.GITHUB,
          }) as BaseRepo
      ) || []
    return {
      totalCount: r?.totalCount || 0,
      pageInfo: r?.pageInfo || null,
      repos,
    }
  }

  const query = `
    query($group: ID!, $first: Int!, $after: String) {
      group(fullPath: $group) {
        projects(
          first: $first
          after: $after
          includeSubgroups: true
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            fullPath
            name
            webUrl
            description
            path
            languages {
              name
            }
            repository {
              rootRef
            }
            namespace {
              fullPath
            }
            lastActivityAt
          }
        }
      }
    }
  `

  const gqlUrl = await replaceURL('https://gitlab.com/api/graphql')
  const res = await fetch(gqlUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        group: org,
        first,
        after,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`GitLab API returned ${res.status}`)
  }

  const { data, errors } = await res.json()
  if (errors) throw new Error(JSON.stringify(errors))

  const projects = data.group?.projects || { nodes: [], pageInfo: null }
  const repos = projects.nodes.map(
    (repo: any) =>
      ({
        id: Number(repo.id.replace('gid://gitlab/Project/', '')),
        name: repo.name,
        desc: repo.description,
        slug: repo.path,
        web_url: repo.webUrl,
        branch: repo.repository?.rootRef || null,
        parent: repo.fullPath.split('/').slice(0, -1).join('/'),
        provider: Integration.GITLAB,
      }) as BaseRepo
  )
  return {
    totalCount: null,
    pageInfo: projects.pageInfo,
    repos,
  }
}

export async function selectAllRepos(params: {
  provider: string
  token: string
  org: string
}): Promise<RepoItem[]> {
  const all: RepoItem[] = []
  let after: string | null = null
  let pageInfo: PageInfo | null = null
  do {
    const { repos, pageInfo: pi } = await fetchRepos({
      ...params,
      first: 100,
      after,
    })
    all.push(...repos)
    pageInfo = pi
    after = pageInfo?.endCursor ?? null
  } while (pageInfo?.hasNextPage)
  return all
}

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, provider, org, first, after, select_all } = req.payload
  const token =
    provider === Integration.GITHUB
      ? await getGithubToken(org_id)
      : await getGitlabToken(org_id)

  if (select_all) {
    const repos = await selectAllRepos({
      provider,
      token,
      org,
    })
    return res.status(200).send({
      totalCount: repos.length,
      pageInfo: null,
      repos,
    })
  }

  const { totalCount, pageInfo, repos } = await fetchRepos({
    provider,
    token,
    org,
    first,
    after,
  })

  return res.status(200).send({ totalCount, pageInfo, repos })
})

export default endpoint.serve()
