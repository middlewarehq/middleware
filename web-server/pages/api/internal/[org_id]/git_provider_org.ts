import { AxiosError } from 'axios';
import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { batchPaginatedListsRequest } from '@/api-helpers/internal';
import { Errors, ResponseError } from '@/constants/error';
import { Integration } from '@/constants/integrations';
import { LoadedOrg } from '@/types/github';
import { getBaseRepoFromUnionRepo } from '@/utils/code';
import { homogenize } from '@/utils/datatype';

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
  const { org_id, provider, search_text } = req.payload;
  const repos = await batchPaginatedListsRequest(
    `/orgs/${org_id}/integrations/${provider}/user/repos`
  ).then((rs) =>
    rs.map(getBaseRepoFromUnionRepo).filter((repo) => {
      if (!search_text) return true;
      homogenize;
      const repoName = homogenize(`${repo.parent}/${repo.name}`);
      const searchText = homogenize(search_text);
      return repoName.includes(searchText);
    })
  );
  return res.status(200).send(repos);
});

export default endpoint.serve();

const providerOrgBrandingMap = {
  bitbucket: 'workspaces',
  github: 'orgs',
  gitlab: 'groups'
};

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

export const getRepos = async (
  org_id: ID,
  provider: CodeSourceProvidersIntegration,
  org_name: string
) => {
  return await batchPaginatedListsRequest(
    `/orgs/${org_id}/integrations/${provider}/${providerOrgBrandingMap[provider]}/${org_name}/repos`
  ).then((rs) => rs.map(getBaseRepoFromUnionRepo));
};

export const getAllOrgRepos = async (
  org_id: ID,
  provider: CodeSourceProvidersIntegration
) => {
  const providerOrgs = await getProviderOrgs(org_id, provider).then(
    (r) => r.data.orgs
  );
  const repos = await Promise.all(
    providerOrgs.map((org) => getRepos(org_id, provider, org.login))
  );
  return repos.flat();
};
