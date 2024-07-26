import * as yup from 'yup';

import { gitlabSearch, searchGithubRepos } from '@/api/internal/[org_id]/utils';
import { Endpoint } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';
import { dec } from '@/utils/auth-supplementary';
import { db, getFirstRow } from '@/utils/db';

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

  const tokens = await Promise.all(
    fetchMap
      .filter((item) => providers.includes(item.provider))
      .map((item) => item.getToken(org_id))
  );

  const repos = await Promise.all(
    fetchMap
      .filter((item) => providers.includes(item.provider))
      .map((item) => item.search(tokens.shift(), search_text))
  );

  return res.status(200).send(repos.flat());
});

export default endpoint.serve();

const getGithubToken = async (org_id: ID) => {
  return await db('Integration')
    .select()
    .where({
      org_id,
      name: Integration.GITHUB
    })
    .returning('*')
    .then(getFirstRow)
    .then((r) => dec(r.access_token_enc_chunks));
};

const getGitlabToken = async (org_id: ID) => {
  return await db('Integration')
    .select()
    .where({
      org_id,
      name: Integration.GITLAB
    })
    .returning('*')
    .then(getFirstRow)
    .then((r) => dec(r.access_token_enc_chunks));
};

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
