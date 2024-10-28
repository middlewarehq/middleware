import { forEachObjIndexed, mapObjIndexed, partition } from 'ramda';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Row, Table } from '@/constants/db';
import { selectedDBReposMock } from '@/mocks/github';
import { db } from '@/utils/db';

const patchSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  orgRepos: yup.lazy((obj) =>
    yup.object(mapObjIndexed(() => yup.array().of(yup.string()), obj))
  )
});

const endpoint = new Endpoint(nullSchema);

type ReqOrgRepo = { org: string; repos: string[] };
type ReqRepo = { org: string; name: string };

const reqRepoComparator = (reqRepo: ReqRepo) => (tableRepo: Row<'OrgRepo'>) =>
  reqRepo.org === tableRepo.org_name && reqRepo.name === tableRepo.name;
const dbRepoComparator = (tableRepo: Row<'OrgRepo'>) => (reqRepo: ReqRepo) =>
  reqRepo.org === tableRepo.org_name && reqRepo.name === tableRepo.name;
const dbRepoFilter = (reqRepos: ReqRepo[]) => (tableRepo: Row<'OrgRepo'>) =>
  reqRepos.some(dbRepoComparator(tableRepo));

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(selectedDBReposMock);
  }

  const { org_id, orgRepos } = req.payload;

  const orgReposList: ReqOrgRepo[] = [];
  forEachObjIndexed(
    (repos, org) => orgReposList.push({ org, repos }),
    orgRepos
  );

  const flatReposList: ReqRepo[] = orgReposList.flatMap(({ org, repos }) =>
    repos.map((repo) => ({ org, name: repo }))
  );

  /**
   * Reasoning:
   * 1. Update: Deactivate all org_repos
   * 2. Update: Reactivate any existing org repos (can't upsert)
   * 3. Insert: Add any new selected repos
   */

  let repos: Row<'OrgRepo'>[] = [];
  // 1. Update: Deactivate all org_repos
  try {
    repos = await db(Table.OrgRepo)
      .update({ is_active: false, updated_at: new Date() })
      .where({ org_id, provider: 'github' })
      .returning('*');
  } catch (err) {
    // Empty update throws, so do nothing
  }

  // Among the repos passed to request payload, determine which ones
  // were already present in the DB [selectedRepos] and those
  // that aren't [remainingRepos]
  const [selectedRepos, remainingRepos] = partition(
    (flatRepo) => repos.some(reqRepoComparator(flatRepo)),
    flatReposList
  );

  // 2. Update: Reactivate any existing org repos (can't upsert)
  let update: Row<'OrgRepo'>[] = [];
  try {
    update = await db(Table.OrgRepo)
      .update({ is_active: true, updated_at: new Date() })
      .whereIn(
        'id',
        repos.filter(dbRepoFilter(selectedRepos)).map((repo) => repo.id)
      )
      .returning('*');
  } catch (err) {
    // Empty update throws, so do nothing
  }

  // 3. Update: Add any new selected repos
  const response = await db(Table.OrgRepo)
    .insert(
      remainingRepos.map((repo) => ({
        org_id,
        name: repo.name,
        provider: 'github',
        org_name: repo.org
      }))
    )
    .returning('*');

  return res.send([...response, ...update]);
});

export default endpoint.serve();
