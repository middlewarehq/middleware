import { BaseRepo } from '@/types/resources';

const GITHUB_API_URL = 'https://api.github.com/graphql';

interface Repo {
  id: string;
  name: string;
  url: string;
  isPrivate: boolean;
  owner: string;
}

async function getOrgs(pat: string): Promise<string[]> {
  const query = `
        query {
            viewer {
                organizations(first: 100) {
                    nodes {
                        login
                    }
                }
            }
        }
    `;

  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`
    },
    body: JSON.stringify({ query })
  });

  const responseBody = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(`GitHub API error: ${responseBody.message}`);
  }

  return responseBody.data.viewer.organizations.nodes.map(
    (org: any) => org.login
  );
}

async function getUserRepos(
  pat: string,
  searchString: string
): Promise<Repo[]> {
  const query = `
        query($queryString: String!) {
            search(type: REPOSITORY, query: $queryString, first: 50) {
                edges {
                    node {
                        ... on Repository {
                            name
                            url
                            databaseId
                            description
                            owner {
                                login
                            }
                        }
                    }
                }
            }
        }
    `;

  const queryString = `${searchString} in:name user:@me`;

  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`
    },
    body: JSON.stringify({ query, variables: { queryString } })
  });

  const responseBody = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(`GitHub API error: ${responseBody.message}`);
  }

  const repositories = responseBody.data.search.edges.map(
    (edge: any) => edge.node
  );

  return repositories.map(
    (repo: any) =>
      ({
        id: repo.databaseId,
        name: repo.name,
        desc: repo.description,
        slug: repo.name,
        parent: repo.owner.login,
        web_url: repo.url,
        language: repo.languages,
        branch: ''
      }) as BaseRepo
  );
}

async function searchGithubRepos(
  pat: string,
  searchString: string
): Promise<Repo[]> {
  const organizations = await getOrgs(pat);

  const repoPromises = organizations.map(async (org) => {
    const query = `
            query($queryString: String!) {
                search(type: REPOSITORY, query: $queryString, first: 50) {
                    edges {
                        node {
                            ... on Repository {
                                name
                                url
                                description
                                databaseId
                                owner {
                                    login
                                }
                            }
                        }
                    }
                }
            }
        `;

    const queryString = `org:${org} ${searchString} in:name`;

    const response = await fetch(GITHUB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat}`
      },
      body: JSON.stringify({ query, variables: { queryString } })
    });

    const responseBody = (await response.json()) as any;

    if (!response.ok) {
      throw new Error(`GitHub API error: ${responseBody.message}`);
    }

    const repositories = responseBody.data.search.edges.map(
      (edge: any) => edge.node
    );

    return repositories.map(
      (repo: any) =>
        ({
          id: repo.databaseId,
          name: repo.name,
          desc: repo.description,
          slug: repo.name,
          parent: repo.owner.login,
          web_url: repo.url,
          language: repo.languages,
          branch: ''
        }) as BaseRepo
    );
  });

  const [userRepos, orgRepos] = await Promise.all([
    getUserRepos(pat, searchString),
    await Promise.all(repoPromises)
  ]);

  return [...userRepos, ...orgRepos.flat()];
}

export { searchGithubRepos };
