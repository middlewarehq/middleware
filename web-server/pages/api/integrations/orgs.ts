import { forEachObjIndexed, mapObjIndexed, partition } from 'ramda';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Row, Table } from '@/constants/db';
import {
  Integration,
  CIProvider,
  WorkflowType
} from '@/constants/integrations';
import { selectedDBReposMock } from '@/mocks/github';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { RepoUniqueDetails } from '@/types/resources';
import { db } from '@/utils/db';
import groupBy from '@/utils/objectArray';

import { getSelectedReposForOrg } from './selected';

import { syncReposForOrg } from '../internal/[org_id]/sync_repos';

const patchSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  orgRepos: yup.lazy((obj) =>
    yup.object(
      mapObjIndexed(
        () =>
          yup.array().of(
            yup.object().shape({
              idempotency_key: yup.string().required(),
              slug: yup.string().required(),
              name: yup.string().required()
            })
          ),
        obj
      )
    )
  ),
  repoWorkflows: yup.lazy((obj) =>
    yup.object(
      mapObjIndexed(
        () =>
          yup.array().of(
            yup.object().shape({
              name: yup.string().required(),
              value: yup.string().required()
            })
          ),
        obj
      )
    )
  ),
  provider: yup.string().oneOf(Object.values(Integration))
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(selectedDBReposMock);
  }

  const { org_id, orgRepos, provider, repoWorkflows } = req.payload;

  const orgReposList: ReqOrgRepo[] = [];
  forEachObjIndexed(
    (repos, org) => orgReposList.push({ org, repos }),
    orgRepos
  );
  const flatReposList: ReqRepo[] = orgReposList.flatMap(({ org, repos }) =>
    repos.map((repo) => ({ org, ...repo }))
  );

  const flatReposSet = new Set(flatReposList.map((r) => r.idempotency_key));
  const allActiveOrgRepos = await db(Table.OrgRepo)
    .select('*')
    .where(Columns[Table.OrgRepo].org_id, org_id)
    .andWhere(Columns[Table.OrgRepo].is_active, true)
    .andWhere(Columns[Table.OrgRepo].provider, provider);

  const orgReposToDisable = allActiveOrgRepos.filter(
    (repo) => !flatReposSet.has(repo.idempotency_key)
  );

  const reposInUseByATeam = await db(Table.TeamRepos)
    .select('*', 'OrgRepo.* as org_repo')
    .leftJoin('OrgRepo', 'OrgRepo.id', 'TeamRepos.org_repo_id')
    .leftJoin('Team', 'Team.id', 'TeamRepos.team_id')
    .where('TeamRepos.is_active', true)
    .andWhere('Team.is_deleted', false)
    .whereIn(
      Columns[Table.TeamRepos].org_repo_id,
      orgReposToDisable.map((repo) => repo.id)
    );

  if (reposInUseByATeam.length) {
    return res.status(409).send({
      disallowed_repos: Array.from(
        new Set(reposInUseByATeam.map((repo) => repo.name))
      )
    });
  }

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
      .where({ org_id, provider })
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
  try {
    const filteredRepos = repos.filter(dbRepoFilter(selectedRepos));

    if (filteredRepos.length)
      await db(Table.OrgRepo)
        .update({ is_active: true, updated_at: new Date() })
        .and.whereIn(
          'id',
          repos.filter(dbRepoFilter(selectedRepos)).map((repo) => repo.id)
        )
        .returning('*');
  } catch (err) {
    // Empty update throws, so do nothing
  }

  // 3. Update: Add any new selected repos
  if (remainingRepos.length) {
    await db(Table.OrgRepo)
      .insert(
        remainingRepos.map((repo) => ({
          org_id,
          name: repo.name,
          slug: repo.slug,
          idempotency_key: repo.idempotency_key,
          provider,
          org_name: repo.org
        }))
      )
      .returning('*');
  }

  const reposForWorkflows = Object.keys(repoWorkflows);

  if (
    reposForWorkflows.length &&
    (provider === Integration.GITHUB || provider === Integration.BITBUCKET)
  ) {
    // Step 1: Get all repos for the workflows
    const dbReposForWorkflows = await db(Table.OrgRepo)
      .select('*')
      .whereIn('name', reposForWorkflows)
      .where('org_id', org_id)
      .andWhere('is_active', true)
      .andWhere('provider', provider);

    const groupedRepos = groupBy(dbReposForWorkflows, 'name');

    // Step 2: Disable all workflows for the above db repos
    await db('RepoWorkflow')
      .update('is_active', false)
      .whereIn(
        'org_repo_id',
        dbReposForWorkflows.map((r) => r.id)
      )
      .andWhere('type', WorkflowType.DEPLOYMENT);

    await db('RepoWorkflow')
      .insert(
        Object.entries(repoWorkflows)
          .filter(([repoName]) => groupedRepos[repoName]?.id)
          .flatMap(([repoName, workflows]) =>
            workflows.map((workflow) => ({
              is_active: true,
              name: workflow.name,
              provider:
                provider === Integration.GITHUB
                  ? CIProvider.GITHUB_ACTIONS
                  : provider === Integration.BITBUCKET
                  ? CIProvider.CIRCLE_CI
                  : null,
              provider_workflow_id: String(workflow.value),
              type: WorkflowType.DEPLOYMENT,
              org_repo_id: groupedRepos[repoName]?.id
            }))
          )
      )
      .onConflict(['org_repo_id', 'provider_workflow_id'])
      .merge();
  }
  syncReposForOrg(org_id);

  res.send(await getSelectedReposForOrg(org_id, provider as Integration));
});

export default endpoint.serve();

type ReqOrgRepo = { org: string; repos: RepoUniqueDetails[] };
type ReqRepo = {
  org: string;
  idempotency_key: string;
  name: string;
  slug: string;
};

const reqRepoComparator = (reqRepo: ReqRepo) => (tableRepo: DB_OrgRepo) => {
  return (
    reqRepo.org === tableRepo.org_name &&
    reqRepo.idempotency_key === tableRepo.idempotency_key
  );
};
const dbRepoComparator = (tableRepo: DB_OrgRepo) => (reqRepo: ReqRepo) =>
  reqRepo.org === tableRepo.org_name &&
  reqRepo.idempotency_key === tableRepo.idempotency_key;
const dbRepoFilter = (reqRepos: ReqRepo[]) => (tableRepo: DB_OrgRepo) =>
  reqRepos.some(dbRepoComparator(tableRepo));
