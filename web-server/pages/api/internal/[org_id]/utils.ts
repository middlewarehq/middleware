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
