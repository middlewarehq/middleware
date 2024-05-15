import { AxiosError } from 'axios';
import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { Errors, ResponseError } from '@/constants/error';
import { Integration } from '@/constants/integrations';
import { LoadedOrg, Repo } from '@/types/github';
import { BaseRepo } from '@/types/resources';
import { dec } from '@/utils/auth-supplementary';
import { getBaseRepoFromUnionRepo } from '@/utils/code';
import { homogenize } from '@/utils/datatype';
import { db, getFirstRow } from '@/utils/db';

export type CodeSourceProvidersIntegration =
  | Integration.GITHUB
  | Integration.GITLAB
  | Integration.BITBUCKET;

const pathSchema = yup.object().shape({
  org_id: yup.string().required()
});

const getSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)),
  search_text: yup.string().nullable().optional()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, search_text } = req.payload;
  let count = 0;
  const repos = await getRepos(org_id, search_text);

  const searchResults = [] as BaseRepo[];
  for (let raw_repo of repos) {
    const repo = getBaseRepoFromUnionRepo(raw_repo);
    if (count >= 5) break;
    if (!search_text) {
      count++;
      searchResults.push(repo);
      continue;
    }
    const repoName = homogenize(`${repo.parent}/${repo.name}`);
    const searchText = homogenize(search_text);
    const matchesSearch = repoName.includes(searchText);
    if (matchesSearch) {
      count++;
      searchResults.push(repo);
    }
  }
  return res.status(200).send(searchResults);
});

export default endpoint.serve();

const providerOrgBrandingMap = {
  bitbucket: 'workspaces',
  github: 'orgs',
  gitlab: 'groups'
};

const THRESHOLD = 300;

export const getProviderOrgs = (
  org_id: ID,
  provider: CodeSourceProvidersIntegration
) =>
  internal
    .get<{ orgs: LoadedOrg[] }>(
      `/orgs/${org_id}/integrations/${provider}/${providerOrgBrandingMap[provider]}`
    )
    .catch((e: AxiosError) => {
      if (e.response.status !== 404) throw e;
      throw new ResponseError(Errors.INTEGRATION_NOT_FOUND);
    });

async function getRepos(
  org_id: ID,
  searchQuery?: string
): Promise<Partial<Repo>[]> {
  const token = await db('Integration')
    .select()
    .where({
      org_id,
      name: Integration.GITHUB
    })
    .returning('*')
    .then(getFirstRow)
    .then((r) => dec(r.access_token_enc_chunks));

  const baseUrl = 'https://api.github.com/user/repos';
  const params: URLSearchParams = new URLSearchParams();
  params.set('access_token', token);

  if (searchQuery) {
    params.set('q', searchQuery);
  }

  let allRepos: any[] = [];
  let url = `${baseUrl}?${params.toString()}`;
  let response: Response;

  do {
    if (allRepos.length >= THRESHOLD) {
      break;
    }
    response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repos: ${response.statusText}`);
    }

    const data = (await response.json()) as any[];
    allRepos = allRepos.concat(data);

    const nextLink = response.headers.get('Link');
    if (nextLink) {
      const nextUrl = nextLink
        .split(',')
        .find((link) => link.includes('rel="next"'));
      url = nextUrl ? nextUrl.trim().split(';')[0].slice(1, -1) : '';
    } else {
      url = '';
    }
  } while (url);

  return allRepos;
}
