import axios from 'axios';
import fetch from 'node-fetch';

import { Integration } from '@/constants/integrations';
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
  searchQuery: string
): Promise<BaseRepo[]> => {
  let urlString = searchQuery;
  if (isUrl(urlString)) {
    try {
      urlString = urlString.replace('https://', '');
      urlString = urlString.replace('http://', '');
      urlString = urlString.replace('www.', '');
      urlString = urlString.replace('github.com/', '');
      urlString = urlString.endsWith('/') ? urlString.slice(0, -1) : urlString;
      return await searchRepoWithURL(urlString);
    } catch (e) {
      return await searchGithubReposWithNames(pat, urlString);
    }
  }
  return await searchGithubReposWithNames(pat, urlString);
};

const searchRepoWithURL = async (searchString: string) => {
  const apiUrl = `https://api.github.com/repos/${searchString}`;
  const response = await axios.get<GithubRepo>(apiUrl);
  const repo = response.data;
  return [
    {
      id: repo.databaseId,
      name: repo.name,
      desc: repo.description,
      slug: repo.name,
      parent: repo.owner.login,
      web_url: repo.url,
      branch: repo.defaultBranchRef?.name,
      language: repo.primaryLanguage?.name,
      provider: Integration.GITHUB
    }
  ] as BaseRepo[];
};

export const searchGithubReposWithNames = async (
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
        branch: repo.defaultBranchRef?.name,
        provider: Integration.GITHUB
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
    byFullPath: {
      nodes: RepoNode[];
    };
    bySearch: {
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
  query($fullPaths: [String!], $searchString: String!) {
    byFullPath: projects(fullPaths: $fullPaths, first: 50) {
      nodes {
        id
        fullPath
        name
        webUrl
        group {
          path
        }
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
    bySearch: projects(search: $searchString, first: 50) {
      nodes {
        id
        fullPath
        name
        webUrl
        group {
          path
        }
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
    body: JSON.stringify({
      query,
      variables: { fullPaths: searchString, searchString: searchString }
    })
  });

  const responseBody = (await response.json()) as RepoResponse;

  if (responseBody.errors) {
    throw new Error(
      `GitLab API error: ${responseBody.errors
        .map((e) => e.message)
        .join(', ')}`
    );
  }

  const repositories = [
    ...responseBody.data.byFullPath.nodes,
    ...responseBody.data.bySearch.nodes
  ];

  return repositories.map(
    (repo) =>
      ({
        id: Number(repo.id.replace('gid://gitlab/Project/', '')),
        name: repo.name,
        desc: repo.description,
        slug: repo.path,
        web_url: repo.webUrl,
        branch: repo.repository?.rootRef || null,
        parent: repo.fullPath.split('/').slice(0, -1).join('/'),
        provider: Integration.GITLAB
      }) as BaseRepo
  );
};

export const gitlabSearch = async (pat: string, searchString: string) => {
  let search = '';
  try {
    const url = new URL(searchString);
    search = url.pathname;
    if (search.startsWith('/')) search = search.slice(1);
  } catch (e) {
    search = searchString;
  }
  return searchGitlabRepos(pat, search);
};

const isUrl = (urlString: string) => {
  return (
    urlString.startsWith('http://') ||
    urlString.startsWith('https://') ||
    urlString.startsWith('www.') ||
    urlString.startsWith('github.com')
  );
};
