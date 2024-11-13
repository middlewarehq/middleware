import axios from 'axios';
import { head } from 'ramda';

import { Row } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { BaseRepo } from '@/types/resources';
import { db } from '@/utils/db';

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
  html_url?: string;
  id?: number;
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
  let urlString = convertUrlToQuery(searchQuery);
  if (urlString !== searchQuery) {
    try {
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
      id: repo.id,
      name: repo.name,
      desc: repo.description,
      slug: repo.name,
      parent: repo.owner.login,
      web_url: repo.html_url,
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

  const queryString = `${searchString} in:name fork:true`;

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

  const APIEndpoint = await replaceURL(GITLAB_API_URL);

  const response = await fetch(APIEndpoint, {
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
  let search = convertUrlToQuery(searchString);
  return searchGitlabRepos(pat, search);
};

const convertUrlToQuery = (url: string) => {
  let query = url;
  try {
    const urlObject = new URL(url);
    query = urlObject.pathname;
    query = query.startsWith('/') ? query.slice(1) : query;
  } catch (_) {
    query = query.replace('https://', '');
    query = query.replace('http://', '');
    query = query.replace('github.com/', '');
    query = query.replace('gitlab.com/', '');
    query = query.startsWith('www.') ? query.slice(4) : query;
    query = query.endsWith('/') ? query.slice(0, -1) : query;
  }
  return query; // of type parent/repo or group/subgroup/repo
};

const replaceURL = async (url: string): Promise<string> => {
  const provider_meta = await db('Integration')
    .where('name', Integration.GITLAB)
    .then((r: Row<'Integration'>[]) => r.map((item) => item.provider_meta));

  const custom_domain = head(provider_meta || [])?.custom_domain;

  try {
    if (custom_domain) {
      const domain = new URL(custom_domain).host;
      return url.replace('gitlab.com', domain);
    }
  } catch {
    return url;
  }

  return url;
};
