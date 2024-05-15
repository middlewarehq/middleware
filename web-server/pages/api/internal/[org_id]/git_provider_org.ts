import * as yup from 'yup';

import { searchGithubRepos } from '@/api/internal/[org_id]/utils';
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
  provider: yup.string().oneOf(Object.values(Integration)),
  search_text: yup.string().nullable().optional()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, search_text } = req.payload;

  const token = await getGithubToken(org_id);
  const repos = await searchGithubRepos(token, search_text);

  return res.status(200).send(repos);
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
