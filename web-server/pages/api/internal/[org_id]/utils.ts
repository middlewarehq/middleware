import fetch from 'node-fetch';

import { BaseRepo } from '@/types/resources';

const GITHUB_API_URL = 'https://api.github.com/graphql';

type GithubRepo = {
  name: string;
  url: string;
  defaultBranchRef?: {
    name: string;
  };
  databaseId: string;
  description?: string;
  primaryLanguage?: {
    name: string;
  };
  owner: {
    login: string;
  };
};

type RepoReponse = {
  data: {
    search: {
      edges: {
        node: GithubRepo;
      }[];
    };
  };
  message?: string;
};

export const searchGithubRepos = async (
  pat: string,
  searchString: string
): Promise<BaseRepo[]> => {
  const query = `
          query($queryString: String!) {
              search(type: REPOSITORY, query: $queryString, first: 50) {
                  edges {
                      node {
                          ... on Repository {
                              name
                              url
                              defaultBranchRef {
                                name
                              }
                              databaseId
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
          }
      `;

  const queryString = `${searchString} in:name`;

  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`
    },
    body: JSON.stringify({ query, variables: { queryString } })
  });

  const responseBody = (await response.json()) as RepoReponse;

  if (!response.ok) {
    throw new Error(`GitHub API error: ${responseBody.message}`);
  }

  const repositories = responseBody.data.search.edges.map((edge) => edge.node);

  return repositories.map(
    (repo) =>
      ({
        id: repo.databaseId,
        name: repo.name,
        desc: repo.description,
        slug: repo.name,
        parent: repo.owner.login,
        web_url: repo.url,
        language: repo.primaryLanguage?.name,
        branch: repo.defaultBranchRef?.name
      }) as BaseRepo
  );
};

// Gitlab functions

// Define types for the response

interface RepoNode {
  id: string;
  name: string;
  webUrl: string;
  description: string | null;
  path: string;
  fullPath: string;
  nameWithNamespace: string;
  languages: {
    nodes: {
      name: string;
    }[];
  };
  repository: {
    rootRef: string;
  };
}

interface RepoResponse {
  data: {
    projects: {
      nodes: RepoNode[];
    };
  };
  errors?: { message: string }[];
}

const GITLAB_API_URL = 'https://gitlab.com/api/graphql';

export const searchGitlabRepos = async (
  pat: string,
  searchString: string
): Promise<BaseRepo[]> => {
  const query = `
  query($searchString: String!) {
      projects(search: $searchString, first: 50) {
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
          }
      }
  }
`;

  const response = await fetch(GITLAB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`
    },
    body: JSON.stringify({ query, variables: { searchString } })
  });

  const responseBody = (await response.json()) as RepoResponse;

  if (responseBody.errors) {
    throw new Error(
      `GitLab API error: ${responseBody.errors
        .map((e) => e.message)
        .join(', ')}`
    );
  }

  const repositories = responseBody.data.projects.nodes;

  return repositories.map(
    (repo) =>
      ({
        id: Number(repo.id.replace('gid://gitlab/Project/', '')),
        name: repo.name,
        desc: repo.description,
        slug: repo.path,
        web_url: repo.webUrl,
        branch: repo.repository?.rootRef || null,
        parent: repo.fullPath.replace('https://gitlab.com/', '').split('/')[0]
      }) as BaseRepo
  );
};
