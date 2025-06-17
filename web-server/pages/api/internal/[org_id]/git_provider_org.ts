import * as yup from 'yup';

import { gitlabSearch, searchGithubRepos, getGithubToken, getGitlabToken  } from '@/api/internal/[org_id]/utils';
import { Endpoint } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';

export type CodeSourceProvidersIntegration =
  | Integration.GITHUB
  | Integration.GITLAB
  | Integration.BITBUCKET;

const pathSchema = yup.object().shape({
  org_id: yup.string().required()
});

const getSchema = yup.object().shape({
  providers: yup.array(yup.string().oneOf(Object.values(Integration))),
  search_text: yup.string().nullable().optional()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, search_text, providers } = req.payload;

  const providerMap = fetchMap.filter((item) =>
    providers.includes(item.provider)
  );

  const tokens = await Promise.all(
    providerMap.map((item) => item.getToken(org_id))
  );

  const repos = await Promise.all(
    providerMap.map((item) => item.search(tokens.shift(), search_text))
  );

  const sortedRepos = repos.flat().sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).send(sortedRepos);
});

export default endpoint.serve();

const fetchMap = [
  {
    provider: Integration.GITHUB,
    search: searchGithubRepos,
    getToken: getGithubToken
  },
  {
    provider: Integration.GITLAB,
    search: gitlabSearch,
    getToken: getGitlabToken
  }
];
