import { AxiosError } from 'axios';
import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { batchPaginatedListsRequest } from '@/api-helpers/internal';
import { Errors, ResponseError } from '@/constants/error';
import { Integration } from '@/constants/integrations';
import { LoadedOrg } from '@/types/github';
import { getBaseRepoFromUnionRepo } from '@/utils/code';

export type CodeSourceProvidersIntegration =
  | Integration.GITHUB
  | Integration.GITLAB
  | Integration.BITBUCKET;

const pathSchema = yup.object().shape({
  org_id: yup.string().required()
});

const getSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)),
  org_name: yup.string().optional().nullable(),
  team_id: yup.string().uuid().optional().nullable()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  // This API returns either orgs, or repos for orgs depending on it `team_id` is supplied.

  const { org_name, org_id, provider, team_id } = req.payload;
  if (!org_name) {
    const response = await getProviderOrgs(
      org_id,
      provider as CodeSourceProvidersIntegration
    );
    return res.status(200).send(response.data.orgs);
  }

  const response = await getRepos(
    org_id,
    provider as CodeSourceProvidersIntegration,
    org_name
  );
  return res.status(200).send(response);
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
