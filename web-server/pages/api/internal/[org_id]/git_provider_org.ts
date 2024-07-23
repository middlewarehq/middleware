import * as yup from 'yup';

import {
  searchGithubRepos,
  searchGitlabRepos
} from '@/api/internal/[org_id]/utils';
import { Endpoint } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';
import { BaseRepo } from '@/types/resources';
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

  const [ghToken, glToken] = await Promise.all([
    getGithubToken(org_id),
    getGitlabToken(org_id)
  ]);

  const [ghRepos, glRepos] = await Promise.all([
    searchGithubRepos(ghToken, search_text).then((res) =>
      addProvider(res, Integration.GITHUB)
    ),
    searchGitlabRepos(glToken, search_text).then((res) =>
      addProvider(res, Integration.GITLAB)
    )
  ]);

  return res.status(200).send([...ghRepos, ...glRepos]);
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

const addProvider = (repo: BaseRepo[], provider: Integration) =>
  repo.map((r) => ({ ...r, provider }));
